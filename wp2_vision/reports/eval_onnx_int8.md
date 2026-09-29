# Evaluation — `onnx_int8`

Weights: `C:\Users\yasser\Documents\projet_integrer\wp2_vision\models\export\roadvision_int8.onnx` · imgsz 640 · operating threshold conf ≥ 0.25 · median inference 1534.6 ms/image (GPU, batch 1)

### Threshold sweep — all (defect classes)

| conf | precision | recall | manhole false alarms |
|---:|---:|---:|---:|
| 0.15 | 52.8 | 56.8 | 20.4 |
| 0.2 | 58.9 | 53.1 | 14.5 |
| 0.25 | 63.9 | 49.7 | 6.6 |
| 0.3 | 68.1 | 45.5 | 4.6 |
| 0.35 | 71.4 | 42.1 | 3.3 |
| 0.4 | 75.2 | 39.3 | 1.3 |
| 0.5 | 81.3 | 32.6 | 0.0 |
| 0.6 | 86.6 | 24.2 | 0.0 |
| 0.7 | 91.1 | 15.0 | 0.0 |

### Threshold sweep — day+dry (defect classes)

| conf | precision | recall | manhole false alarms |
|---:|---:|---:|---:|
| 0.15 | 51.8 | 54.1 | 23.6 |
| 0.2 | 57.9 | 50.4 | 17.0 |
| 0.25 | 62.5 | 46.9 | 8.5 |
| 0.3 | 66.7 | 42.9 | 5.7 |
| 0.35 | 70.5 | 39.8 | 4.7 |
| 0.4 | 73.9 | 37.0 | 1.9 |
| 0.5 | 80.2 | 30.3 | 0.0 |
| 0.6 | 85.4 | 22.1 | 0.0 |
| 0.7 | 90.3 | 13.9 | 0.0 |

## all  (1263 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 851 | 44.3 | 60.2 | 41.4 | 49.0 |
| transverse_crack | 363 | 38.1 | 56.8 | 36.9 | 44.7 |
| alligator_crack | 449 | 61.7 | 64.8 | 57.5 | 60.9 |
| pothole | 923 | 62.9 | 68.2 | 58.6 | 63.0 |
| manhole | 152 | 64.3 | 69.4 | 67.1 | 68.2 |

**Defects overall** — precision 63.9 %, recall 49.7 %, mAP50 51.8 %
**Manhole false-alarm rate** — 6.6 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## cracks_merged  (1263 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 1663 | 51.4 | 63.2 | 46.4 | 53.5 |
| pothole | 923 | 62.9 | 68.2 | 58.6 | 63.0 |
| manhole | 152 | 64.3 | 69.4 | 67.1 | 68.2 |

**Defects overall** — precision 65.2 %, recall 50.7 %, mAP50 57.2 %
**Manhole false-alarm rate** — 6.6 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## day+dry  (1022 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 754 | 43.6 | 60.3 | 39.9 | 48.0 |
| transverse_crack | 288 | 35.6 | 54.4 | 34.7 | 42.4 |
| alligator_crack | 372 | 60.4 | 64.1 | 56.2 | 59.9 |
| pothole | 670 | 59.0 | 66.3 | 54.9 | 60.1 |
| manhole | 106 | 61.3 | 64.8 | 64.1 | 64.5 |

**Defects overall** — precision 62.5 %, recall 46.9 %, mAP50 49.7 %
**Manhole false-alarm rate** — 8.5 % of 106 intact manholes flagged as defects (target ≤ 10 %)

## day+wet  (232 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 89 | 53.2 | 59.3 | 53.9 | 56.5 |
| transverse_crack | 66 | 51.3 | 66.0 | 47.0 | 54.9 |
| alligator_crack | 62 | 73.1 | 66.1 | 66.1 | 66.1 |
| pothole | 238 | 72.5 | 71.6 | 67.7 | 69.5 |
| manhole | 46 | 73.2 | 81.0 | 73.9 | 77.3 |

**Defects overall** — precision 67.7 %, recall 61.8 %, mAP50 62.5 %
**Manhole false-alarm rate** — 2.2 % of 46 intact manholes flagged as defects (target ≤ 10 %)

## light=day  (1254 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 843 | 44.3 | 60.2 | 41.4 | 49.0 |
| transverse_crack | 354 | 37.9 | 56.7 | 37.0 | 44.8 |
| alligator_crack | 434 | 62.2 | 64.4 | 57.6 | 60.8 |
| pothole | 908 | 62.6 | 67.8 | 58.3 | 62.7 |
| manhole | 152 | 64.3 | 69.4 | 67.1 | 68.2 |

**Defects overall** — precision 63.6 %, recall 49.6 %, mAP50 51.7 %
**Manhole false-alarm rate** — 6.6 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## light=night  (9 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 8 | 55.7 | 60.0 | 37.5 | 46.2 |
| transverse_crack | 9 | 49.4 | 60.0 | 33.3 | 42.9 |
| alligator_crack | 15 | 51.0 | 80.0 | 53.3 | 64.0 |
| pothole | 15 | 87.5 | 92.3 | 80.0 | 85.7 |

**Defects overall** — precision 78.8 %, recall 55.3 %, mAP50 60.9 %

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
| longitudinal_crack | 7 | 54.5 | 66.7 | 28.6 | 40.0 |
| transverse_crack | 6 | 59.3 | 50.0 | 33.3 | 40.0 |
| alligator_crack | 8 | 39.6 | 66.7 | 50.0 | 57.1 |
| pothole | 11 | 85.1 | 88.9 | 72.7 | 80.0 |

**Defects overall** — precision 72.7 %, recall 50.0 %, mAP50 59.6 %

## source=kaggle_rdd  (200 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 71 | 7.5 | 22.2 | 2.8 | 5.0 |
| transverse_crack | 85 | 12.0 | 35.7 | 5.9 | 10.1 |
| alligator_crack | 63 | 50.0 | 54.5 | 47.6 | 50.8 |
| pothole | 97 | 28.9 | 53.5 | 23.7 | 32.9 |
| manhole | 152 | 64.5 | 70.3 | 67.1 | 68.7 |

**Defects overall** — precision 49.6 %, recall 19.0 %, mAP50 24.6 %
**Manhole false-alarm rate** — 6.6 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## source=kent  (63 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| pothole | 135 | 36.8 | 55.2 | 39.3 | 45.9 |

**Defects overall** — precision 55.2 %, recall 39.3 %, mAP50 36.8 %

## source=rdd2022  (1000 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 780 | 47.3 | 60.8 | 44.9 | 51.6 |
| transverse_crack | 278 | 45.0 | 58.1 | 46.4 | 51.6 |
| alligator_crack | 386 | 63.7 | 66.5 | 59.1 | 62.5 |
| pothole | 691 | 71.4 | 71.1 | 67.3 | 69.1 |
| manhole | 0 | — | 0.0 | — | — |

**Defects overall** — precision 65.3 %, recall 54.9 %, mAP50 56.8 %

## surface=dry  (1026 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 755 | 43.6 | 60.3 | 40.0 | 48.1 |
| transverse_crack | 291 | 35.5 | 54.6 | 34.7 | 42.4 |
| alligator_crack | 379 | 60.4 | 64.5 | 56.2 | 60.1 |
| pothole | 674 | 59.2 | 66.5 | 55.2 | 60.3 |
| manhole | 106 | 61.3 | 64.8 | 64.1 | 64.5 |

**Defects overall** — precision 62.7 %, recall 47.1 %, mAP50 49.7 %
**Manhole false-alarm rate** — 8.5 % of 106 intact manholes flagged as defects (target ≤ 10 %)

## surface=wet  (237 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 96 | 52.0 | 59.5 | 52.1 | 55.6 |
| transverse_crack | 72 | 51.6 | 64.7 | 45.8 | 53.7 |
| alligator_crack | 70 | 69.3 | 66.2 | 64.3 | 65.2 |
| pothole | 249 | 73.0 | 72.2 | 67.9 | 70.0 |
| manhole | 46 | 73.2 | 81.0 | 73.9 | 77.3 |

**Defects overall** — precision 68.0 %, recall 61.0 %, mAP50 61.5 %
**Manhole false-alarm rate** — 2.2 % of 46 intact manholes flagged as defects (target ≤ 10 %)
