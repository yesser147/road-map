# WP2 — Intelligence Artificielle : Vision

Road Map project · owner: **Yasser Saidani** · consumes data from WP1, feeds WP3 and WP4.

Detects road defects in images, estimates pothole depth, merges repeated detections of the same
defect, filters citizen photos, and exports quantised models for mid-range phones.

```
wp2_vision/
├── configs/classes.yaml              class taxonomy (ids are part of the model contract)
├── contracts/detection_event.schema.json   output format consumed by WP3/WP4 (JSON Schema)
├── src/roadvision/
│   ├── detector.py       YOLO wrapper (.pt / .onnx / .tflite), maps any checkpoint to our taxonomy
│   ├── pipeline.py       image -> DetectionEvent (filter -> detect -> depth -> severity -> embedding)
│   ├── depth.py          monocular pothole depth (Depth Anything V2 metric + camera-height calibration)
│   ├── clustering.py     one physical defect = one entity (GPS radius + appearance similarity)
│   ├── photo_filter.py   rejects blurry / dark / tiny / non-road citizen photos (OpenCV + CLIP)
│   ├── severity.py       documented severity rules (low / medium / high + score)
│   ├── schemas.py        Pydantic mirror of the JSON contract
│   └── api.py            FastAPI service + demo page
├── scripts/              download_data · select_rdd_subset · prepare_dataset · train · evaluate
│                         evaluate_depth · export · annotate_video
├── demo/index.html       small web front to show detections (served by the API at /)
├── models/               roadvision_best.pt (ours), rdd2022_yolov8s.pt (baseline), export/ (ONNX, INT8)
├── reports/              evaluation + ablation reports
└── tests/                contract tests (pytest)
```

## 1. Approach — reuse first, then fine-tune

Existing open models were surveyed before training anything:

| Candidate | Data | Classes | mAP50 (RDD2022 test) | Decision |
|---|---|---|---:|---|
| `dronefreak/rdd2022-yolov8s` | RDD2022, 26.9k img | 4 (3 cracks + pothole) | 61.5 | **base model** — best size/accuracy for phones |
| `dronefreak/rdd2022-yolov8m` | RDD2022 | 4 | 62.0 | +0.5 mAP for 2.3× the compute, not worth it on mobile |
| `dronefreak/rdd2022-rfdetr-*` | RDD2022 | 4 | 65.1 | transformer, poor mobile/INT8 tooling |
| `peterhdd/pothole-detection-yolov8`, `keremberke/yolov8m-pothole-segmentation` | small pothole sets | 1 | — | pothole only, no cracks / manholes |

No public model covers **manholes** (contract: ≤ 10 % false alarms on intact manholes), and the
RDD2022 baseline collapses on images unlike RDD2022 (close-up potholes, 640×360 vehicle frames: pothole
AP50 ≈ 1 % on those sources, see `reports/eval_baseline_rdd2022.md`). So the RDD2022 model is
**fine-tuned** on a merged dataset with a 5th class `manhole` (`is_defect=false`: detected explicitly so
that it is *never* reported as damage, and so the model learns what separates a manhole from a pothole).

## 2. Data

| Source | Use | Images kept |
|---|---|---:|
| RDD2022 (HF `dronefreak/RDD2022`, CC BY-SA 4.0) | replay set so crack classes are not forgotten; drone images excluded | 3000 / 600 / 1000 |
| Kaggle `lorenzoarcioni/road-damage-dataset-potholes-cracks-and-manholes` | manholes, potholes, generic cracks (vehicle camera, 640×360) | 2009 |
| Mendeley `tp95cdvgm8` (Univ. of Kent, CC BY 4.0) | close-up potholes, incl. water-filled ones | 713 |

Not used: `5bwfg4v4cd` (video segmentation masks), `6p52w7d5xd` (386 images, segmentation),
`kfth5g2xk3` Pothole Mix (2.8 GB RGB-D, useful later for depth validation).

Decisions worth knowing (all in `scripts/prepare_dataset.py`):
- **Crack subtypes for Kaggle**: that dataset only says “crack”. Each crack box gets the class of the
  best-overlapping prediction of the RDD2022 model; otherwise a shape rule (wide → transverse,
  large & compact → alligator, else longitudinal). Evaluation also reports `cracks_merged`.
- **No leakage**: Kaggle/Kent images are consecutive video frames → split by blocks of consecutive frames.
- **Conditions**: surface wet/dry of test images is tagged automatically with CLIP zero-shot;
  day/night by mean brightness. Public data has almost no night images (9 in test) — WP1 night captures
  are required to validate that condition.

Final dataset: train 5189 · val 870 · test 1263 images, 5 classes.

## 3. Results (test set, 1263 images, conf ≥ 0.25) — full details in `reports/WP2_report.md`

| | baseline RDD2022 | **delivered (v2)** |
|---|---:|---:|
| defects mAP50 | 49.5 | **52.1** |
| pothole AP50 | 54.8 | **63.6** |
| manhole AP50 | — | **64.9** |
| manhole false alarms (≤ 10 %) | 5.3 % | **7.2 %** |
| pothole AP50 on non-RDD sources (Kaggle / Kent) | 1.0 / 0.4 | **27.3 / 37.8** |
| day+dry precision (≥ 85 %) | 64.3 % | 62.0 % · **84.8 % at conf 0.6** |

Reports: `reports/ablation.md` (6 variants), `reports/eval_*.md` (per class / condition / source + threshold
sweep), `reports/benchmark_cpu.md`. Contract gaps and the plan to close them (WP1 local data) are in the report.

## 4. Run it

```bash
python -m venv .venv
.venv\Scripts\pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
.venv\Scripts\pip install -r requirements.txt

# demo + API (http://127.0.0.1:8002)
.venv\Scripts\uvicorn roadvision.api:app --app-dir src --port 8002
```

Reproduce training from scratch:
```bash
python scripts/download_data.py            # or select_rdd_subset.py for RDD2022 only
python scripts/prepare_dataset.py
python scripts/train.py --epochs 40
python scripts/evaluate.py --weights models/roadvision_best.pt --name finetuned
python scripts/export.py                   # ONNX fp32 + INT8 (+ --tflite for Android)
```

## 5. Integration with the other work packages

### WP4 — Platform (Tammem)
Call the HTTP service, store the returned `DetectionEvent`:
```bash
curl -F file=@road.jpg -F source=vehicle -F lat=36.8065 -F lon=10.1815 http://127.0.0.1:8002/v1/detect
```
- `detections[].is_defect == false` (manholes) → **do not create a defect**.
- `accepted == false` → citizen photo rejected, `rejection_reason` says why.
- `embedding` + GPS → send the batch to `POST /v1/cluster` (or call `clustering.cluster_observations`
  directly) to merge repeated passes into one defect entity (radius 8 m, cosine ≥ 0.80).
- Model metadata / taxonomy: `GET /v1/model`. Health: `GET /health`.

### WP3 — Language & Decision (Sarra)
Priority / cost inputs per detection: `class_name`, `severity` + `severity_score`, `depth_cm` (potholes),
`area_ratio` (size proxy), `confidence`. Severity rules are deterministic and documented in `severity.py`,
so the priority score decomposition can cite them.

### WP1 — Data & Capture (Yassine)
- Local annotations: YOLO txt with the ids of `configs/classes.yaml`; new contract classes
  (affaissement, dalle cassée, bordure cassée, …) get ids 5+ appended at the end, never reordering.
- Depth ground truth: CSV `image,depth_cm[,x1,y1,x2,y2][,hfov_deg]` → `scripts/evaluate_depth.py`.
- Capture: phone mounted at 1.2–1.5 m (the depth scale calibration assumes a known camera height).
- On-device model: `models/export/roadvision_int8.onnx` or `.tflite` + `model_card.json`
  (input 640×640 RGB 0–1 letterbox, output 1×9×8400, NMS IoU 0.5).

## 6. Licences
Ultralytics YOLOv8 and the base weights are **AGPL-3.0**; RDD2022 is CC BY-SA 4.0; Kent and Kaggle data
CC BY 4.0 / as stated on Kaggle. Keep this in mind for the deliverable handed to the Ministry (Art. 9.2).
