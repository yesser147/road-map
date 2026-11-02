"""Train the pothole outline model (YOLOv8s-seg, COCO-pretrained) on scripts/prepare_seg.py output.

The outline (mask) replaces the bounding box when measuring length, width and depth: on the Fan stereo
test, masks cut the width error from 1.5 cm (box) to 0.5 cm.

Usage: python scripts/train_seg.py --epochs 80 --batch 8 [--promote]
"""
import argparse
import shutil
from pathlib import Path

from ultralytics import YOLO

ROOT = Path(__file__).resolve().parents[1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="yolov8s-seg.pt")
    ap.add_argument("--epochs", type=int, default=80)
    ap.add_argument("--batch", type=int, default=8)
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--name", default="seg_pothole_v1")
    ap.add_argument("--promote", action="store_true", help="copy best.pt to models/pothole_seg.pt")
    ap.add_argument("--scale", type=float, default=0.5, help="zoom augmentation; 0.9 also covers close-up photos")
    a = ap.parse_args()
    model = YOLO(a.base)
    model.train(
        data=str(ROOT / "data" / "processed" / "potholeseg" / "data.yaml"),
        epochs=a.epochs, batch=a.batch, imgsz=a.imgsz, device=0, workers=4,
        project=str(ROOT / "runs"), name=a.name, exist_ok=True, patience=20, seed=0,
        optimizer="AdamW", lr0=0.001, cos_lr=True, warmup_epochs=3,
        # same road-specific augmentation as the detector: no vertical flip, light and colour jitter
        fliplr=0.5, flipud=0.0, hsv_v=0.5, hsv_s=0.6, degrees=0.0, scale=a.scale, mosaic=1.0, close_mosaic=10,
        save_period=5, plots=True,
    )
    best = ROOT / "runs" / a.name / "weights" / "best.pt"
    if a.promote and best.exists():
        shutil.copy(best, ROOT / "models" / "pothole_seg.pt")
        print("copied ->", ROOT / "models" / "pothole_seg.pt")


if __name__ == "__main__":
    main()
