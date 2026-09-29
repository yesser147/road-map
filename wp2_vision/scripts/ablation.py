"""Ablation study -> reports/ablation.md

Rows (each evaluated with scripts/evaluate.py on the same test set):
  A  baseline      RDD2022 YOLOv8s, no fine-tuning (4 classes)
  B1 finetuned_v1  A fine-tuned on the merged 5-class dataset, all layers trainable
  B2 finetuned_v2  same, backbone frozen + lower LR (delivered model, models/roadvision_best.pt)
  C  finetuned@480 B2 with smaller input (faster on phones)
  D  onnx_fp32     B2 exported to ONNX
  E  onnx_int8     B2 exported to ONNX + dynamic INT8 quantisation (mobile deliverable)
  F  coco_init     same recipe but starting from COCO YOLOv8s instead of RDD2022 (if runs/coco_init exists)

Usage: python scripts/ablation.py [--skip-eval]
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PY = sys.executable

ROWS = [
    ("A", "baseline_rdd2022", "models/rdd2022_yolov8s.pt", 640, "RDD2022 pretrained, no fine-tuning"),
    ("B1", "finetuned_v1", "runs/finetune_v1/weights/best.pt", 640, "fine-tuned, all layers, lr 1e-3, 40 ep"),
    ("B2", "finetuned_v2_freeze", "models/roadvision_best.pt", 640,
     "**fine-tuned, backbone frozen (10 layers), lr 3e-4, 25 ep — delivered**"),
    ("C", "finetuned_480", "models/roadvision_best.pt", 480, "B2 with 480 px input"),
    ("D", "onnx_fp32", "models/export/roadvision_fp32.onnx", 640, "B2 exported to ONNX FP32"),
    ("E", "onnx_int8", "models/export/roadvision_int8.onnx", 640, "B2 ONNX dynamic INT8 (mobile)"),
    ("F", "coco_init", "runs/coco_init/weights/best.pt", 640, "same recipe, COCO init instead of RDD2022"),
]


def pct(v):
    return "—" if v is None else f"{v * 100:.1f}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--skip-eval", action="store_true")
    a = ap.parse_args()

    lines = ["# Ablation study — WP2 detector", "",
             "Same test set for every row (1263 images: RDD2022 subset, Kaggle, Kent). Threshold conf ≥ 0.25.",
             "Precision/recall are on defect classes (manhole excluded). *Day+dry precision* is the contract "
             "criterion (≥ 85 %), *manhole FA* the share of intact manholes flagged as defects (≤ 10 %).",
             "*ms/img*: rows A–C on GPU (PyTorch), D–E on CPU (onnxruntime) — see benchmark_cpu.md for a like-for-like CPU comparison.", "",
             "| | variant | size MB | ms/img | mAP50 defects | precision | recall | day+dry precision | pothole AP50 | manhole AP50 | manhole FA |",
             "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|"]
    for key, name, w, imgsz, desc in ROWS:
        wp = ROOT / w
        if not wp.exists():
            continue
        js = ROOT / "reports" / f"eval_{name}.json"
        if not a.skip_eval or not js.exists():
            subprocess.run([PY, str(ROOT / "scripts" / "evaluate.py"), "--weights", str(wp), "--name", name,
                            "--imgsz", str(imgsz)], check=True, stdout=subprocess.DEVNULL)
        r = json.loads(js.read_text())
        s = r["splits"]["all"]
        dd = r["splits"].get("day+dry", s)
        pc = s["per_class"]
        lines.append(
            f"| {key} | {desc} | {wp.stat().st_size / 1e6:.1f} | {r.get('ms_per_image_median', '—')} | "
            f"{pct(s['defects_overall']['map50'])} | {pct(s['defects_overall']['precision'])} | "
            f"{pct(s['defects_overall']['recall'])} | {pct(dd['defects_overall']['precision'])} | "
            f"{pct(pc['pothole']['ap50'])} | {pct(pc['manhole']['ap50'])} | {pct(s['manhole_false_alarm_rate'])} |")

    lines += ["", "Per-source AP50 (pothole) — shows the domain-gap effect of fine-tuning:", "",
              "| | rdd2022 | kaggle | kent |", "|---|---:|---:|---:|"]
    for key, name, *_ in ROWS:
        js = ROOT / "reports" / f"eval_{name}.json"
        if js.exists():
            sp = json.loads(js.read_text())["splits"]
            vals = [pct(sp.get(f"source={k}", {}).get("per_class", {}).get("pothole", {}).get("ap50")) for k in ("rdd2022", "kaggle_rdd", "kent")]
            lines.append(f"| {key} | " + " | ".join(vals) + " |")
    out = ROOT / "reports" / "ablation.md"
    out.write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines).encode("ascii", "replace").decode())


if __name__ == "__main__":
    main()
