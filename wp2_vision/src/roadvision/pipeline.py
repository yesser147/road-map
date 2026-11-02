"""End-to-end WP2 pipeline: one image in -> one DetectionEvent (contract v1) out.

    from roadvision.pipeline import VisionPipeline
    pipe = VisionPipeline(use_depth=True)
    event = pipe.analyze(cv2.imread("road.jpg"), image_id="abc", source="citizen")
    event.model_dump_json()
"""
from __future__ import annotations

import time
from datetime import datetime
from typing import Optional

import numpy as np

from .clustering import crop_embedding
from .camera import HANDHELD_HEIGHT_M, focal_px, road_normal_from_tilt
from .config import CLASSES, MODEL_VERSION, POTHOLE_SEG_WEIGHTS, RELIEF_MODEL_DIR
from .depth import geometric_size_m
from .detector import Detector
from .schemas import GPS, Detection, DetectionEvent, ImageInfo, ModelInfo, Quality
from .severity import severity


def _iou(a, b) -> float:
    ix = max(0.0, min(a[2], b[2]) - max(a[0], b[0]))
    iy = max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
    u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - ix * iy
    return ix * iy / u if u > 0 else 0.0


class VisionPipeline:
    def __init__(self, weights: str | None = None, conf: float = 0.25, use_depth: bool = False,
                 use_clip_filter: bool = True, device: str | None = None):
        self.detector = Detector(weights, conf=conf, device=device)
        self._device = device
        self._use_clip = use_clip_filter
        self._filter = None
        self._depth = None
        self._seg = None
        self.use_depth = use_depth

    # heavy models are loaded on first use only
    @property
    def photo_filter(self):
        if self._filter is None:
            from .photo_filter import PhotoFilter
            self._filter = PhotoFilter(use_clip=self._use_clip, device=self._device)
        return self._filter

    @property
    def depth(self):
        if self._depth is None:
            from .depth import DepthEstimator
            relief = str(RELIEF_MODEL_DIR) if (RELIEF_MODEL_DIR / "config.json").exists() else None
            self._depth = DepthEstimator(device=self._device, relief_model_id=relief)
        return self._depth

    @property
    def seg(self):
        """Pothole outline model, or False when its weights are absent (measurements then use the box)."""
        if self._seg is None:
            if POTHOLE_SEG_WEIGHTS.exists():
                from ultralytics import YOLO
                self._seg = YOLO(str(POTHOLE_SEG_WEIGHTS))
            else:
                self._seg = False
        return self._seg

    OUTLINE_CONF_DISCOUNT = 0.5  # chosen on the validation split (scripts/eval_pothole_ensemble.py --grid)

    def outline_potholes(self, bgr: np.ndarray, raw: list) -> list:
        """Citizen photos are often close-ups, where the detector misses most potholes (pothole600: AP50 25 %).
        The outline model is added as a second pothole detector, its confidence halved: close-ups 25 -> 43 %
        AP50, street photos 62.5 -> 61.7 %. Returns the extra pothole detections (not already found)."""
        if not self.seg:
            return []
        from .detector import RawDetection
        r = self.seg.predict(bgr, conf=self.detector.conf / self.OUTLINE_CONF_DISCOUNT, verbose=False,
                             device=self._device)[0]
        if r.boxes is None:
            return []
        pothole_id = next(k for k, v in CLASSES.items() if v["name"] == "pothole")
        found = [d.box for d in raw if d.class_id == pothole_id]
        extra = []
        for b, c in zip(r.boxes.xyxy.cpu().numpy().tolist(), r.boxes.conf.cpu().numpy().tolist()):
            if all(_iou(b, f) <= 0.5 for f in found):
                extra.append(RawDetection(class_id=pothole_id, confidence=float(c) * self.OUTLINE_CONF_DISCOUNT, box=b))
                found.append(b)
        return extra

    def pothole_masks(self, bgr: np.ndarray) -> list[np.ndarray]:
        if not self.seg:
            return []
        r = self.seg.predict(bgr, conf=0.1,  # low: an outline is only used if it overlaps a detected pothole
                              retina_masks=True, verbose=False, device=self._device)[0]
        if r.masks is None:
            return []
        return list(r.masks.data.cpu().numpy() > 0.5)

    @staticmethod
    def _geometry(camera: Optional[dict], source: str, w: int, h: int) -> dict:
        """What is known about the camera, and the measuring method / typical uncertainty that follows
        (uncertainties measured in reports/citizen_scale_rsrd.md and reports/dims_fan_*.md)."""
        cam = camera or {}
        f = focal_px(cam, w, h)
        hfov = float(np.degrees(2 * np.arctan((w / 2) / f))) if f else 70.0
        f = f or (w / 2) / np.tan(np.radians(35))
        handheld = source in ("citizen", "pedestrian")
        height = cam.get("cam_height_m") or (HANDHELD_HEIGHT_M["standing"] if handheld else 1.3)
        normal = None
        if cam.get("tilt_beta") is not None:
            normal = road_normal_from_tilt(cam["tilt_beta"], cam.get("tilt_gamma") or 0.0, w, h)
            if normal @ np.array([0, 0, 1.0]) > -0.05 and normal[1] > -0.2:  # phone not pointing at the road
                normal = None
        if handheld:
            method, unc = ("citizen_geometry", 15.0) if (normal is not None and cam.get("focal_35mm")) else ("citizen_estimate", 40.0)
        else:
            method, unc = ("vehicle_calibrated", 5.0 if normal is not None else 30.0)
        return {"focal": float(f), "hfov": hfov, "height": float(height), "normal": normal, "method": method,
                "uncertainty": unc}

    @staticmethod
    def _box_region(box: list[float], w: int, h: int) -> np.ndarray:
        region = np.zeros((h, w), dtype=bool)
        x1, y1, x2, y2 = [int(round(v)) for v in box]
        region[max(0, y1):min(h, y2), max(0, x1):min(w, x2)] = True
        return region

    @staticmethod
    def mask_for_box(masks: list[np.ndarray], box: list[float]) -> Optional[np.ndarray]:
        """Outline whose bounding box overlaps the detection box best (IoU >= 0.3), else None."""
        best, best_iou = None, 0.3
        x1, y1, x2, y2 = box
        for m in masks:
            ys, xs = np.nonzero(m)
            if len(xs) == 0:
                continue
            a1, b1, a2, b2 = xs.min(), ys.min(), xs.max(), ys.max()
            iw, ih = max(0, min(x2, a2) - max(x1, a1)), max(0, min(y2, b2) - max(y1, b1))
            inter = iw * ih
            iou = inter / max((x2 - x1) * (y2 - y1) + (a2 - a1) * (b2 - b1) - inter, 1)
            if iou > best_iou:
                best, best_iou = m, iou
        return best

    def analyze(self, bgr: np.ndarray, image_id: str, source: str = "unknown", gps: Optional[dict] = None,
                captured_at: Optional[datetime] = None, filter_photo: Optional[bool] = None,
                with_depth: Optional[bool] = None, with_embedding: bool = True,
                camera: Optional[dict] = None) -> DetectionEvent:
        """camera (all optional): focal_35mm (EXIF), tilt_beta / tilt_gamma (phone orientation, degrees),
        cam_height_m (known mount height, or 1.40 standing / 0.75 crouching for a citizen)."""
        t = {}
        h, w = bgr.shape[:2]
        geo = self._geometry(camera, source, w, h)
        filter_photo = (source == "citizen") if filter_photo is None else filter_photo
        with_depth = self.use_depth if with_depth is None else with_depth

        quality, accepted, reason = None, True, None
        t0 = time.perf_counter()
        if filter_photo:
            fr = self.photo_filter(bgr)
            accepted, reason = fr.accepted, fr.reason
            quality = Quality(blur_score=round(fr.blur_score, 1), brightness=round(fr.brightness, 1),
                              road_score=None if fr.road_score is None else round(fr.road_score, 3))
        else:
            from .photo_filter import PhotoFilter
            b, br = PhotoFilter.quality(bgr)
            quality = Quality(blur_score=round(b, 1), brightness=round(br, 1))
        t["filter"] = (time.perf_counter() - t0) * 1000

        dets: list[Detection] = []
        depth_model = None
        if accepted:
            t0 = time.perf_counter()
            raw = self.detector(bgr)
            if source in ("citizen", "pedestrian"):
                raw += self.outline_potholes(bgr, raw)
            t["detect"] = (time.perf_counter() - t0) * 1000

            depth_map = relief_map = None
            masks: list[np.ndarray] = []
            if with_depth and any(CLASSES[r.class_id]["name"] == "pothole" for r in raw):
                t0 = time.perf_counter()
                self.depth.cam_height = geo["height"]
                self.depth.hfov = geo["hfov"]
                depth_map = self.depth.depth_map(bgr)            # scene geometry: plane, length, width
                relief_map = self.depth.relief_map(bgr)          # depth of the hole below the plane
                depth_model = self.depth.model_id
                masks = self.pothole_masks(bgr)
                t["depth"] = (time.perf_counter() - t0) * 1000

            for r in sorted(raw, key=lambda r: -r.confidence):
                c = CLASSES[r.class_id]
                x1, y1, x2, y2 = r.box
                area = max(0.0, (x2 - x1) * (y2 - y1)) / (w * h)
                depth_cm = None
                size = None
                if depth_map is not None and c["is_defect"]:
                    # the outline measures 3-10x more precisely than the box (reports/dimensions_report.md)
                    mask = self.mask_for_box(masks, r.box) if c["name"] == "pothole" else None
                    if geo["normal"] is not None:
                        # tilt known: length/width by pure geometry (ray / road-plane intersection)
                        region = mask if mask is not None else self._box_region(r.box, w, h)
                        size = geometric_size_m(region, geo["normal"], geo["height"], geo["focal"])
                    if size is None:
                        size = self.depth.box_size_m(depth_map, r.box, mask=mask)
                    if c["name"] == "pothole":
                        depth_cm = self.depth.pothole_depth_cm(relief_map, r.box, mask=mask)
                sev, score = severity(c["name"], area, depth_cm, r.confidence)
                dets.append(Detection(
                    class_id=r.class_id, class_name=c["name"], class_name_fr=c["fr"], is_defect=c["is_defect"],
                    confidence=round(r.confidence, 4),
                    bbox_xyxy=[round(v, 1) for v in r.box],
                    bbox_norm=[round(x1 / w, 5), round(y1 / h, 5), round(x2 / w, 5), round(y2 / h, 5)],
                    area_ratio=round(area, 5), depth_cm=depth_cm,
                    depth_method="depth-anything-v2-metric+plane-fit" if depth_cm is not None else None,
                    length_m=size[0] if size else None, width_m=size[1] if size else None,
                    measure_method=geo["method"] if (size or depth_cm is not None) else None,
                    size_uncertainty_pct=geo["uncertainty"] if (size or depth_cm is not None) else None,
                    severity=sev, severity_score=score,
                    embedding=crop_embedding(bgr, r.box) if with_embedding else None,
                ))

        return DetectionEvent(
            image_id=image_id, source=source, captured_at=captured_at,
            gps=GPS(**gps) if gps else None,
            model=ModelInfo(detector=self.detector.name, version=MODEL_VERSION, depth_model=depth_model),
            image=ImageInfo(width=w, height=h), accepted=accepted, rejection_reason=reason,
            quality=quality, detections=dets, timing_ms={k: round(v, 1) for k, v in t.items()},
        )
