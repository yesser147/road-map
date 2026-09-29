"""Severity rules (documented, deterministic, so WP3 can explain the priority score).

pothole : depth when available (<3 cm low, 3-6 cm medium, >6 cm high),
          otherwise the box area ratio (proxy for size).
cracks  : alligator cracking starts one level higher (structural fatigue);
          otherwise size of the box.
manhole : not a defect -> always "low" with score 0.
"""
from __future__ import annotations

POTHOLE_DEPTH_CM = (3.0, 6.0)
AREA_RATIO = (0.01, 0.05)  # box area / image area


def _level(value: float, cuts: tuple[float, float]) -> str:
    return "low" if value < cuts[0] else "medium" if value < cuts[1] else "high"


def severity(class_name: str, area_ratio: float, depth_cm: float | None, confidence: float) -> tuple[str, float]:
    if class_name == "manhole":
        return "low", 0.0
    if class_name == "pothole" and depth_cm is not None:
        score = min(1.0, depth_cm / 10.0)
        return _level(depth_cm, POTHOLE_DEPTH_CM), round(score, 3)
    size = min(1.0, area_ratio / 0.10)
    if class_name == "alligator_crack":
        size = min(1.0, size + 0.35)
    elif class_name == "pothole":
        size = min(1.0, size + 0.2)
    score = round(size * (0.5 + 0.5 * confidence), 3)
    return ("low" if score < 0.33 else "medium" if score < 0.66 else "high"), score
