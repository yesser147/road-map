"""Merge the public datasets into one YOLO dataset with the unified WP2 taxonomy (configs/classes.yaml).

  0 longitudinal_crack  1 transverse_crack  2 alligator_crack  3 pothole  4 manhole

Sources and mapping
  rdd2022 subset  (data/raw/rdd2022, from select_rdd_subset.py)  ids 0-3 kept; its own train/valid/test split.
  kaggle_rdd      (lorenzoarcioni)  0 Pothole->3, 2 Manhole->4, 1 Crack -> subtype chosen by the pretrained
                  RDD2022 model (class of the best-overlapping crack prediction), else by box shape:
                  wide (w/h>2) -> transverse, large & compact -> alligator, otherwise longitudinal.
                  Split 80/10/10 by blocks of 40 consecutive frames (video frames: avoids train/test leakage).
  kent_potholes   (Mendeley tp95cdvgm8) every box -> pothole; the image is tagged surface=wet when it contains
                  a water-filled pothole (used by the per-condition evaluation). Same block split.

Output: data/processed/roadvision/{images,labels}/{train,val,test}/, data.yaml, test.txt, meta.json
"""
import argparse
import json
import random
import shutil
import sys
from collections import Counter, defaultdict
from pathlib import Path

import cv2

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "processed" / "roadvision"
sys.path.insert(0, str(ROOT / "src"))
from roadvision.config import CLASSES  # noqa: E402

SPLITS = ("train", "val", "test")
meta: dict[str, dict] = {}
TAGGER = None
stats = defaultdict(Counter)


def write(split, src_img: Path, name: str, labels: list[tuple[int, float, float, float, float]], info: dict):
    di = OUT / "images" / split
    dl = OUT / "labels" / split
    di.mkdir(parents=True, exist_ok=True); dl.mkdir(parents=True, exist_ok=True)
    shutil.copy(src_img, di / name)
    lines = []
    for c, x, y, w, h in labels:
        x, y = min(max(x, 0), 1), min(max(y, 0), 1)
        if w <= 0.002 or h <= 0.002:
            continue
        lines.append(f"{c} {x:.6f} {y:.6f} {min(w, 1):.6f} {min(h, 1):.6f}")
        stats[split][CLASSES[c]["name"]] += 1
    (dl / f"{Path(name).stem}.txt").write_text("\n".join(lines))
    stats[split]["_images"] += 1
    if "surface" not in info:  # condition tag, only needed for evaluation
        info["surface"] = TAGGER(cv2.imread(str(src_img))) if (TAGGER and split == "test") else "unknown"
    meta[name] = {**info, "split": split}


def block_split(names: list[str], block=40, seed=0):
    names = sorted(names)
    blocks = [names[i:i + block] for i in range(0, len(names), block)]
    rng = random.Random(seed)
    rng.shuffle(blocks)
    n = len(blocks)
    out = {}
    for i, b in enumerate(blocks):
        s = "test" if i < max(1, round(n * 0.1)) else "val" if i < max(2, round(n * 0.2)) else "train"
        for x in b:
            out[x] = s
    return out


def rdd2022():
    sub = json.loads((RAW / "rdd2022" / "subset.json").read_text())
    for split, rows in sub.items():
        dst = {"train": "train", "valid": "val", "test": "test"}[split]
        for r in rows:
            p = RAW / "rdd2022" / "data" / "images" / split / r["shard"] / r["file_name"]
            if not p.exists():
                continue
            h, w = cv2.imread(str(p)).shape[:2]
            labs = [(c, (bx + bw / 2) / w, (by + bh / 2) / h, bw / w, bh / h)
                    for (bx, by, bw, bh), c in zip(r["objects"]["bbox"], r["objects"]["categories"])]
            write(dst, p, f"rdd_{r['file_name']}", labs, {"source": f"rdd2022:{r['country']}"})


def _iou(a, b):
    ix = max(0, min(a[2], b[2]) - max(a[0], b[0])); iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
    u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - ix * iy
    return ix * iy / u if u > 0 else 0


def crack_subtype(box_xywhn, preds, w, h):
    x, y, bw, bh = box_xywhn
    b = [(x - bw / 2) * w, (y - bh / 2) * h, (x + bw / 2) * w, (y + bh / 2) * h]
    best, cls = 0.2, None
    for p in preds:
        if p.class_id in (0, 1, 2):
            v = _iou(b, p.box)
            if v > best:
                best, cls = v, p.class_id
    if cls is not None:
        return cls, "model"
    ratio = (bw * w) / max(bh * h, 1e-6)
    if ratio > 2:
        return 1, "shape"
    if bw * bh > 0.04 and 0.5 <= ratio <= 2:
        return 2, "shape"
    return 0, "shape"


def kaggle(detector):
    base = RAW / "kaggle_rdd" / "data"
    imgs = sorted((base / "images").glob("*.jpg"))
    split = block_split([p.name for p in imgs])
    how = Counter()
    for p in imgs:
        lf = base / "labels-YOLO" / f"{p.stem}.txt"
        rows = [l.split() for l in lf.read_text().split("\n") if l.strip()] if lf.exists() else []
        preds = None
        labs = []
        img = None
        for v in rows:
            c, box = int(v[0]), list(map(float, v[1:5]))
            if c == 0:
                labs.append((3, *box))
            elif c == 2:
                labs.append((4, *box))
            elif c == 1:
                if preds is None:
                    img = cv2.imread(str(p))
                    preds = detector(img) if detector else []
                h, w = (img.shape[:2] if img is not None else (360, 640))
                sub, m = crack_subtype(box, preds, w, h)
                how[m] += 1
                labs.append((sub, *box))
        write(split[p.name], p, f"kag_{p.name}", labs, {"source": "kaggle_rdd"})
    print("kaggle crack subtype assignment:", dict(how))


class WetTagger:
    """CLIP zero-shot wet/dry tag. The Kent labels only say 'pothole', so the surface condition
    used for the per-condition report is inferred automatically (documented as such)."""
    WET = ["a pothole filled with water", "a wet road with puddles after rain"]
    DRY = ["a dry pothole in asphalt", "a dry road surface on a sunny day"]

    def __init__(self):
        import torch
        from transformers import CLIPModel, CLIPProcessor
        self.t = torch
        self.dev = "cuda" if torch.cuda.is_available() else "cpu"
        self.m = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(self.dev).eval()
        self.p = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

    def __call__(self, bgr) -> str:
        x = self.p(text=self.WET + self.DRY, images=cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB), return_tensors="pt", padding=True)
        with self.t.no_grad():
            pr = self.m(**{k: v.to(self.dev) for k, v in x.items()}).logits_per_image.softmax(-1)[0].cpu().numpy()
        return "wet" if pr[: len(self.WET)].sum() > 0.5 else "dry"


def kent():
    base = RAW / "kent_potholes"
    imgs = sorted((base / "IMG").glob("*.jpg"))
    split = block_split([p.name for p in imgs], block=10)
    tagger = TAGGER
    n = Counter()
    for p in imgs:
        lf = base / "TXT" / f"{p.stem}.txt"
        rows = [l.split() for l in lf.read_text().split("\n") if l.strip()] if lf.exists() else []
        labs = [(3, *map(float, v[1:5])) for v in rows if len(v) >= 5]
        surface = tagger(cv2.imread(str(p))) if tagger else "unknown"
        n[surface] += 1
        write(split[p.name], p, f"kent_{p.name}", labs, {"source": "kent", "surface": surface})
    print("kent surface tags:", dict(n))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--baseline", default=str(ROOT / "models" / "rdd2022_yolov8s.pt"))
    ap.add_argument("--skip", default="")
    a = ap.parse_args()
    if OUT.exists():
        shutil.rmtree(OUT)
    skip = a.skip.split(",")
    global TAGGER
    try:
        TAGGER = WetTagger()
    except Exception as e:  # CLIP unavailable -> surface "unknown"
        print("wet tagger unavailable:", e)
    detector = None
    if Path(a.baseline).exists():
        from roadvision.detector import Detector
        detector = Detector(a.baseline, conf=0.15)
    if "rdd2022" not in skip:
        rdd2022()
    if "kaggle" not in skip:
        kaggle(detector)
    if "kent" not in skip:
        kent()

    (OUT / "data.yaml").write_text(
        f"path: {OUT.as_posix()}\ntrain: images/train\nval: images/val\ntest: images/test\n"
        f"nc: {len(CLASSES)}\nnames:\n" + "".join(f"  {k}: {v['name']}\n" for k, v in CLASSES.items()))
    (OUT / "test.txt").write_text("\n".join(str(p) for p in sorted((OUT / "images" / "test").iterdir())))
    (OUT / "meta.json").write_text(json.dumps(meta, indent=0))
    (OUT / "stats.json").write_text(json.dumps(stats, indent=2))
    for s in SPLITS:
        print(s, dict(stats[s]))


if __name__ == "__main__":
    main()
