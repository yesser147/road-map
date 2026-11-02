"""Download the public pothole depth datasets used to fine-tune and test the dimension module.

  potholedepth  Zenodo 15773442 (CC BY 4.0) - 25k iPhone 14 Pro RGB + LiDAR depth maps   -> training
  fan_stereo    github ruirangerfan/stereo_pothole_datasets (MIT) - 67 stereo frames with
                per-pixel 3D point clouds (2.2 mm accuracy vs laser scan) + pothole masks    -> held-out test

Usage: python scripts/download_depth_data.py [fan_stereo]
The Zenodo archive is large (4.8 GB): it is fetched with curl -C - so an interrupted download resumes.
"""
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
FAN_REPO = "ruirangerfan/stereo_pothole_datasets"
FAN_PARTS = ["rgb", "label", "ptcloud"]


def fan_stereo():
    for ds in ["dataset1", "dataset2", "dataset3"]:
        for part in FAN_PARTS:
            api = f"https://api.github.com/repos/{FAN_REPO}/contents/{ds}/{part}"
            files = json.load(urllib.request.urlopen(api))
            out = RAW / "fan_stereo" / ds / part
            out.mkdir(parents=True, exist_ok=True)
            for f in files:
                dst = out / f["name"]
                if dst.exists() and dst.stat().st_size == f["size"]:
                    continue
                subprocess.run(["curl", "-sL", "--retry", "10", "-o", str(dst), f["download_url"]], check=True)
            print(ds, part, len(files), "files", flush=True)


def potholedepth():
    out = RAW / "potholedepth"
    out.mkdir(parents=True, exist_ok=True)
    subprocess.run(["curl", "-L", "-C", "-", "--retry", "20", "-o", str(out / "Potholes_Dataset.rar"),
                    "https://zenodo.org/api/records/15773442/files/Potholes_Dataset.rar/content"], check=True)


if __name__ == "__main__":
    which = sys.argv[1:] or ["potholedepth", "fan_stereo"]
    for w in which:
        globals()[w]()
