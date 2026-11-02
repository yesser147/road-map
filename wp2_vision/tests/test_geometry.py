"""Citizen-photo geometry: a known rectangle on the road, seen by a tilted phone, must measure its true size."""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from roadvision.camera import focal_px, road_normal_from_tilt  # noqa: E402
from roadvision.depth import geometric_size_m  # noqa: E402


def project_rectangle(normal, height, f, w, h, length=0.5, width=0.3, ahead=2.5):
    """Image mask of a length x width rectangle lying on the road `ahead` metres in front of the camera."""
    u = np.array([1.0, 0, 0]) - normal * normal[0]
    u /= np.linalg.norm(u)
    v = np.cross(normal, u)
    if v[2] < 0:  # v must point away from the camera, along the road
        v = -v
    ground_below = -normal * height
    mask = np.zeros((h, w), dtype=bool)
    for a in np.linspace(-width / 2, width / 2, 120):
        for b in np.linspace(ahead - length / 2, ahead + length / 2, 200):
            p = ground_below + a * u + b * v
            x, y = int(round(p[0] / p[2] * f + w / 2)), int(round(p[1] / p[2] * f + h / 2))
            if 0 <= x < w and 0 <= y < h:
                mask[y, x] = True
    return mask


def test_tilted_phone_measures_true_size():
    w, h = 1080, 1440  # portrait photo
    f = focal_px({"focal_35mm": 26}, w, h)
    normal = road_normal_from_tilt(50, 3, w, h)  # phone tilted down toward the road, slightly rolled
    mask = project_rectangle(normal, 1.40, f, w, h)
    length, width = geometric_size_m(mask, normal, 1.40, f)
    assert abs(length - 0.5) < 0.03 and abs(width - 0.3) < 0.02, (length, width)


def test_wrong_height_scales_linearly():
    w, h = 1080, 1440
    f = focal_px({"focal_35mm": 26}, w, h)
    normal = road_normal_from_tilt(50, 0, w, h)
    mask = project_rectangle(normal, 1.40, f, w, h)
    l1, _ = geometric_size_m(mask, normal, 1.40, f)
    l2, _ = geometric_size_m(mask, normal, 1.54, f)  # +10 % height -> +10 % size
    assert abs(l2 / l1 - 1.10) < 0.01
