"""YOLO detector wrapper: image -> list of raw detections in the unified WP2 taxonomy.

Accepts .pt (PyTorch), .onnx or .tflite weights (anything Ultralytics can load).
If the weights were trained with a different class list (e.g. the 4-class RDD2022
baseline), class names are mapped onto configs/classes.yaml by name.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np

from .config import CLASSES, DETECTOR_CANDIDATES

_NAME_TO_ID = {v["name"]: k for k, v in CLASSES.items()}
# aliases seen in public checkpoints
_ALIASES = {
    "d00": "longitudinal_crack", "d10": "transverse_crack", "d20": "alligator_crack", "d40": "pothole",
    "longitudinal crack": "longitudinal_crack", "transverse crack": "transverse_crack",
    "alligator crack": "alligator_crack", "potholes": "pothole", "manholes": "manhole",
}


@dataclass
class RawDetection:
    class_id: int
    confidence: float
    box: list[float]  # xyxy pixels


def find_weights() -> Path:
    for p in DETECTOR_CANDIDATES:
        if p.exists():
            return p
    raise FileNotFoundError(f"No detector weights found. Looked for: {[str(p) for p in DETECTOR_CANDIDATES]}")


class Detector:
    def __init__(self, weights: str | Path | None = None, conf: float = 0.25, iou: float = 0.5, imgsz: int = 640, device: str | None = None):
        from ultralytics import YOLO

        self.weights = Path(weights) if weights else find_weights()
        self.model = YOLO(str(self.weights), task="detect")
        self.conf, self.iou, self.imgsz, self.device = conf, iou, imgsz, device
        self.class_map = self._build_class_map(self.model.names)

    @staticmethod
    def _build_class_map(names: dict[int, str]) -> dict[int, int]:
        out = {}
        for mid, name in names.items():
            key = name.strip().lower()
            key = _ALIASES.get(key, key).replace(" ", "_")
            if key in _NAME_TO_ID:
                out[int(mid)] = _NAME_TO_ID[key]
        return out

    @property
    def name(self) -> str:
        return self.weights.stem

    def __call__(self, bgr: np.ndarray) -> list[RawDetection]:
        res = self.model.predict(bgr, conf=self.conf, iou=self.iou, imgsz=self.imgsz, device=self.device, verbose=False)[0]
        out = []
        if res.boxes is None:
            return out
        for xyxy, c, k in zip(res.boxes.xyxy.cpu().numpy(), res.boxes.conf.cpu().numpy(), res.boxes.cls.cpu().numpy()):
            cid = self.class_map.get(int(k))
            if cid is None:
                continue
            out.append(RawDetection(cid, float(c), [float(v) for v in xyxy]))
        return out
