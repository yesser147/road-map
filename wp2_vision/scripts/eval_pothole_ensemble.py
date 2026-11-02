"""Pothole detection: main detector vs outline model vs both merged (citizen photos are often close-ups).

AP50 for the pothole class only, on a test list whose YOLO labels use class 3 = pothole.
  detector : the 5-class detector (pothole boxes)
  outline  : boxes of the pothole outline model (models/pothole_seg.pt)
  merged   : both sets of boxes, overlapping ones (IoU > 0.5) fused, keeping the higher confidence
Usage: python scripts/eval_pothole_ensemble.py --test-list <txt> [--det w] [--seg w]
"""
import argparse
from pathlib import Path

import cv2
import numpy as np
from ultralytics import YOLO

ROOT = Path(__file__).resolve().parents[1]
POTHOLE = 3


def iou(a, b):
    ix = max(0, min(a[2], b[2]) - max(a[0], b[0]))
    iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
    u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - ix * iy
    return ix * iy / u if u > 0 else 0.0


def merge(dets, thr=0.5):
    dets = sorted(dets, key=lambda d: -d[4])
    keep = []
    for d in dets:
        if all(iou(d, k) <= thr for k in keep):
            keep.append(d)
    return keep


def ap50(preds, gts):
    """preds: list of (img, box, conf); gts: {img: [boxes]}."""
    npos = sum(len(v) for v in gts.values())
    used = {k: [False] * len(v) for k, v in gts.items()}
    tp = []
    for img, box, conf in sorted(preds, key=lambda p: -p[2]):
        best, j = 0.0, -1
        for i, g in enumerate(gts.get(img, [])):
            o = iou(box, g)
            if o > best:
                best, j = o, i
        if best >= 0.5 and not used[img][j]:
            used[img][j] = True
            tp.append(1)
        else:
            tp.append(0)
    tp = np.array(tp)
    if npos == 0 or len(tp) == 0:
        return 0.0, 0.0, 0.0
    ctp = np.cumsum(tp)
    rec, prec = ctp / npos, ctp / (np.arange(len(tp)) + 1)
    mrec = np.concatenate([[0], rec, [1]])
    mpre = np.concatenate([[1], prec, [0]])
    for i in range(len(mpre) - 2, -1, -1):
        mpre[i] = max(mpre[i], mpre[i + 1])
    xs = np.linspace(0, 1, 101)
    ap = float(np.mean([mpre[np.searchsorted(mrec, x, side="left")] for x in xs]))
    return ap, float(rec[-1]), float(prec[-1])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--test-list", required=True)
    ap.add_argument("--det", default=str(ROOT / "models" / "roadvision_best.pt"))
    ap.add_argument("--seg", default=str(ROOT / "models" / "pothole_seg.pt"))
    ap.add_argument("--grid", action="store_true", help="also try: outline boxes kept only if large, confidence discounted")
    a = ap.parse_args()
    grid = [(k, m) for k in (1.0, 0.7, 0.5) for m in (0.0, 0.01, 0.03, 0.06)] if a.grid else []
    det, seg = YOLO(a.det), YOLO(a.seg)
    imgs = [l.strip() for l in open(a.test_list) if l.strip()]
    gts, P = {}, {"detector": [], "outline": [], "merged": []}
    for k, m in grid:
        P[f"merged k={k} min_area={m}"] = []
    for p in imgs:
        im = cv2.imread(p)
        h, w = im.shape[:2]
        lab = Path(p.replace("\\", "/").replace("/images/", "/labels/")).with_suffix(".txt")
        g = []
        if lab.exists():
            for line in lab.read_text().split("\n"):
                v = line.split()
                if len(v) == 5 and int(v[0]) == POTHOLE:
                    cx, cy, bw, bh = map(float, v[1:])
                    g.append([(cx - bw / 2) * w, (cy - bh / 2) * h, (cx + bw / 2) * w, (cy + bh / 2) * h])
        gts[p] = g
        rd = det.predict(im, conf=0.01, verbose=False)[0].boxes
        d = [list(b) + [float(c)] for b, c, k in zip(rd.xyxy.cpu().numpy(), rd.conf.cpu().numpy(), rd.cls.cpu().numpy()) if int(k) == POTHOLE]
        rs = seg.predict(im, conf=0.01, verbose=False)[0].boxes
        s = [list(b) + [float(c)] for b, c in zip(rs.xyxy.cpu().numpy(), rs.conf.cpu().numpy())]
        for name, boxes in [("detector", d), ("outline", s), ("merged", merge(d + s))]:
            P[name] += [(p, b[:4], b[4]) for b in boxes]
        for k, m in grid:
            ss = [b[:4] + [b[4] * k] for b in s if (b[2] - b[0]) * (b[3] - b[1]) / (w * h) >= m]
            P[f"merged k={k} min_area={m}"] += [(p, b[:4], b[4]) for b in merge(d + ss)]
    print(f"{len(imgs)} images, {sum(len(v) for v in gts.values())} potholes")
    print("| source | pothole AP50 | recall (all boxes) |\n|---|---:|---:|")
    for name, preds in P.items():
        apv, rec, _ = ap50(preds, gts)
        print(f"| {name} | {apv * 100:.1f} % | {rec * 100:.0f} % |")


if __name__ == "__main__":
    main()
