"""Evaluation report per defect type and per condition (contract WP2 acceptance criteria).

Works for any weights (baseline 4-class or fine-tuned 5-class): classes are mapped by name.
For each test image we run the detector at a low threshold, then compute
  * AP50 per class (all-point interpolation)
  * precision / recall / F1 at the operating threshold (--conf)
  * manhole false-alarm rate: share of intact manholes that receive a *defect* box (IoU >= 0.3)
  * the same metrics per condition: day/night (brightness), dry/wet (Kent water-filled potholes)

Usage:
  python scripts/evaluate.py --weights models/roadvision_best.pt --name finetuned
  python scripts/evaluate.py --weights models/rdd2022_yolov8s.pt --name baseline
Outputs reports/eval_<name>.json and reports/eval_<name>.md
"""
import argparse
import json
import time
import sys
from collections import defaultdict
from pathlib import Path

import cv2
import numpy as np
from tqdm import tqdm

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from roadvision.config import CLASSES  # noqa: E402
from roadvision.detector import Detector, RawDetection  # noqa: E402

NIGHT_BRIGHTNESS = 70  # mean grey below this = night / low light


def iou(a, b):
    ix = max(0, min(a[2], b[2]) - max(a[0], b[0]))
    iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
    inter = ix * iy
    u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / u if u > 0 else 0.0


def read_labels(p: Path, w: int, h: int):
    out = []
    if p.exists():
        for line in p.read_text().split("\n"):
            v = line.split()
            if len(v) >= 5:
                c, x, y, bw, bh = int(v[0]), *map(float, v[1:5])
                out.append((c, [(x - bw / 2) * w, (y - bh / 2) * h, (x + bw / 2) * w, (y + bh / 2) * h]))
    return out


def ap_from(scores_tp, n_gt):
    if n_gt == 0:
        return None
    if not scores_tp:
        return 0.0
    s = sorted(scores_tp, key=lambda t: -t[0])
    tp = np.cumsum([t[1] for t in s])
    fp = np.cumsum([1 - t[1] for t in s])
    rec = tp / n_gt
    prec = tp / np.maximum(tp + fp, 1e-9)
    mrec = np.concatenate([[0], rec, [1]])
    mpre = np.concatenate([[1], prec, [0]])
    for i in range(len(mpre) - 2, -1, -1):
        mpre[i] = max(mpre[i], mpre[i + 1])
    idx = np.where(mrec[1:] != mrec[:-1])[0]
    return float(np.sum((mrec[idx + 1] - mrec[idx]) * mpre[idx + 1]))


class Acc:
    def __init__(self):
        self.pairs = defaultdict(list)   # cls -> [(score, is_tp)]
        self.ngt = defaultdict(int)
        self.manhole_max_defect_conf = []  # per intact manhole: highest-confidence overlapping defect box
        self.images = 0

    def add(self, gts, preds, low_conf):
        self.images += 1
        for c, _ in gts:
            self.ngt[c] += 1
        for c in {c for c, _ in gts} | {p.class_id for p in preds}:
            g = [b for k, b in gts if k == c]
            used = [False] * len(g)
            for p in sorted([p for p in preds if p.class_id == c], key=lambda p: -p.confidence):
                best, bi = 0.0, -1
                for i, b in enumerate(g):
                    if not used[i]:
                        v = iou(p.box, b)
                        if v > best:
                            best, bi = v, i
                if best >= 0.5:
                    used[bi] = True
                    self.pairs[c].append((p.confidence, 1))
                else:
                    self.pairs[c].append((p.confidence, 0))
        for c, b in gts:
            if CLASSES[c]["name"] == "manhole":
                confs = [p.confidence for p in preds if CLASSES[p.class_id]["is_defect"] and iou(p.box, b) >= 0.3]
                self.manhole_max_defect_conf.append(max(confs, default=0.0))

    def manhole_fa(self, conf):
        m = self.manhole_max_defect_conf
        return round(sum(c >= conf for c in m) / len(m), 4) if m else None

    def sweep(self, confs=(0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5, 0.6, 0.7)):
        defects = [c for c, i in CLASSES.items() if i["is_defect"]]
        pairs = [t for c in defects for t in self.pairs.get(c, [])]
        ngt = sum(self.ngt.get(c, 0) for c in defects)
        out = []
        for t in confs:
            at = [x for x in pairs if x[0] >= t]
            tp = sum(x[1] for x in at)
            out.append({"conf": t, "precision": round(tp / len(at), 4) if at else None,
                        "recall": round(tp / ngt, 4) if ngt else None, "manhole_fa": self.manhole_fa(t)})
        return out

    def summary(self, conf):
        per = {}
        for c, info in CLASSES.items():
            pairs, n = self.pairs.get(c, []), self.ngt.get(c, 0)
            at = [t for t in pairs if t[0] >= conf]
            tp = sum(t[1] for t in at)
            p = tp / len(at) if at else None
            r = tp / n if n else None
            per[info["name"]] = {
                "n_gt": n, "ap50": None if n == 0 else round(ap_from(pairs, n), 4),
                "precision": None if p is None else round(p, 4), "recall": None if r is None else round(r, 4),
                "f1": None if not p or not r else round(2 * p * r / (p + r), 4),
            }
        defects = [c for c, i in CLASSES.items() if i["is_defect"]]
        allp = [t for c in defects for t in self.pairs.get(c, []) if t[0] >= conf]
        ngt = sum(self.ngt.get(c, 0) for c in defects)
        tp = sum(t[1] for t in allp)
        aps = [v["ap50"] for k, v in per.items() if v["ap50"] is not None and CLASSES[[i for i in CLASSES if CLASSES[i]["name"] == k][0]]["is_defect"]]
        return {
            "images": self.images,
            "per_class": per,
            "defects_overall": {
                "precision": round(tp / len(allp), 4) if allp else None,
                "recall": round(tp / ngt, 4) if ngt else None,
                "map50": round(float(np.mean(aps)), 4) if aps else None,
            },
            "manhole_false_alarm_rate": self.manhole_fa(conf),
            "manholes_evaluated": len(self.manhole_max_defect_conf),
        }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--weights", required=True)
    ap.add_argument("--test-list", default=str(ROOT / "data" / "processed" / "roadvision" / "test.txt"))
    ap.add_argument("--conf", type=float, default=0.25, help="operating threshold for P/R")
    ap.add_argument("--name", default=None)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--imgsz", type=int, default=640)
    a = ap.parse_args()

    det = Detector(a.weights, conf=0.01, imgsz=a.imgsz)
    name = a.name or Path(a.weights).stem
    imgs = [Path(l) for l in Path(a.test_list).read_text().split("\n") if l.strip()]
    if a.limit:
        imgs = imgs[: a.limit]
    meta = {}
    mp = Path(a.test_list).with_name("meta.json")
    if mp.exists():
        meta = json.loads(mp.read_text())

    accs = defaultdict(Acc)
    times = []
    for p in tqdm(imgs, desc=name):
        img = cv2.imread(str(p))
        if img is None:
            continue
        h, w = img.shape[:2]
        lbl = p.parents[2] / "labels" / p.parent.name / f"{p.stem}.txt"  # <root>/images/<split>/x.jpg
        gts = read_labels(lbl, w, h)
        t0 = time.perf_counter()
        preds = det(img)
        times.append((time.perf_counter() - t0) * 1000)
        m = meta.get(p.name, {})
        bright = float(cv2.cvtColor(cv2.resize(img, (320, 240)), cv2.COLOR_BGR2GRAY).mean())
        light = "night" if bright < NIGHT_BRIGHTNESS else "day"
        surface = m.get("surface", "dry")
        src = m.get("source", "unknown")
        for key in ("all", f"light={light}", f"surface={surface}", f"source={src.split(':')[0]}", f"{light}+{surface}"):
            accs[key].add(gts, preds, a.conf)
        # crack subtypes merged (Kaggle cracks have no ground-truth subtype): row "longitudinal_crack" = any crack
        merge = lambda c: 0 if c in (1, 2) else c  # noqa: E731
        accs["cracks_merged"].add([(merge(c), b) for c, b in gts],
                                  [RawDetection(merge(p.class_id), p.confidence, p.box) for p in preds], a.conf)

    report = {"weights": str(a.weights), "detector_classes": det.model.names, "conf": a.conf, "imgsz": a.imgsz,
              "ms_per_image_median": round(float(np.median(times[5:] or times)), 1),
              "threshold_sweep": {k: accs[k].sweep() for k in ("all", "day+dry") if k in accs},
              "splits": {k: v.summary(a.conf) for k, v in sorted(accs.items())}}
    out = ROOT / "reports"
    out.mkdir(exist_ok=True)
    (out / f"eval_{name}.json").write_text(json.dumps(report, indent=2))
    (out / f"eval_{name}.md").write_text(to_markdown(name, report), encoding="utf-8")
    print(to_markdown(name, report).encode("ascii", "replace").decode())


def fmt(v):
    return "—" if v is None else f"{v * 100:.1f}"


def to_markdown(name, r):
    lines = [f"# Evaluation — `{name}`", "", f"Weights: `{r['weights']}` · imgsz {r.get('imgsz', 640)} · operating threshold conf ≥ {r['conf']}"
             f" · median inference {r.get('ms_per_image_median', '?')} ms/image (GPU, batch 1)", ""]
    for split, sw in r.get("threshold_sweep", {}).items():
        lines += [f"### Threshold sweep — {split} (defect classes)", "", "| conf | precision | recall | manhole false alarms |", "|---:|---:|---:|---:|"]
        lines += [f"| {x['conf']} | {fmt(x['precision'])} | {fmt(x['recall'])} | {fmt(x['manhole_fa'])} |" for x in sw]
        lines.append("")
    for split, s in r["splits"].items():
        lines += [f"## {split}  ({s['images']} images)", "",
                  "| class | GT boxes | AP50 | precision | recall | F1 |", "|---|---:|---:|---:|---:|---:|"]
        for k, v in s["per_class"].items():
            if v["n_gt"] or v["precision"] is not None:
                lines.append(f"| {k} | {v['n_gt']} | {fmt(v['ap50'])} | {fmt(v['precision'])} | {fmt(v['recall'])} | {fmt(v['f1'])} |")
        o = s["defects_overall"]
        lines += ["", f"**Defects overall** — precision {fmt(o['precision'])} %, recall {fmt(o['recall'])} %, mAP50 {fmt(o['map50'])} %"]
        if s["manholes_evaluated"]:
            lines.append(f"**Manhole false-alarm rate** — {fmt(s['manhole_false_alarm_rate'])} % of {s['manholes_evaluated']} intact manholes flagged as defects (target ≤ 10 %)")
        lines.append("")
    return "\n".join(lines)


if __name__ == "__main__":
    main()
