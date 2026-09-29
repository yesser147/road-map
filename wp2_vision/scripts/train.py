"""Fine-tune the RDD2022-pretrained YOLOv8s on the unified WP2 dataset (5 classes incl. manhole).

Starting point: dronefreak/rdd2022-yolov8s (Hugging Face, trained on 26.9k RDD2022 images).
Its backbone/neck are reused as-is; the classification head grows from 4 to 5 classes.

Usage:
  python scripts/train.py --epochs 40 --batch 16
  python scripts/train.py --base yolov8s.pt --name ablation_coco_init   # ablation: COCO init
Checkpoints are written every epoch (resume with --resume) - protects against interruptions.
"""
import argparse
import shutil
from pathlib import Path

from huggingface_hub import hf_hub_download
from ultralytics import YOLO

ROOT = Path(__file__).resolve().parents[1]


def base_weights(name: str) -> str:
    if name.startswith("hf:"):
        repo = name[3:]
        dst = ROOT / "models" / f"{repo.split('/')[-1].replace('-', '_')}.pt"
        if not dst.exists():
            shutil.copy(hf_hub_download(repo, "best.pt"), dst)
        return str(dst)
    return name


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="hf:dronefreak/rdd2022-yolov8s")
    ap.add_argument("--data", default=str(ROOT / "data" / "processed" / "roadvision" / "data.yaml"))
    ap.add_argument("--epochs", type=int, default=40)
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--name", default="finetune_v1")
    ap.add_argument("--freeze", type=int, default=0, help="freeze first N layers (ablation)")
    ap.add_argument("--resume", action="store_true")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--lr", type=float, default=0.001)
    ap.add_argument("--promote", action="store_true", help="copy best.pt to models/roadvision_best.pt")
    a = ap.parse_args()

    run_dir = ROOT / "runs" / a.name
    if a.resume and (run_dir / "weights" / "last.pt").exists():
        YOLO(str(run_dir / "weights" / "last.pt")).train(resume=True)
    else:
        model = YOLO(base_weights(a.base))
        model.train(
            data=a.data, epochs=a.epochs, batch=a.batch, imgsz=a.imgsz, device=0, workers=a.workers,
            project=str(ROOT / "runs"), name=a.name, exist_ok=True,
            optimizer="AdamW", lr0=a.lr, cos_lr=True, warmup_epochs=2, patience=12,
            freeze=a.freeze or None, save_period=1, plots=True, seed=0, deterministic=False,
            # road-specific augmentation: no vertical flip (sky/road orientation matters),
            # brightness/HSV jitter to emulate dusk and wet asphalt
            fliplr=0.5, flipud=0.0, hsv_v=0.5, hsv_s=0.6, degrees=0.0, mosaic=1.0, close_mosaic=5,
        )
    best = run_dir / "weights" / "best.pt"
    if best.exists() and a.promote:
        shutil.copy(best, ROOT / "models" / "roadvision_best.pt")
        print("copied ->", ROOT / "models" / "roadvision_best.pt")


if __name__ == "__main__":
    main()
