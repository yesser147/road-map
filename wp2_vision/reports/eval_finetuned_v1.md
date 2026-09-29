# Evaluation — `finetuned`

Weights: `C:\Users\yasser\Documents\projet_integrer\wp2_vision\models\roadvision_best.pt` · imgsz 640 · operating threshold conf ≥ 0.25 · median inference 8.4 ms/image (GPU, batch 1)

### Threshold sweep — all (defect classes)

| conf | precision | recall | manhole false alarms |
|---:|---:|---:|---:|
| 0.15 | 48.6 | 56.2 | 19.1 |
| 0.2 | 54.1 | 52.9 | 15.1 |
| 0.25 | 59.6 | 50.0 | 9.9 |
| 0.3 | 63.3 | 46.9 | 6.6 |
| 0.35 | 66.9 | 44.0 | 3.3 |
| 0.4 | 70.5 | 40.7 | 2.0 |
| 0.5 | 77.0 | 34.5 | 0.7 |
| 0.6 | 83.2 | 26.9 | 0.0 |
| 0.7 | 88.2 | 18.2 | 0.0 |

### Threshold sweep — day+dry (defect classes)

| conf | precision | recall | manhole false alarms |
|---:|---:|---:|---:|
| 0.15 | 46.8 | 54.0 | 20.8 |
| 0.2 | 52.3 | 50.7 | 17.0 |
| 0.25 | 58.1 | 47.8 | 10.4 |
| 0.3 | 62.1 | 45.1 | 6.6 |
| 0.35 | 66.0 | 42.5 | 3.8 |
| 0.4 | 69.4 | 39.2 | 2.8 |
| 0.5 | 75.7 | 32.4 | 0.9 |
| 0.6 | 82.0 | 24.9 | 0.0 |
| 0.7 | 87.2 | 16.8 | 0.0 |

## all  (1263 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 851 | 41.6 | 57.7 | 40.4 | 47.5 |
| transverse_crack | 363 | 33.7 | 50.0 | 36.1 | 41.9 |
| alligator_crack | 449 | 52.9 | 59.3 | 55.5 | 57.3 |
| pothole | 923 | 61.2 | 63.9 | 61.5 | 62.7 |
| manhole | 152 | 70.8 | 71.7 | 71.7 | 71.7 |

**Defects overall** — precision 59.6 %, recall 50.0 %, mAP50 47.4 %
**Manhole false-alarm rate** — 9.9 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## cracks_merged  (1263 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 1663 | 46.4 | 59.2 | 45.5 | 51.5 |
| pothole | 923 | 61.2 | 63.9 | 61.5 | 62.7 |
| manhole | 152 | 70.8 | 71.7 | 71.7 | 71.7 |

**Defects overall** — precision 61.1 %, recall 51.2 %, mAP50 53.8 %
**Manhole false-alarm rate** — 9.9 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## day+dry  (1022 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 754 | 40.8 | 57.4 | 39.8 | 47.0 |
| transverse_crack | 288 | 32.0 | 50.3 | 33.7 | 40.3 |
| alligator_crack | 372 | 51.1 | 57.0 | 53.8 | 55.3 |
| pothole | 670 | 58.2 | 61.7 | 59.7 | 60.7 |
| manhole | 106 | 65.4 | 70.0 | 66.0 | 68.0 |

**Defects overall** — precision 58.1 %, recall 47.8 %, mAP50 45.5 %
**Manhole false-alarm rate** — 10.4 % of 106 intact manholes flagged as defects (target ≤ 10 %)

## day+wet  (232 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 89 | 49.5 | 59.4 | 46.1 | 51.9 |
| transverse_crack | 66 | 42.8 | 48.4 | 47.0 | 47.7 |
| alligator_crack | 62 | 68.6 | 70.0 | 67.7 | 68.8 |
| pothole | 238 | 69.6 | 69.1 | 66.8 | 68.0 |
| manhole | 46 | 83.4 | 75.0 | 84.8 | 79.6 |

**Defects overall** — precision 64.5 %, recall 60.0 %, mAP50 57.6 %
**Manhole false-alarm rate** — 8.7 % of 46 intact manholes flagged as defects (target ≤ 10 %)

## light=day  (1254 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 843 | 41.6 | 57.6 | 40.5 | 47.5 |
| transverse_crack | 354 | 33.7 | 49.8 | 36.2 | 41.9 |
| alligator_crack | 434 | 53.6 | 58.9 | 55.8 | 57.3 |
| pothole | 908 | 61.0 | 63.7 | 61.6 | 62.6 |
| manhole | 152 | 70.8 | 71.7 | 71.7 | 71.7 |

**Defects overall** — precision 59.4 %, recall 50.0 %, mAP50 47.5 %
**Manhole false-alarm rate** — 9.9 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## light=night  (9 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 8 | 54.8 | 75.0 | 37.5 | 50.0 |
| transverse_crack | 9 | 38.1 | 60.0 | 33.3 | 42.9 |
| alligator_crack | 15 | 38.0 | 77.8 | 46.7 | 58.3 |
| pothole | 15 | 80.3 | 81.8 | 60.0 | 69.2 |

**Defects overall** — precision 75.9 %, recall 46.8 %, mAP50 52.8 %

## night+dry  (4 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 1 | 100.0 | 100.0 | 100.0 | 100.0 |
| transverse_crack | 3 | 33.3 | 100.0 | 33.3 | 50.0 |
| alligator_crack | 7 | 71.4 | 100.0 | 71.4 | 83.3 |
| pothole | 4 | 95.0 | 100.0 | 50.0 | 66.7 |

**Defects overall** — precision 100.0 %, recall 60.0 %, mAP50 74.9 %

## night+wet  (5 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 7 | 50.7 | 66.7 | 28.6 | 40.0 |
| transverse_crack | 6 | 41.0 | 50.0 | 33.3 | 40.0 |
| alligator_crack | 8 | 14.3 | 50.0 | 25.0 | 33.3 |
| pothole | 11 | 77.2 | 77.8 | 63.6 | 70.0 |

**Defects overall** — precision 65.0 %, recall 40.6 %, mAP50 45.8 %

## source=kaggle_rdd  (200 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 71 | 12.3 | 20.5 | 11.3 | 14.5 |
| transverse_crack | 85 | 11.8 | 32.4 | 14.1 | 19.7 |
| alligator_crack | 63 | 41.2 | 50.0 | 50.8 | 50.4 |
| pothole | 97 | 35.7 | 53.7 | 29.9 | 38.4 |
| manhole | 152 | 70.9 | 71.7 | 71.7 | 71.7 |

**Defects overall** — precision 41.8 %, recall 25.6 %, mAP50 25.3 %
**Manhole false-alarm rate** — 9.9 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## source=kent  (63 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| alligator_crack | 0 | — | 0.0 | — | — |
| pothole | 135 | 42.1 | 56.1 | 40.7 | 47.2 |

**Defects overall** — precision 55.6 %, recall 40.7 %, mAP50 42.1 %

## source=rdd2022  (1000 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 780 | 44.4 | 60.3 | 43.1 | 50.3 |
| transverse_crack | 278 | 40.1 | 52.9 | 42.8 | 47.3 |
| alligator_crack | 386 | 54.9 | 61.1 | 56.2 | 58.6 |
| pothole | 691 | 68.6 | 65.7 | 70.0 | 67.8 |

**Defects overall** — precision 61.7 %, recall 54.1 %, mAP50 52.0 %

## surface=dry  (1026 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 755 | 40.8 | 57.4 | 39.9 | 47.1 |
| transverse_crack | 291 | 32.0 | 50.5 | 33.7 | 40.4 |
| alligator_crack | 379 | 51.3 | 57.6 | 54.1 | 55.8 |
| pothole | 674 | 58.3 | 61.9 | 59.6 | 60.7 |
| manhole | 106 | 65.4 | 70.0 | 66.0 | 68.0 |

**Defects overall** — precision 58.4 %, recall 47.9 %, mAP50 45.6 %
**Manhole false-alarm rate** — 10.4 % of 106 intact manholes flagged as defects (target ≤ 10 %)

## surface=wet  (237 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 96 | 48.6 | 59.7 | 44.8 | 51.2 |
| transverse_crack | 72 | 42.0 | 48.5 | 45.8 | 47.1 |
| alligator_crack | 70 | 61.7 | 68.8 | 62.9 | 65.7 |
| pothole | 249 | 69.7 | 69.5 | 66.7 | 68.0 |
| manhole | 46 | 83.4 | 75.0 | 84.8 | 79.6 |

**Defects overall** — precision 64.6 %, recall 58.7 %, mAP50 55.5 %
**Manhole false-alarm rate** — 8.7 % of 46 intact manholes flagged as defects (target ≤ 10 %)
