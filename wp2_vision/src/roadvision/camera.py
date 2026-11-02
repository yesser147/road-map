"""Camera information sent by a phone with a citizen photo, turned into what the geometry needs.

The 35 mm-equivalent focal length (EXIF FocalLengthIn35mmFilm) is defined on the diagonal of a 36x24 mm frame
(43.27 mm), so in pixels: f_px = f35 * image_diagonal_px / 43.27, whatever the phone's real sensor size.
The real focal length alone (EXIF FocalLength) is unusable without the sensor size, so it is only kept as a hint.
"""
from __future__ import annotations

import io
import math

FULL_FRAME_DIAG_MM = 43.27


def exif_focal(data: bytes) -> dict:
    """{'focal_35mm', 'focal_mm'} read from the image bytes (empty when absent)."""
    try:
        from PIL import Image
        exif = Image.open(io.BytesIO(data)).getexif().get_ifd(0x8769)
    except Exception:
        return {}
    out = {}
    f35 = exif.get(0xA405)
    if f35:
        out["focal_35mm"] = float(f35)
    f = exif.get(0x920A)
    if f:
        out["focal_mm"] = float(f)
    return out


HANDHELD_HEIGHT_M = {"standing": 1.40, "crouching": 0.75}


def road_normal_from_tilt(beta: float, gamma: float, width: int, height: int) -> "np.ndarray":
    """Unit 'up' vector in camera coordinates (x right, y down, z forward) from the browser's
    DeviceOrientation beta/gamma (degrees). For a level road it is the road-plane normal pointing to the camera.

    Device frame (W3C): x right, y toward the top of the phone, z out of the screen; the back camera looks along
    -z. Up vector in the device frame: (-cos b sin g, sin b, cos b cos g). Portrait photo: camera = (x, -y, -z).
    Landscape photo: the phone is turned a quarter, the side pointing up (sign of the up vector's x) decides how.
    """
    import numpy as np

    b, g = np.radians(beta), np.radians(gamma)
    up = np.array([-np.cos(b) * np.sin(g), np.sin(b), np.cos(b) * np.cos(g)])
    if width <= height:  # portrait
        cam = np.array([up[0], -up[1], -up[2]])
    elif up[0] >= 0:     # landscape, phone top to the left: device +x is image up
        cam = np.array([-up[1], -up[0], -up[2]])
    else:                # landscape, phone top to the right
        cam = np.array([up[1], up[0], -up[2]])
    return cam / np.linalg.norm(cam)


def focal_px(camera: dict | None, width: int, height: int) -> float | None:
    """Focal length in pixels from the phone's 35 mm-equivalent focal, None when unknown or implausible."""
    f35 = (camera or {}).get("focal_35mm")
    if not f35 or not (10 <= f35 <= 200):  # phones: 13-120 mm equivalent
        return None
    return float(f35) * math.hypot(width, height) / FULL_FRAME_DIAG_MM
