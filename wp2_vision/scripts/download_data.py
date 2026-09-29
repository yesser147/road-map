"""Download the public datasets used by WP2 into data/raw/.

Sources (all public):
  rdd2022   HF dataset dronefreak/RDD2022 (YOLO format, 4 classes, CC BY-SA 4.0) - a subset
            (N train shards + 1 test shard) is enough to keep crack classes alive while fine-tuning.
  kaggle    lorenzoarcioni/road-damage-dataset-potholes-cracks-and-manholes (adds the manhole class)
  kent      Mendeley tp95cdvgm8 - water-filled and dry potholes, YOLO txt (wet condition)

Usage: python scripts/download_data.py [--rdd-train-shards 1] [--only rdd2022,kaggle,kent]
"""
import argparse
import subprocess
import sys
import zipfile
from pathlib import Path

RAW = Path(__file__).resolve().parents[1] / "data" / "raw"

KAGGLE_URL = "https://www.kaggle.com/api/v1/datasets/download/lorenzoarcioni/road-damage-dataset-potholes-cracks-and-manholes"
KENT_URL = "https://data.mendeley.com/public-files/datasets/tp95cdvgm8/files/6eb812d0-cf9b-46ec-bcd7-6d9fe1b8d768/file_downloaded"


def curl(url: str, dst: Path):
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["curl", "-L", "-C", "-", "--retry", "5", "-o", str(dst), url], check=True)


def unzip(z: Path, out: Path):
    with zipfile.ZipFile(z) as f:
        f.extractall(out)


def rdd2022(train_shards: int, test_shards: int):
    from huggingface_hub import snapshot_download

    pats = ["data/data.yaml"]
    for s in range(train_shards):
        pats += [f"data/images/train/shard_{s:03d}/*", f"data/labels/train/shard_{s:03d}/*"]
    for s in range(test_shards):
        pats += [f"data/images/test/shard_{s:03d}/*", f"data/labels/test/shard_{s:03d}/*"]
    snapshot_download("dronefreak/RDD2022", repo_type="dataset", local_dir=RAW / "rdd2022",
                      allow_patterns=pats, max_workers=8)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="rdd2022,kaggle,kent")
    ap.add_argument("--rdd-train-shards", type=int, default=1)
    ap.add_argument("--rdd-test-shards", type=int, default=1)
    a = ap.parse_args()
    todo = a.only.split(",")
    if "kent" in todo and not (RAW / "kent_potholes").glob("**/*.txt"):
        z = RAW / "kent_potholes" / "Potholes.zip"
        curl(KENT_URL, z); unzip(z, z.parent); z.unlink()
    if "kaggle" in todo and not (RAW / "kaggle_rdd").exists():
        z = RAW / "kaggle_rdd.zip"
        curl(KAGGLE_URL, z); unzip(z, RAW / "kaggle_rdd"); z.unlink()
    if "rdd2022" in todo:
        rdd2022(a.rdd_train_shards, a.rdd_test_shards)
    print("done ->", RAW)


if __name__ == "__main__":
    sys.exit(main())
