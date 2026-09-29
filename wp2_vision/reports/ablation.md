# Ablation study — WP2 detector

Same test set for every row (1263 images: RDD2022 subset, Kaggle, Kent). Threshold conf ≥ 0.25.
Precision/recall are on defect classes (manhole excluded). *Day+dry precision* is the contract criterion (≥ 85 %), *manhole FA* the share of intact manholes flagged as defects (≤ 10 %).
*ms/img*: rows A–C on GPU (PyTorch), D–E on CPU (onnxruntime) — see benchmark_cpu.md for a like-for-like CPU comparison.

| | variant | size MB | ms/img | mAP50 defects | precision | recall | day+dry precision | pothole AP50 | manhole AP50 | manhole FA |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| A | RDD2022 pretrained, no fine-tuning | 22.5 | 8.3 | 49.5 | 66.3 | 44.5 | 64.3 | 54.8 | 0.0 | 5.3 |
| B1 | fine-tuned, all layers, lr 1e-3, 40 ep | 22.5 | 8.4 | 47.4 | 59.6 | 50.0 | 58.1 | 61.2 | 70.8 | 9.9 |
| B2 | **fine-tuned, backbone frozen (10 layers), lr 3e-4, 25 ep — delivered** | 22.5 | 18.2 | 52.1 | 63.3 | 51.0 | 62.0 | 63.6 | 64.9 | 7.2 |
| C | B2 with 480 px input | 22.5 | 25.0 | 49.9 | 65.5 | 47.2 | 64.6 | 62.6 | 61.4 | 7.9 |
| D | B2 exported to ONNX FP32 | 44.8 | 928.1 | 52.0 | 63.0 | 50.8 | 61.8 | 63.5 | 64.8 | 7.2 |
| E | B2 ONNX dynamic INT8 (mobile) | 11.5 | 1534.6 | 51.8 | 63.9 | 49.7 | 62.5 | 62.9 | 64.3 | 6.6 |

Per-source AP50 (pothole) — shows the domain-gap effect of fine-tuning:

| | rdd2022 | kaggle | kent |
|---|---:|---:|---:|
| A | 73.0 | 1.0 | 0.4 |
| B1 | 68.6 | 35.7 | 42.1 |
| B2 | 72.0 | 27.3 | 37.8 |
| C | 71.7 | 25.4 | 38.5 |
| D | 72.0 | 27.3 | 37.3 |
| E | 71.4 | 28.9 | 36.8 |