"""Monocular pothole depth estimation.

Method (to be validated against WP1 tape-measure ground truth, scripts/evaluate_depth.py):
1. Metric depth map from Depth Anything V2 (outdoor metric variant).
2. Back-project pixels to 3D with a pinhole camera of assumed horizontal FOV.
3. Scale calibration: a road plane is fitted (RANSAC) to the lower part of the image; the camera
   height it implies is compared to the known capture height (vehicle mount ~1.3 m, hand-held
   ~1.5 m) and the whole point cloud is rescaled. Monocular metric scale is the main error source,
   this step removes most of it.
4. Local road plane (RANSAC) fitted on a ring around the pothole box.
5. Depth = 90th percentile of the distance below that plane of the points in the central 70% of the box.
"""
from __future__ import annotations

import cv2
import numpy as np

METRIC_MODEL_ID = "depth-anything/Depth-Anything-V2-Metric-Outdoor-Small-hf"
DEFAULT_HFOV_DEG = 70.0     # typical phone main camera
DEFAULT_CAM_HEIGHT_M = 1.3  # WP1 vehicle mount (1.2-1.5 m); use 1.5 for hand-held photos
MAX_DEPTH_CM = 40.0         # clamp absurd values


def ransac_plane(pts: np.ndarray, iters: int = 150, tol: float = 0.02, seed: int = 0):
    """Plane n.p + d = 0 (|n| = 1) robust to outliers. Returns (n, d) or None."""
    if len(pts) < 30:
        return None
    rng = np.random.default_rng(seed)
    if len(pts) > 4000:
        pts = pts[rng.choice(len(pts), 4000, replace=False)]
    best, best_in = None, 0
    for _ in range(iters):
        a, b, c = pts[rng.choice(len(pts), 3, replace=False)]
        n = np.cross(b - a, c - a)
        nn = np.linalg.norm(n)
        if nn < 1e-9:
            continue
        n /= nn
        d = -n @ a
        inl = np.abs(pts @ n + d) < tol * max(1.0, np.median(pts[:, 2]))
        if inl.sum() > best_in:
            best_in, best = inl.sum(), inl
    if best is None:
        return None
    # refine with least squares (SVD) on inliers
    q = pts[best]
    cen = q.mean(0)
    n = np.linalg.svd(q - cen)[2][-1]
    d = -n @ cen
    if d < 0:  # orient so that the camera (origin) is on the positive side
        n, d = -n, -d
    return n, d


class DepthEstimator:
    def __init__(self, model_id: str = METRIC_MODEL_ID, device: str | None = None,
                 hfov_deg: float = DEFAULT_HFOV_DEG, cam_height_m: float | None = DEFAULT_CAM_HEIGHT_M):
        import torch
        from transformers import AutoImageProcessor, AutoModelForDepthEstimation

        self.torch = torch
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.proc = AutoImageProcessor.from_pretrained(model_id)
        self.model = AutoModelForDepthEstimation.from_pretrained(model_id).to(self.device).eval()
        self.model_id = model_id
        self.hfov = hfov_deg
        self.cam_height = cam_height_m

    def depth_map(self, bgr: np.ndarray) -> np.ndarray:
        """Metric depth in metres, same HxW as the input, rescaled by camera height when known."""
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        inputs = self.proc(images=rgb, return_tensors="pt").to(self.device)
        with self.torch.no_grad():
            pred = self.model(**inputs).predicted_depth
        pred = self.torch.nn.functional.interpolate(
            pred.unsqueeze(1), size=bgr.shape[:2], mode="bicubic", align_corners=False
        )[0, 0]
        depth = pred.float().cpu().numpy()
        if self.cam_height:
            depth = depth * self.scale_factor(depth)
        return depth

    def scale_factor(self, depth: np.ndarray) -> float:
        h, w = depth.shape
        ys, xs = np.mgrid[int(h * 0.6):h:4, int(w * 0.15):int(w * 0.85):4]
        plane = ransac_plane(self._points(depth, ys.ravel(), xs.ravel()))
        if plane is None:
            return 1.0
        est_h = plane[1]  # distance from camera to road plane
        if not (0.2 < est_h < 10):
            return 1.0
        return float(np.clip(self.cam_height / est_h, 0.2, 5.0))

    def _points(self, depth: np.ndarray, ys: np.ndarray, xs: np.ndarray) -> np.ndarray:
        h, w = depth.shape
        f = (w / 2) / np.tan(np.radians(self.hfov / 2))
        z = depth[ys, xs]
        return np.stack([(xs - w / 2) * z / f, (ys - h / 2) * z / f, z], axis=1)

    def box_size_m(self, depth: np.ndarray, box: list[float]) -> tuple[float, float] | None:
        """(longueur, largeur) en mètres du défaut encadré, à partir de la carte de profondeur calibrée.

        Largeur = écart 3D entre les bords gauche et droit à mi-hauteur ; longueur = écart 3D entre les bords
        haut et bas (dans l'axe de la route, la perspective est donc prise en compte). Profondeur médiane sur une
        petite fenêtre à chaque bord pour limiter le bruit.
        """
        h, w = depth.shape
        x1, y1, x2, y2 = [int(round(v)) for v in box]
        x1, y1, x2, y2 = max(0, x1), max(0, y1), min(w - 1, x2), min(h - 1, y2)
        if x2 - x1 < 8 or y2 - y1 < 8:
            return None
        cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
        r = max(2, min(x2 - x1, y2 - y1) // 12)
        f = self._focal(w)

        def pt(x: int, y: int) -> np.ndarray:
            """Point 3D (caméra) du pixel (x, y), profondeur médiane d'une petite fenêtre."""
            z = float(np.median(depth[max(0, y - r):y + r + 1, max(0, x - r):x + r + 1]))
            return np.array([(x - w / 2) * z / f, (y - h / 2) * z / f, z])

        width = float(np.linalg.norm(pt(x2, cy) - pt(x1, cy)))
        length = float(np.linalg.norm(pt(cx, y2) - pt(cx, y1)))
        if not (0.05 < width < 15 and 0.05 < length < 15):
            return None
        return round(length, 2), round(width, 2)

    def _focal(self, w: int) -> float:
        return (w / 2) / np.tan(np.radians(self.hfov / 2))

    def pothole_depth_cm(self, depth: np.ndarray, box: list[float]) -> float | None:
        h, w = depth.shape
        x1, y1, x2, y2 = [int(round(v)) for v in box]
        x1, y1, x2, y2 = max(0, x1), max(0, y1), min(w - 1, x2), min(h - 1, y2)
        bw, bh = x2 - x1, y2 - y1
        if bw < 8 or bh < 8:
            return None
        mx, my = int(bw * 0.35), int(bh * 0.35)
        X1, Y1, X2, Y2 = max(0, x1 - mx), max(0, y1 - my), min(w - 1, x2 + mx), min(h - 1, y2 + my)
        yy, xx = np.mgrid[Y1:Y2:2, X1:X2:2]
        inside = (xx >= x1) & (xx < x2) & (yy >= y1) & (yy < y2)
        core = (xx >= x1 + 0.15 * bw) & (xx < x2 - 0.15 * bw) & (yy >= y1 + 0.15 * bh) & (yy < y2 - 0.15 * bh)
        ring_pts = self._points(depth, yy[~inside].ravel(), xx[~inside].ravel())
        in_pts = self._points(depth, yy[core].ravel(), xx[core].ravel())
        plane = ransac_plane(ring_pts)
        if plane is None or len(in_pts) < 10:
            return None
        n, d = plane
        below = -(in_pts @ n + d)  # camera is on the positive side -> below road = negative distance
        cm = float(np.clip(np.percentile(below, 90) * 100, 0, MAX_DEPTH_CM))
        return round(cm, 1)
