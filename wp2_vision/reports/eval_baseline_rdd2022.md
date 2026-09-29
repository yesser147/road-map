# Evaluation — `baseline_rdd2022`

Weights: `C:\Users\yasser\Documents\projet_integrer\wp2_vision\models\rdd2022_yolov8s.pt` · imgsz 640 · operating threshold conf ≥ 0.25 · median inference 8.3 ms/image (GPU, batch 1)

### Threshold sweep — all (defect classes)

| conf | precision | recall | manhole false alarms |
|---:|---:|---:|---:|
| 0.15 | 55.7 | 53.0 | 9.2 |
| 0.2 | 61.6 | 48.6 | 7.2 |
| 0.25 | 66.3 | 44.5 | 5.3 |
| 0.3 | 72.0 | 41.6 | 4.0 |
| 0.35 | 75.9 | 38.2 | 2.0 |
| 0.4 | 80.4 | 35.1 | 2.0 |
| 0.5 | 86.7 | 28.3 | 0.7 |
| 0.6 | 90.1 | 19.8 | 0.0 |
| 0.7 | 92.4 | 11.3 | 0.0 |

### Threshold sweep — day+dry (defect classes)

| conf | precision | recall | manhole false alarms |
|---:|---:|---:|---:|
| 0.15 | 54.5 | 50.3 | 11.3 |
| 0.2 | 59.9 | 45.8 | 9.4 |
| 0.25 | 64.3 | 41.9 | 7.5 |
| 0.3 | 70.3 | 39.1 | 5.7 |
| 0.35 | 74.2 | 35.6 | 2.8 |
| 0.4 | 79.0 | 32.6 | 2.8 |
| 0.5 | 85.3 | 25.7 | 0.9 |
| 0.6 | 88.8 | 17.8 | 0.0 |
| 0.7 | 91.0 | 9.6 | 0.0 |

## all  (1263 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 851 | 44.8 | 60.1 | 39.5 | 47.7 |
| transverse_crack | 363 | 37.5 | 61.9 | 35.8 | 45.4 |
| alligator_crack | 449 | 60.8 | 65.1 | 53.2 | 58.6 |
| pothole | 923 | 54.8 | 74.4 | 48.2 | 58.5 |
| manhole | 152 | 0.0 | — | 0.0 | — |

**Defects overall** — precision 66.3 %, recall 44.5 %, mAP50 49.5 %
**Manhole false-alarm rate** — 5.3 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## cracks_merged  (1263 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 1663 | 50.3 | 63.6 | 43.4 | 51.6 |
| pothole | 923 | 54.8 | 74.4 | 48.2 | 58.5 |
| manhole | 152 | 0.0 | — | 0.0 | — |

**Defects overall** — precision 67.3 %, recall 45.1 %, mAP50 52.6 %
**Manhole false-alarm rate** — 5.3 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## day+dry  (1022 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 754 | 44.4 | 59.6 | 38.9 | 47.0 |
| transverse_crack | 288 | 34.8 | 58.8 | 32.6 | 42.0 |
| alligator_crack | 372 | 59.7 | 64.5 | 53.2 | 58.3 |
| pothole | 670 | 49.3 | 72.2 | 43.0 | 53.9 |
| manhole | 106 | 0.0 | — | 0.0 | — |

**Defects overall** — precision 64.3 %, recall 41.9 %, mAP50 47.0 %
**Manhole false-alarm rate** — 7.5 % of 106 intact manholes flagged as defects (target ≤ 10 %)

## day+wet  (232 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 89 | 50.0 | 62.5 | 44.9 | 52.3 |
| transverse_crack | 66 | 49.7 | 69.6 | 48.5 | 57.1 |
| alligator_crack | 62 | 72.1 | 67.3 | 56.5 | 61.4 |
| pothole | 238 | 67.9 | 78.1 | 61.3 | 68.7 |
| manhole | 46 | 0.0 | — | 0.0 | — |

**Defects overall** — precision 72.5 %, recall 55.6 %, mAP50 59.9 %
**Manhole false-alarm rate** — 0.0 % of 46 intact manholes flagged as defects (target ≤ 10 %)

## light=day  (1254 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 843 | 44.8 | 59.9 | 39.5 | 47.6 |
| transverse_crack | 354 | 37.1 | 61.2 | 35.6 | 45.0 |
| alligator_crack | 434 | 61.4 | 64.9 | 53.7 | 58.8 |
| pothole | 908 | 54.2 | 74.1 | 47.8 | 58.1 |
| manhole | 152 | 0.0 | — | 0.0 | — |

**Defects overall** — precision 66.0 %, recall 44.4 %, mAP50 49.4 %
**Manhole false-alarm rate** — 5.3 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## light=night  (9 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 8 | 61.0 | 100.0 | 37.5 | 54.5 |
| transverse_crack | 9 | 63.5 | 100.0 | 44.4 | 61.5 |
| alligator_crack | 15 | 46.4 | 75.0 | 40.0 | 52.2 |
| pothole | 15 | 91.6 | 91.7 | 73.3 | 81.5 |

**Defects overall** — precision 88.9 %, recall 51.1 %, mAP50 65.6 %

## night+dry  (4 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 1 | 100.0 | 100.0 | 100.0 | 100.0 |
| transverse_crack | 3 | 33.3 | 100.0 | 33.3 | 50.0 |
| alligator_crack | 7 | 71.4 | 100.0 | 42.9 | 60.0 |
| pothole | 4 | 100.0 | 100.0 | 100.0 | 100.0 |

**Defects overall** — precision 100.0 %, recall 60.0 %, mAP50 76.2 %

## night+wet  (5 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 7 | 55.1 | 100.0 | 28.6 | 44.4 |
| transverse_crack | 6 | 83.3 | 100.0 | 50.0 | 66.7 |
| alligator_crack | 8 | 28.1 | 60.0 | 37.5 | 46.2 |
| pothole | 11 | 88.9 | 87.5 | 63.6 | 73.7 |

**Defects overall** — precision 83.3 %, recall 46.9 %, mAP50 63.9 %

## source=kaggle_rdd  (200 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 71 | 3.5 | 15.0 | 4.2 | 6.6 |
| transverse_crack | 85 | 0.5 | 0.0 | 0.0 | — |
| alligator_crack | 63 | 39.7 | 49.1 | 41.3 | 44.8 |
| pothole | 97 | 1.0 | 6.7 | 1.0 | 1.8 |
| manhole | 152 | 0.0 | — | 0.0 | — |

**Defects overall** — precision 33.3 %, recall 9.5 %, mAP50 11.2 %
**Manhole false-alarm rate** — 5.3 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## source=kent  (63 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 0 | — | 0.0 | — | — |
| transverse_crack | 0 | — | 0.0 | — | — |
| alligator_crack | 0 | — | 0.0 | — | — |
| pothole | 135 | 0.4 | 0.0 | 0.0 | — |

**Defects overall** — precision 0.0 %, recall 0.0 %, mAP50 0.4 %

## source=rdd2022  (1000 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 780 | 49.1 | 62.5 | 42.7 | 50.7 |
| transverse_crack | 278 | 49.2 | 62.8 | 46.8 | 53.6 |
| alligator_crack | 386 | 66.6 | 71.5 | 55.2 | 62.3 |
| pothole | 691 | 73.0 | 76.5 | 64.2 | 69.9 |

**Defects overall** — precision 69.2 %, recall 52.5 %, mAP50 59.5 %

## surface=dry  (1026 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 755 | 44.5 | 59.6 | 38.9 | 47.1 |
| transverse_crack | 291 | 34.7 | 59.0 | 32.6 | 42.0 |
| alligator_crack | 379 | 59.8 | 64.8 | 53.0 | 58.4 |
| pothole | 674 | 49.5 | 72.5 | 43.3 | 54.2 |
| manhole | 106 | 0.0 | — | 0.0 | — |

**Defects overall** — precision 64.5 %, recall 42.0 %, mAP50 47.1 %
**Manhole false-alarm rate** — 7.5 % of 106 intact manholes flagged as defects (target ≤ 10 %)

## surface=wet  (237 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 96 | 49.1 | 63.6 | 43.8 | 51.8 |
| transverse_crack | 72 | 51.4 | 71.4 | 48.6 | 57.9 |
| alligator_crack | 70 | 67.0 | 66.7 | 54.3 | 59.8 |
| pothole | 249 | 68.7 | 78.5 | 61.5 | 68.9 |
| manhole | 46 | 0.0 | — | 0.0 | — |

**Defects overall** — precision 73.0 %, recall 55.0 %, mAP50 59.1 %
**Manhole false-alarm rate** — 0.0 % of 46 intact manholes flagged as defects (target ≤ 10 %)
