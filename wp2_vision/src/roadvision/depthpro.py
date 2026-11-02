"""Depth Pro (Apple, 2024) wrapper: metric depth AND focal length from a single uncalibrated photo.

Used for citizen photos, which arrive without camera height or (often) focal length. Depth Pro's metric depth
is proportional to the focal length it assumes, so a known focal (EXIF) rescales it exactly:
depth_true_focal = depth * f_exif / f_predicted.
Licence: Apple AMLR (research use) - see reports/dimensions_report.md.
"""
from __future__ import annotations

import cv2
import numpy as np

MODEL_ID = "apple/DepthPro-hf"


class DepthPro:
    def __init__(self, device: str | None = None, model_id: str = MODEL_ID):
        import torch
        from transformers import DepthProForDepthEstimation, DepthProImageProcessor

        self.torch = torch
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.dtype = torch.float16 if self.device == "cuda" else torch.float32
        self.proc = DepthProImageProcessor.from_pretrained(model_id)
        self.model = DepthProForDepthEstimation.from_pretrained(model_id, torch_dtype=self.dtype).to(self.device).eval()

    def predict(self, bgr: np.ndarray, focal_px: float | None = None) -> tuple[np.ndarray, float]:
        """(metric depth in metres HxW, focal length in px used). focal_px: known focal (EXIF), else predicted."""
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        inputs = self.proc(images=rgb, return_tensors="pt").to(self.device, self.dtype)
        with self.torch.no_grad():
            out = self.model(**inputs)
        post = self.proc.post_process_depth_estimation(out, target_sizes=[bgr.shape[:2]])[0]
        depth = post["predicted_depth"].float().cpu().numpy()
        f_pred = float(post["focal_length"])
        if focal_px:
            depth = depth * (focal_px / f_pred)
            return depth, float(focal_px)
        return depth, f_pred
