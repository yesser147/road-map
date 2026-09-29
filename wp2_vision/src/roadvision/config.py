"""Paths and constants shared by every WP2 module."""
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]  # .../wp2_vision
DATA = ROOT / "data"
MODELS = ROOT / "models"
REPORTS = ROOT / "reports"

SCHEMA_VERSION = "1.0"
MODEL_VERSION = "0.1.0"

# Weights looked up in this order; the first that exists is used.
DETECTOR_CANDIDATES = [
    MODELS / "roadvision_best.pt",      # our fine-tuned model
    MODELS / "rdd2022_yolov8s.pt",      # pretrained baseline (4 classes, no manhole)
]
DEPTH_MODEL_ID = "depth-anything/Depth-Anything-V2-Small-hf"


def load_classes() -> dict[int, dict]:
    with open(ROOT / "configs" / "classes.yaml", encoding="utf-8") as f:
        return {int(k): v for k, v in yaml.safe_load(f)["classes"].items()}


CLASSES = load_classes()
