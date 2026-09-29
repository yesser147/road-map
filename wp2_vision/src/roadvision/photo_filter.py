"""Citizen photo filter: rejects blurry, dark, tiny or non-road photos before detection.

Blur/brightness checks are pure OpenCV. The "is this a road?" check uses CLIP
zero-shot and is optional: if transformers/CLIP is unavailable it is skipped.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import cv2
import numpy as np

BLUR_MIN = 60.0          # variance of Laplacian on a 640px-wide grey image
BRIGHTNESS_MIN = 35.0    # mean grey level 0..255
MIN_SIDE = 240           # px
ROAD_MIN = 0.45          # CLIP probability of the "road" prompts

ROAD_PROMPTS = [
    "a photo of an asphalt road",
    "a photo of a street with a pothole",
    "a photo of a cracked road surface",
    "a photo of a sidewalk pavement",
]
OTHER_PROMPTS = [
    "a photo of a person",
    "a photo of a room indoors",
    "a screenshot or a document",
    "a photo of food",
    "a photo of the sky or trees",
    "a photo of an animal",
]


@dataclass
class FilterResult:
    accepted: bool
    reason: Optional[str]
    blur_score: float
    brightness: float
    road_score: Optional[float]


class PhotoFilter:
    def __init__(self, use_clip: bool = True, device: str | None = None):
        self._clip = None
        if use_clip:
            try:
                import torch
                from transformers import CLIPModel, CLIPProcessor

                self._device = device or ("cuda" if torch.cuda.is_available() else "cpu")
                name = "openai/clip-vit-base-patch32"
                self._clip = CLIPModel.from_pretrained(name).to(self._device).eval()
                self._proc = CLIPProcessor.from_pretrained(name)
                self._torch = torch
            except Exception:  # CLIP is optional
                self._clip = None

    @staticmethod
    def quality(bgr: np.ndarray) -> tuple[float, float]:
        h, w = bgr.shape[:2]
        scale = 640 / max(w, 1)
        grey = cv2.cvtColor(cv2.resize(bgr, (640, max(1, int(h * scale)))), cv2.COLOR_BGR2GRAY)
        return float(cv2.Laplacian(grey, cv2.CV_64F).var()), float(grey.mean())

    def road_score(self, bgr: np.ndarray) -> Optional[float]:
        if self._clip is None:
            return None
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        inputs = self._proc(text=ROAD_PROMPTS + OTHER_PROMPTS, images=rgb, return_tensors="pt", padding=True)
        inputs = {k: v.to(self._device) for k, v in inputs.items()}
        with self._torch.no_grad():
            probs = self._clip(**inputs).logits_per_image.softmax(-1)[0].cpu().numpy()
        return float(probs[: len(ROAD_PROMPTS)].sum())

    def __call__(self, bgr: np.ndarray) -> FilterResult:
        h, w = bgr.shape[:2]
        blur, bright = self.quality(bgr)
        road = None
        reason = None
        if min(h, w) < MIN_SIDE:
            reason = "too_small"
        elif bright < BRIGHTNESS_MIN:
            reason = "too_dark"
        elif blur < BLUR_MIN:
            reason = "blurry"
        else:
            road = self.road_score(bgr)
            if road is not None and road < ROAD_MIN:
                reason = "not_road"
        return FilterResult(reason is None, reason, blur, bright, road)
