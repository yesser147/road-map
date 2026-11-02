"""Turn pothole BOXES into pothole OUTLINES with SAM 2 (box-prompted), to enlarge the outline training set.

Source: the WP2 detection dataset (data/processed/roadvision), TRAIN and VAL splits only - its test split
and the Fan stereo test set stay unseen. Kent images are close-up phone photos (the viewpoint Pothole Mix
lacks), Kaggle are dashcam frames, RDD2022 street photos (600 sampled).
Quality filter: an outline is kept only if it covers 20-95 % of its box (SAM failures are near 0 or ~100 %).
Output is merged into data/processed/potholeseg (prefix sam_), same YOLO-seg format, class 0 = pothole.

Usage: python scripts/sam_pseudolabel.py [--rdd 600]
"""
import argparse
import random
import shutil
from pathlib import Path

import cv2
import numpy as np
from ultralytics import SAM

ROOT = Path(__file__).resolve().parents[1]
DET = ROOT / "data" / "processed" / "roadvision"
SEG = ROOT / "data" / "processed" / "potholeseg"
POTHOLE = 3


def boxes_of(label_file, w, h):
    out = []
    for line in label_file.read_text().split("\n"):
        v = line.split()
        if len(v) == 5 and int(v[0]) == POTHOLE:
            cx, cy, bw, bh = map(float, v[1:])
            out.append([(cx - bw / 2) * w, (cy - bh / 2) * h, (cx + bw / 2) * w, (cy + bh / 2) * h])
    return out


def polygon(mask, w, h):
    cnts, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cnts:
        return None
    c = max(cnts, key=cv2.contourArea)
    c = cv2.approxPolyDP(c, 0.002 * cv2.arcLength(c, True), True).reshape(-1, 2)
    if len(c) < 3:
        return None
    return "0 " + " ".join(f"{x / w:.5f} {y / h:.5f}" for x, y in c)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rdd", type=int, default=600)
    ap.add_argument("--model", default="sam2.1_b.pt")
    a = ap.parse_args()
    random.seed(0)
    sam = SAM(a.model)
    kept = dropped = 0
    for split in ["train", "val"]:
        labels = sorted((DET / "labels" / split).glob("*.txt"))
        pick = [l for l in labels if l.name.startswith(("kent_", "kag_"))]
        rdd = [l for l in labels if l.name.startswith("rdd_")]
        random.shuffle(rdd)
        pick += rdd[: a.rdd if split == "train" else a.rdd // 5]
        for lf in pick:
            img = next((DET / "images" / split).glob(lf.stem + ".*"), None)
            if img is None:
                continue
            im = cv2.imread(str(img))
            h, w = im.shape[:2]
            boxes = boxes_of(lf, w, h)
            if not boxes:
                continue
            r = sam.predict(im, bboxes=boxes, verbose=False)[0]
            if r.masks is None:
                continue
            lines = []
            for m, b in zip(r.masks.data.cpu().numpy() > 0.5, boxes):
                x1, y1, x2, y2 = [int(round(v)) for v in b]
                box_area = max(1, (x2 - x1) * (y2 - y1))
                fill = m[max(0, y1):y2, max(0, x1):x2].sum() / box_area
                p = polygon(m, w, h) if 0.2 <= fill <= 0.95 else None
                if p:
                    lines.append(p)
                    kept += 1
                else:
                    dropped += 1
            if lines and len(lines) == len(boxes):  # every pothole outlined, else an unlabeled one teaches "background"
                name = f"sam_{img.stem}"
                shutil.copy(img, SEG / "images" / split / f"{name}{img.suffix.lower()}")
                (SEG / "labels" / split / f"{name}.txt").write_text("\n".join(lines))
        print(split, "done", flush=True)
    print(f"outlines kept {kept}, dropped by the quality filter {dropped}")


if __name__ == "__main__":
    main()
