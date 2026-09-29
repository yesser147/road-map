# Evaluation — `onnx_fp32`

Weights: `C:\Users\yasser\Documents\projet_integrer\wp2_vision\models\export\roadvision_fp32.onnx` · imgsz 640 · operating threshold conf ≥ 0.25 · median inference 928.1 ms/image (GPU, batch 1)

### Threshold sweep — all (defect classes)

| conf | precision | recall | manhole false alarms |
|---:|---:|---:|---:|
| 0.15 | 51.8 | 58.2 | 20.4 |
| 0.2 | 58.0 | 54.2 | 14.5 |
| 0.25 | 63.0 | 50.8 | 7.2 |
| 0.3 | 66.5 | 47.1 | 4.0 |
| 0.35 | 70.3 | 43.7 | 2.6 |
| 0.4 | 73.9 | 40.3 | 1.3 |
| 0.5 | 80.4 | 33.9 | 0.7 |
| 0.6 | 85.8 | 26.9 | 0.0 |
| 0.7 | 90.7 | 17.1 | 0.0 |

### Threshold sweep — day+dry (defect classes)

| conf | precision | recall | manhole false alarms |
|---:|---:|---:|---:|
| 0.15 | 50.6 | 55.7 | 22.6 |
| 0.2 | 56.9 | 51.6 | 17.0 |
| 0.25 | 61.8 | 48.0 | 9.4 |
| 0.3 | 65.2 | 44.5 | 5.7 |
| 0.35 | 68.7 | 41.2 | 3.8 |
| 0.4 | 72.5 | 37.9 | 1.9 |
| 0.5 | 79.3 | 31.6 | 0.9 |
| 0.6 | 84.5 | 24.9 | 0.0 |
| 0.7 | 89.7 | 15.4 | 0.0 |

## all  (1263 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 851 | 43.8 | 58.7 | 41.8 | 48.8 |
| transverse_crack | 363 | 39.1 | 56.1 | 37.7 | 45.1 |
| alligator_crack | 449 | 61.8 | 64.0 | 59.5 | 61.7 |
| pothole | 923 | 63.5 | 67.8 | 59.9 | 63.6 |
| manhole | 152 | 64.8 | 67.8 | 67.8 | 67.8 |

**Defects overall** — precision 63.0 %, recall 50.8 %, mAP50 52.0 %
**Manhole false-alarm rate** — 7.2 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## cracks_merged  (1263 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 1663 | 51.3 | 62.2 | 47.4 | 53.8 |
| pothole | 923 | 63.5 | 67.8 | 59.9 | 63.6 |
| manhole | 152 | 64.8 | 67.8 | 67.8 | 67.8 |

**Defects overall** — precision 64.4 %, recall 51.9 %, mAP50 57.4 %
**Manhole false-alarm rate** — 7.2 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## day+dry  (1022 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 754 | 43.0 | 59.0 | 40.5 | 48.0 |
| transverse_crack | 288 | 37.1 | 54.8 | 35.8 | 43.3 |
| alligator_crack | 372 | 60.5 | 63.1 | 58.3 | 60.6 |
| pothole | 670 | 59.3 | 65.7 | 56.1 | 60.6 |
| manhole | 106 | 61.8 | 64.1 | 64.1 | 64.1 |

**Defects overall** — precision 61.8 %, recall 48.0 %, mAP50 50.0 %
**Manhole false-alarm rate** — 9.4 % of 106 intact manholes flagged as defects (target ≤ 10 %)

## day+wet  (232 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 89 | 53.7 | 56.5 | 53.9 | 55.2 |
| transverse_crack | 66 | 49.2 | 60.8 | 47.0 | 53.0 |
| alligator_crack | 62 | 73.1 | 66.7 | 67.7 | 67.2 |
| pothole | 238 | 73.5 | 71.7 | 69.3 | 70.5 |
| manhole | 46 | 73.8 | 76.1 | 76.1 | 76.1 |

**Defects overall** — precision 66.7 %, recall 62.9 %, mAP50 62.4 %
**Manhole false-alarm rate** — 2.2 % of 46 intact manholes flagged as defects (target ≤ 10 %)

## light=day  (1254 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 843 | 43.8 | 58.6 | 41.9 | 48.9 |
| transverse_crack | 354 | 38.9 | 56.1 | 37.9 | 45.2 |
| alligator_crack | 434 | 62.2 | 63.6 | 59.7 | 61.6 |
| pothole | 908 | 63.1 | 67.5 | 59.6 | 63.3 |
| manhole | 152 | 64.8 | 67.8 | 67.8 | 67.8 |

**Defects overall** — precision 62.8 %, recall 50.7 %, mAP50 52.0 %
**Manhole false-alarm rate** — 7.2 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## light=night  (9 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 8 | 48.8 | 60.0 | 37.5 | 46.2 |
| transverse_crack | 9 | 53.4 | 60.0 | 33.3 | 42.9 |
| alligator_crack | 15 | 53.4 | 80.0 | 53.3 | 64.0 |
| pothole | 15 | 89.2 | 92.3 | 80.0 | 85.7 |

**Defects overall** — precision 78.8 %, recall 55.3 %, mAP50 61.2 %

## night+dry  (4 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 1 | 100.0 | 50.0 | 100.0 | 66.7 |
| transverse_crack | 3 | 33.3 | 100.0 | 33.3 | 50.0 |
| alligator_crack | 7 | 71.4 | 100.0 | 57.1 | 72.7 |
| pothole | 4 | 100.0 | 100.0 | 100.0 | 100.0 |

**Defects overall** — precision 90.9 %, recall 66.7 %, mAP50 76.2 %

## night+wet  (5 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 7 | 52.1 | 66.7 | 28.6 | 40.0 |
| transverse_crack | 6 | 67.9 | 50.0 | 33.3 | 40.0 |
| alligator_crack | 8 | 42.5 | 66.7 | 50.0 | 57.1 |
| pothole | 11 | 86.2 | 88.9 | 72.7 | 80.0 |

**Defects overall** — precision 72.7 %, recall 50.0 %, mAP50 62.2 %

## source=kaggle_rdd  (200 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 71 | 6.9 | 33.3 | 4.2 | 7.5 |
| transverse_crack | 85 | 11.9 | 25.0 | 3.5 | 6.2 |
| alligator_crack | 63 | 50.9 | 52.6 | 47.6 | 50.0 |
| pothole | 97 | 27.3 | 49.0 | 25.8 | 33.8 |
| manhole | 152 | 65.1 | 69.6 | 67.8 | 68.7 |

**Defects overall** — precision 47.3 %, recall 19.3 %, mAP50 24.3 %
**Manhole false-alarm rate** — 7.2 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## source=kent  (63 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| pothole | 135 | 37.3 | 55.2 | 39.3 | 45.9 |

**Defects overall** — precision 55.2 %, recall 39.3 %, mAP50 37.3 %

## source=rdd2022  (1000 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 780 | 46.7 | 59.0 | 45.3 | 51.2 |
| transverse_crack | 278 | 46.7 | 57.8 | 48.2 | 52.5 |
| alligator_crack | 386 | 63.5 | 65.8 | 61.4 | 63.5 |
| pothole | 691 | 72.0 | 71.1 | 68.7 | 69.9 |
| manhole | 0 | — | 0.0 | — | — |

**Defects overall** — precision 64.5 %, recall 56.2 %, mAP50 57.2 %

## surface=dry  (1026 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 755 | 43.0 | 59.0 | 40.5 | 48.0 |
| transverse_crack | 291 | 37.0 | 55.0 | 35.7 | 43.3 |
| alligator_crack | 379 | 60.6 | 63.5 | 58.3 | 60.8 |
| pothole | 674 | 59.5 | 66.0 | 56.4 | 60.8 |
| manhole | 106 | 61.8 | 64.1 | 64.1 | 64.1 |

**Defects overall** — precision 62.0 %, recall 48.2 %, mAP50 50.0 %
**Manhole false-alarm rate** — 9.4 % of 106 intact manholes flagged as defects (target ≤ 10 %)

## surface=wet  (237 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 96 | 52.3 | 56.8 | 52.1 | 54.4 |
| transverse_crack | 72 | 50.1 | 60.0 | 45.8 | 52.0 |
| alligator_crack | 70 | 69.1 | 66.7 | 65.7 | 66.2 |
| pothole | 249 | 73.9 | 72.4 | 69.5 | 70.9 |
| manhole | 46 | 73.8 | 76.1 | 76.1 | 76.1 |

**Defects overall** — precision 67.0 %, recall 62.0 %, mAP50 61.4 %
**Manhole false-alarm rate** — 2.2 % of 46 intact manholes flagged as defects (target ≤ 10 %)
