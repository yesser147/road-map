"""Pick a small, balanced RDD2022 subset (bandwidth-friendly) and download only those images.

Reads the per-shard metadata.jsonl (annotations included) and selects, without drone images:
  train: 3000 images (all pothole images from India / China_MotorBike first, then per-country quota, ~10% empty)
  valid: 600, test: 1000 (stratified by country)
Writes data/raw/rdd2022/subset.json and downloads the images.
"""
import json
import random
import re
import sys
from collections import defaultdict
from pathlib import Path

RAW = Path(__file__).resolve().parents[1] / "data" / "raw" / "rdd2022"
SIZES = {"train": 3000, "valid": 600, "test": 1000}
WEIGHT = {"Japan": 1.0, "India": 1.2, "China_MotorBike": 1.0, "Czech": 0.6, "United_States": 0.8, "Norway": 0.4}


def load(split):
    rows = []
    for f in sorted((RAW / "data" / "images" / split).glob("shard_*/metadata.jsonl")):
        for line in f.open():
            d = json.loads(line)
            d["shard"] = f.parent.name
            d["country"] = re.sub(r"_\d+\.jpg$", "", d["file_name"])
            rows.append(d)
    return [r for r in rows if r["country"] != "China_Drone"]


def pick(rows, n, rng):
    by = defaultdict(list)
    for r in rows:
        by[r["country"]].append(r)
    tot = sum(WEIGHT[c] * len(v) for c, v in by.items())
    chosen = []
    for c, v in by.items():
        k = min(len(v), round(n * WEIGHT[c] * len(v) / tot))
        pos = [r for r in v if r["objects"]["categories"]]
        neg = [r for r in v if not r["objects"]["categories"]]
        pot = [r for r in pos if 3 in r["objects"]["categories"]]
        rest = [r for r in pos if 3 not in r["objects"]["categories"]]
        rng.shuffle(pot); rng.shuffle(rest); rng.shuffle(neg)
        n_neg = min(len(neg), int(k * 0.1))
        take = (pot + rest)[: k - n_neg] + neg[:n_neg]
        chosen += take
    return chosen


def main():
    rng = random.Random(0)
    subset = {s: pick(load(s), n, rng) for s, n in SIZES.items()}
    (RAW / "subset.json").write_text(json.dumps(subset))
    for s, v in subset.items():
        print(s, len(v), "potholes:", sum(r["objects"]["categories"].count(3) for r in v))
    if "--no-download" in sys.argv:
        return
    from huggingface_hub import snapshot_download
    pats = [f"data/images/{s}/{r['shard']}/{r['file_name']}" for s, v in subset.items() for r in v]
    snapshot_download("dronefreak/RDD2022", repo_type="dataset", local_dir=RAW, allow_patterns=pats, max_workers=16)


if __name__ == "__main__":
    main()
