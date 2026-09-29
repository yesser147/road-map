"""Export the detector for mobile / CPU deployment (contract: "modèles quantifiés").

Produces in models/export/:
  roadvision_fp32.onnx         - reference, CPU/GPU via onnxruntime (WP4 server fallback)
  roadvision_int8.onnx         - dynamic INT8 quantisation (onnxruntime), ~4x smaller
  roadvision_int8.tflite       - full INT8 TFLite for Android (needs `pip install tensorflow`, optional)
and a model_card.json (classes, input size, preprocessing, sizes) = the "format de modèle" contract.

Usage: python scripts/export.py [--weights models/roadvision_best.pt] [--tflite]
"""
import argparse
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from roadvision.config import CLASSES, MODEL_VERSION  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--weights", default=str(ROOT / "models" / "roadvision_best.pt"))
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--tflite", action="store_true")
    ap.add_argument("--data", default=str(ROOT / "data" / "processed" / "roadvision" / "data.yaml"))
    a = ap.parse_args()

    from ultralytics import YOLO

    out = ROOT / "models" / "export"
    out.mkdir(parents=True, exist_ok=True)
    m = YOLO(a.weights)

    onnx_path = Path(m.export(format="onnx", imgsz=a.imgsz, opset=17, simplify=True, dynamic=False))
    fp32 = out / "roadvision_fp32.onnx"
    shutil.move(onnx_path, fp32)

    from onnxruntime.quantization import QuantType, quantize_dynamic
    int8 = out / "roadvision_int8.onnx"
    quantize_dynamic(str(fp32), str(int8), weight_type=QuantType.QUInt8)

    files = {"onnx_fp32": fp32, "onnx_int8": int8}
    if a.tflite:
        t = Path(m.export(format="tflite", imgsz=a.imgsz, int8=True, data=a.data))
        dst = out / "roadvision_int8.tflite"
        shutil.copy(t, dst)
        files["tflite_int8"] = dst

    card = {
        "name": "roadvision-detector", "version": MODEL_VERSION, "architecture": "YOLOv8s",
        "base": "dronefreak/rdd2022-yolov8s (RDD2022) fine-tuned on WP2 unified dataset",
        "input": {"shape": [1, 3, a.imgsz, a.imgsz], "layout": "NCHW", "color": "RGB", "scale": "0..1 (divide by 255)",
                  "resize": "letterbox to square, pad value 114"},
        "output": {"shape": [1, 4 + len(CLASSES), 8400], "format": "cx,cy,w,h + per-class scores, needs NMS (iou 0.5)"},
        "classes": {int(k): v for k, v in CLASSES.items()},
        "files": {k: {"path": str(v.relative_to(ROOT)).replace("\\", "/"), "size_mb": round(v.stat().st_size / 1e6, 2)} for k, v in files.items()},
        "license": "AGPL-3.0 (Ultralytics / base weights)",
    }
    (out / "model_card.json").write_text(json.dumps(card, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(card["files"], indent=2))


if __name__ == "__main__":
    main()
