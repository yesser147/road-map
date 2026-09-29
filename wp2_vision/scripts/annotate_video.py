"""Run the detector on a dashcam video and write an annotated MP4 (for demos / field checks).

Usage: python scripts/annotate_video.py data/raw/videos/Dashcam-Front.mp4 --out demo/dashcam_annotated.mp4 --stride 2
"""
import argparse
import sys
from pathlib import Path

import cv2
from tqdm import tqdm

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from roadvision.config import CLASSES  # noqa: E402
from roadvision.detector import Detector  # noqa: E402

COLORS = {0: (255, 170, 0), 1: (0, 200, 255), 2: (200, 0, 255), 3: (42, 42, 255), 4: (160, 160, 160)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--out", default=str(ROOT / "demo" / "annotated.mp4"))
    ap.add_argument("--weights", default=None)
    ap.add_argument("--conf", type=float, default=0.35)
    ap.add_argument("--stride", type=int, default=1, help="process every Nth frame")
    ap.add_argument("--max-seconds", type=float, default=0)
    a = ap.parse_args()

    det = Detector(a.weights, conf=a.conf)
    cap = cv2.VideoCapture(a.video)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if a.max_seconds:
        n = min(n, int(a.max_seconds * fps))
    out = cv2.VideoWriter(a.out, cv2.VideoWriter_fourcc(*"mp4v"), fps / a.stride, (w, h))
    for i in tqdm(range(n)):
        ok, frame = cap.read()
        if not ok:
            break
        if i % a.stride:
            continue
        for d in det(frame):
            x1, y1, x2, y2 = map(int, d.box)
            c = COLORS[d.class_id]
            cv2.rectangle(frame, (x1, y1), (x2, y2), c, 3)
            cv2.putText(frame, f"{CLASSES[d.class_id]['fr']} {d.confidence:.2f}", (x1, max(20, y1 - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, c, 2)
        out.write(frame)
    out.release()
    print("written", a.out)


if __name__ == "__main__":
    main()
