"""Depth accuracy vs. tape-measure ground truth (contract: error <= 3 cm).

Input CSV (produced by WP1, >= 40 potholes measured "au mètre ruban"):
    image,depth_cm[,x1,y1,x2,y2][,hfov_deg]
If no box is given, the most confident pothole detected in the image is used.
hfov_deg = horizontal field of view of the capture phone (default 70).

Usage: python scripts/evaluate_depth.py data/ground_truth/depth.csv
Outputs reports/eval_depth.md (MAE, median, share within 3 cm, per-image table).
"""
import argparse
import csv
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from roadvision.config import CLASSES  # noqa: E402
from roadvision.depth import DEFAULT_HFOV_DEG, DepthEstimator  # noqa: E402
from roadvision.detector import Detector  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv")
    ap.add_argument("--images-root", default=None, help="prefix for relative image paths")
    a = ap.parse_args()

    rows = list(csv.DictReader(open(a.csv, encoding="utf-8")))
    base = Path(a.images_root) if a.images_root else Path(a.csv).parent
    det, est = Detector(conf=0.2), DepthEstimator()
    res = []
    for r in rows:
        p = Path(r["image"]) if Path(r["image"]).is_absolute() else base / r["image"]
        img = cv2.imread(str(p))
        if img is None:
            print("missing", p); continue
        est.hfov = float(r.get("hfov_deg") or DEFAULT_HFOV_DEG)
        if r.get("x1"):
            box = [float(r[k]) for k in ("x1", "y1", "x2", "y2")]
        else:
            pots = [d for d in det(img) if CLASSES[d.class_id]["name"] == "pothole"]
            if not pots:
                res.append((r["image"], float(r["depth_cm"]), None)); continue
            box = max(pots, key=lambda d: d.confidence).box
        pred = est.pothole_depth_cm(est.depth_map(img), box)
        res.append((r["image"], float(r["depth_cm"]), pred))

    ok = [(g, p) for _, g, p in res if p is not None]
    err = np.array([abs(p - g) for g, p in ok]) if ok else np.array([np.nan])
    lines = ["# Depth evaluation", "",
             f"Potholes: {len(res)} · estimated: {len(ok)} · not detected: {len(res) - len(ok)}", "",
             f"- MAE: **{np.nanmean(err):.2f} cm** (target ≤ 3 cm)",
             f"- median abs error: {np.nanmedian(err):.2f} cm",
             f"- within 3 cm: {100 * np.mean(err <= 3):.1f} %", "",
             "| image | measured cm | estimated cm | abs err |", "|---|---:|---:|---:|"]
    lines += [f"| {i} | {g:.1f} | {'—' if p is None else f'{p:.1f}'} | {'—' if p is None else f'{abs(p - g):.1f}'} |" for i, g, p in res]
    out = ROOT / "reports" / "eval_depth.md"
    out.write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines[:8]).encode("ascii", "replace").decode())


if __name__ == "__main__":
    main()
