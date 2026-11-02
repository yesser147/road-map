"""Build a YOLO segmentation dataset of pothole outlines from Pothole Mix (SHREC 2022, CC BY-NC 3.0).

Masks: red = pothole, green = crack, black = background. One class: pothole.
  - pothole sources  : cracks-and-potholes-in-road, cnr-road-dataset
  - crack-only sources (crack500, edmcrack600, gaps384) are kept as negatives (empty label files),
    so cracks are not outlined as potholes
  - pothole600 is EXCLUDED: it comes from the same lab and camera as the Fan stereo test set
    (scripts/eval_dims_fan.py), keeping that test truly unseen.
Output: data/processed/potholeseg/{images,labels}/{train,val,test}/ + data.yaml
"""
import shutil
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "raw" / "pothole_mix" / "extracted" / "pothole-mix"
OUT = ROOT / "data" / "processed" / "potholeseg"
POTHOLE_SOURCES = ["cracks-and-potholes-in-road", "cnr-road-dataset"]
NEGATIVE_SOURCES = ["crack500", "edmcrack600", "gaps384"]
SPLITS = {"training": "train", "validation": "val", "testing": "test"}
MIN_AREA = 0.0004  # fraction of the image; smaller blobs are annotation noise


def polygons(mask_rgb):
    red = (mask_rgb[..., 2] > 127) & (mask_rgb[..., 1] < 100) & (mask_rgb[..., 0] < 100)  # BGR
    h, w = red.shape
    cnts, _ = cv2.findContours(red.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    out = []
    for c in cnts:
        if cv2.contourArea(c) < MIN_AREA * h * w or len(c) < 3:
            continue
        c = cv2.approxPolyDP(c, 0.002 * cv2.arcLength(c, True), True)
        if len(c) < 3:
            continue
        pts = c.reshape(-1, 2) / [w, h]
        out.append("0 " + " ".join(f"{x:.5f} {y:.5f}" for x, y in pts))
    return out


NEG_RATIO = 2  # at most 2 crack-only images per pothole image, so the model is not trained to say "nothing"


def main():
    import random
    random.seed(0)
    if OUT.exists():
        shutil.rmtree(OUT)
    stats = {}
    for src_split, split in SPLITS.items():
        (OUT / "images" / split).mkdir(parents=True)
        (OUT / "labels" / split).mkdir(parents=True)
        for source in POTHOLE_SOURCES + NEGATIVE_SOURCES:
            d = SRC / src_split / source
            if not d.exists():
                continue
            masks = {m.stem: m for m in (d / "masks").iterdir()}
            for img in sorted((d / "images").iterdir()):
                m = masks.get(img.stem)
                if m is None:
                    continue
                lines = polygons(cv2.imread(str(m))) if source in POTHOLE_SOURCES else []
                name = f"{source}_{img.stem}"
                shutil.copy(img, OUT / "images" / split / f"{name}{img.suffix.lower()}")
                (OUT / "labels" / split / f"{name}.txt").write_text("\n".join(lines))
                k = (split, "pothole" if lines else "empty")
                stats[k] = stats.get(k, 0) + 1
        # cap the empty images
        empties = [p for p in (OUT / "labels" / split).glob("*.txt") if not p.read_text().strip()]
        keep = NEG_RATIO * stats.get((split, "pothole"), 0)
        random.shuffle(empties)
        for p in empties[keep:]:
            p.unlink()
            for img in (OUT / "images" / split).glob(p.stem + ".*"):
                img.unlink()
        stats[(split, "empty")] = min(len(empties), keep)
    (OUT / "data.yaml").write_text(
        f"path: {OUT.as_posix()}\ntrain: images/train\nval: images/val\ntest: images/test\nnames:\n  0: pothole\n")
    for k in sorted(stats):
        print(k, stats[k])


if __name__ == "__main__":
    main()
