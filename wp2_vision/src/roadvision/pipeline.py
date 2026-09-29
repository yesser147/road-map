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
from .config import CLASSES, MODEL_VERSION
from .detector import Detector
from .schemas import GPS, Detection, DetectionEvent, ImageInfo, ModelInfo, Quality
from .severity import severity


class VisionPipeline:
    def __init__(self, weights: str | None = None, conf: float = 0.25, use_depth: bool = False,
                 use_clip_filter: bool = True, device: str | None = None):
        self.detector = Detector(weights, conf=conf, device=device)
        self._device = device
        self._use_clip = use_clip_filter
        self._filter = None
        self._depth = None
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
            self._depth = DepthEstimator(device=self._device)
        return self._depth

    def analyze(self, bgr: np.ndarray, image_id: str, source: str = "unknown", gps: Optional[dict] = None,
                captured_at: Optional[datetime] = None, filter_photo: Optional[bool] = None,
                with_depth: Optional[bool] = None, with_embedding: bool = True) -> DetectionEvent:
        t = {}
        h, w = bgr.shape[:2]
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
            t["detect"] = (time.perf_counter() - t0) * 1000

            depth_map = None
            if with_depth and any(CLASSES[r.class_id]["name"] == "pothole" for r in raw):
                t0 = time.perf_counter()
                self.depth.cam_height = 1.3 if source == "vehicle" else 1.5  # mount vs hand-held
                depth_map = self.depth.depth_map(bgr)
                depth_model = self.depth.model_id
                t["depth"] = (time.perf_counter() - t0) * 1000

            for r in sorted(raw, key=lambda r: -r.confidence):
                c = CLASSES[r.class_id]
                x1, y1, x2, y2 = r.box
                area = max(0.0, (x2 - x1) * (y2 - y1)) / (w * h)
                depth_cm = None
                size = None
                if depth_map is not None and c["is_defect"]:
                    size = self.depth.box_size_m(depth_map, r.box)
                    if c["name"] == "pothole":
                        depth_cm = self.depth.pothole_depth_cm(depth_map, r.box)
                sev, score = severity(c["name"], area, depth_cm, r.confidence)
                dets.append(Detection(
                    class_id=r.class_id, class_name=c["name"], class_name_fr=c["fr"], is_defect=c["is_defect"],
                    confidence=round(r.confidence, 4),
                    bbox_xyxy=[round(v, 1) for v in r.box],
                    bbox_norm=[round(x1 / w, 5), round(y1 / h, 5), round(x2 / w, 5), round(y2 / h, 5)],
                    area_ratio=round(area, 5), depth_cm=depth_cm,
                    depth_method="depth-anything-v2-metric+plane-fit" if depth_cm is not None else None,
                    length_m=size[0] if size else None, width_m=size[1] if size else None,
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
