"""CPU latency benchmark (proxy for a mid-range phone) -> reports/benchmark_cpu.md

Measures median single-image latency on CPU, 4 threads, for the PyTorch model at 640/480 px and the
ONNX FP32 / INT8 exports. Phones run the INT8 TFLite/NNAPI version, typically 2-4x faster than these
numbers on a modern mid-range SoC; the ranking between variants is what matters here.
"""
import sys
import time
from pathlib import Path

import cv2
import numpy as np
import torch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from roadvision.detector import Detector  # noqa: E402

torch.set_num_threads(4)
VARIANTS = [
    ("PyTorch FP32 640", "models/roadvision_best.pt", 640),
    ("PyTorch FP32 480", "models/roadvision_best.pt", 480),
    ("ONNX FP32 640", "models/export/roadvision_fp32.onnx", 640),
    ("ONNX INT8 640", "models/export/roadvision_int8.onnx", 640),
]


def main():
    imgs = [cv2.imread(str(p)) for p in sorted((ROOT / "demo" / "samples").glob("*.jpg"))]
    rows = ["# CPU latency (4 threads, batch 1)", "", "| variant | file MB | median ms | p90 ms |", "|---|---:|---:|---:|"]
    for name, w, sz in VARIANTS:
        wp = ROOT / w
        if not wp.exists():
            continue
        det = Detector(wp, imgsz=sz, device="cpu")
        for im in imgs[:3]:
            det(im)  # warm-up
        t = []
        for _ in range(3):
            for im in imgs:
                t0 = time.perf_counter(); det(im); t.append((time.perf_counter() - t0) * 1000)
        rows.append(f"| {name} | {wp.stat().st_size / 1e6:.1f} | {np.median(t):.0f} | {np.percentile(t, 90):.0f} |")
        print(rows[-1])
    (ROOT / "reports" / "benchmark_cpu.md").write_text("\n".join(rows), encoding="utf-8")


if __name__ == "__main__":
    main()
