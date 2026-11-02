"""Detection dataset v3 = v2 (RDD2022 subset + Kaggle + Kent) + Pothole Mix converted from masks to boxes.

Pothole Mix (SHREC 2022, CC BY-NC 3.0) masks: red = pothole -> class 3, green = crack -> crack subtype chosen
like the Kaggle cracks (overlap with the RDD2022-pretrained detector, else box shape). Many of these are phone
photos (Crack500), the viewpoint of citizen reports.
  - pothole600 is EXCLUDED from training: kept as an unseen close-up test (data/processed/pothole600_test)
  - the v2 test split is copied unchanged, so v2 and v3 models are compared on the same images
Output: data/processed/roadvision_v3/ (+ meta.json with the source of every image)
"""
import json
import shutil
import sys
from collections import Counter
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT / "scripts"))
from prepare_dataset import crack_subtype  # noqa: E402
from roadvision.config import CLASSES  # noqa: E402
from roadvision.detector import Detector  # noqa: E402

V2 = ROOT / "data" / "processed" / "roadvision"
V3 = ROOT / "data" / "processed" / "roadvision_v3"
P600 = ROOT / "data" / "processed" / "pothole600_test"
PMX = ROOT / "data" / "raw" / "pothole_mix" / "extracted" / "pothole-mix"
SPLITS = {"training": "train", "validation": "val", "testing": "test"}
SOURCES = ["cracks-and-potholes-in-road", "cnr-road-dataset", "crack500", "edmcrack600", "gaps384"]
MIN_FRAC = 0.0005  # component area / image area


def components(binary, dilate):
    if dilate:
        binary = cv2.dilate(binary.astype(np.uint8), np.ones((dilate, dilate), np.uint8))
    n, _, st, _ = cv2.connectedComponentsWithStats(binary.astype(np.uint8))
    h, w = binary.shape
    out = []
    for i in range(1, n):
        x, y, bw, bh, area = st[i]
        if area < MIN_FRAC * h * w:
            continue
        out.append(((x + bw / 2) / w, (y + bh / 2) / h, bw / w, bh / h))
    return out


def boxes_from_mask(mask_bgr, det, img):
    red = (mask_bgr[..., 2] > 127) & (mask_bgr[..., 1] < 100)
    green = (mask_bgr[..., 1] > 127) & (mask_bgr[..., 2] < 100)
    h, w = red.shape
    labs, how = [], Counter()
    for b in components(red, 0):
        labs.append((3, *b))
    preds = None
    for b in components(green, max(3, w // 150)):  # join the fragments of one crack
        if preds is None:
            preds = det(img)
        c, m = crack_subtype(b, preds, w, h)
        how[m] += 1
        labs.append((c, *b))
    return labs, how


def write(root, split, img_path, name, labs):
    (root / "images" / split).mkdir(parents=True, exist_ok=True)
    (root / "labels" / split).mkdir(parents=True, exist_ok=True)
    shutil.copy(img_path, root / "images" / split / name)
    (root / "labels" / split / f"{Path(name).stem}.txt").write_text(
        "\n".join(f"{c} {x:.6f} {y:.6f} {min(bw, 1):.6f} {min(bh, 1):.6f}" for c, x, y, bw, bh in labs))


def main():
    if V3.exists():
        shutil.rmtree(V3)
    shutil.copytree(V2, V3, ignore=shutil.ignore_patterns("*.cache"))
    meta = json.loads((V3 / "meta.json").read_text())
    det = Detector(str(ROOT / "models" / "rdd2022_yolov8s.pt"), conf=0.15)
    stats, how_all = Counter(), Counter()
    for src_split, split in SPLITS.items():
        for source in SOURCES + ["pothole600"]:
            d = PMX / src_split / source
            if not d.exists():
                continue
            masks = {m.stem: m for m in (d / "masks").iterdir()}
            for img_path in sorted((d / "images").iterdir()):
                m = masks.get(img_path.stem)
                if m is None:
                    continue
                img = cv2.imread(str(img_path))
                labs, how = boxes_from_mask(cv2.imread(str(m)), det, img)
                how_all.update(how)
                if how["shape"] and source != "pothole600":
                    # a crack whose type is only guessed from its shape would teach wrong crack classes;
                    # dropping just that box would teach "background" instead: the whole image is skipped
                    stats[(split, "skipped_guessed_crack_type")] += 1
                    continue
                name = f"pmx_{source}_{img_path.stem}{img_path.suffix.lower()}"
                if source == "pothole600":  # unseen close-up test, never trained on
                    write(P600, "test", img_path, name, labs)
                    continue
                write(V3, split, img_path, name, labs)
                meta[name] = {"source": f"pothole_mix:{source}", "surface": "unknown", "split": split}
                stats[(split, source)] += 1
    (V3 / "meta.json").write_text(json.dumps(meta, indent=0))
    for root in (V3, P600):
        nm = "".join(f"  {k}: {v['name']}\n" for k, v in CLASSES.items())
        (root / "data.yaml").write_text(f"path: {root.as_posix()}\ntrain: images/{'train' if root == V3 else 'test'}\n"
                                        f"val: images/{'val' if root == V3 else 'test'}\ntest: images/test\n"
                                        f"nc: {len(CLASSES)}\nnames:\n{nm}")
    for k in sorted(stats):
        print(k, stats[k])
    print("crack subtype assignment:", dict(how_all))


if __name__ == "__main__":
    main()
