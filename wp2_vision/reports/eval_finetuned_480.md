# Evaluation — `finetuned_480`

Weights: `C:\Users\yasser\Documents\projet_integrer\wp2_vision\models\roadvision_best.pt` · imgsz 480 · operating threshold conf ≥ 0.25 · median inference 25.0 ms/image (GPU, batch 1)

### Threshold sweep — all (defect classes)

| conf | precision | recall | manhole false alarms |
|---:|---:|---:|---:|
| 0.15 | 53.7 | 54.4 | 23.7 |
| 0.2 | 60.3 | 50.7 | 15.1 |
| 0.25 | 65.5 | 47.2 | 7.9 |
| 0.3 | 70.1 | 44.0 | 5.3 |
| 0.35 | 74.0 | 40.8 | 4.6 |
| 0.4 | 76.9 | 37.9 | 3.3 |
| 0.5 | 82.0 | 31.0 | 0.0 |
| 0.6 | 86.8 | 24.1 | 0.0 |
| 0.7 | 90.3 | 15.1 | 0.0 |

### Threshold sweep — day+dry (defect classes)

| conf | precision | recall | manhole false alarms |
|---:|---:|---:|---:|
| 0.15 | 52.8 | 52.0 | 26.4 |
| 0.2 | 59.6 | 48.1 | 16.0 |
| 0.25 | 64.6 | 44.5 | 9.4 |
| 0.3 | 69.2 | 41.5 | 5.7 |
| 0.35 | 73.8 | 38.4 | 4.7 |
| 0.4 | 76.6 | 35.6 | 3.8 |
| 0.5 | 81.1 | 28.8 | 0.0 |
| 0.6 | 86.6 | 22.4 | 0.0 |
| 0.7 | 89.3 | 13.7 | 0.0 |

## all  (1263 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 851 | 42.1 | 61.6 | 36.4 | 45.8 |
| transverse_crack | 363 | 35.6 | 53.9 | 33.9 | 41.6 |
| alligator_crack | 449 | 59.1 | 65.1 | 55.7 | 60.0 |
| pothole | 923 | 62.6 | 71.7 | 58.2 | 64.2 |
| manhole | 152 | 61.4 | 73.6 | 58.6 | 65.2 |

**Defects overall** — precision 65.5 %, recall 47.2 %, mAP50 49.9 %
**Manhole false-alarm rate** — 7.9 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## cracks_merged  (1263 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 1663 | 48.6 | 63.3 | 42.4 | 50.8 |
| pothole | 923 | 62.6 | 71.7 | 58.2 | 64.2 |
| manhole | 152 | 61.4 | 73.6 | 58.6 | 65.2 |

**Defects overall** — precision 66.7 %, recall 48.1 %, mAP50 55.6 %
**Manhole false-alarm rate** — 7.9 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## day+dry  (1022 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 754 | 41.2 | 62.5 | 34.9 | 44.8 |
| transverse_crack | 288 | 32.6 | 51.4 | 30.9 | 38.6 |
| alligator_crack | 372 | 58.9 | 64.4 | 55.4 | 59.5 |
| pothole | 670 | 59.7 | 70.8 | 55.2 | 62.0 |
| manhole | 106 | 64.0 | 74.7 | 58.5 | 65.6 |

**Defects overall** — precision 64.6 %, recall 44.5 %, mAP50 48.1 %
**Manhole false-alarm rate** — 9.4 % of 106 intact manholes flagged as defects (target ≤ 10 %)

## day+wet  (232 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 89 | 50.4 | 58.2 | 51.7 | 54.8 |
| transverse_crack | 66 | 48.8 | 61.2 | 45.5 | 52.2 |
| alligator_crack | 62 | 64.7 | 66.7 | 58.1 | 62.1 |
| pothole | 238 | 70.0 | 73.2 | 65.5 | 69.2 |
| manhole | 46 | 57.4 | 71.0 | 58.7 | 64.3 |

**Defects overall** — precision 67.8 %, recall 58.9 %, mAP50 58.5 %
**Manhole false-alarm rate** — 4.3 % of 46 intact manholes flagged as defects (target ≤ 10 %)

## light=day  (1254 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 843 | 42.2 | 61.8 | 36.6 | 46.0 |
| transverse_crack | 354 | 35.4 | 53.6 | 33.6 | 41.3 |
| alligator_crack | 434 | 59.6 | 64.7 | 55.8 | 59.9 |
| pothole | 908 | 62.4 | 71.5 | 57.9 | 64.0 |
| manhole | 152 | 61.4 | 73.6 | 58.6 | 65.2 |

**Defects overall** — precision 65.3 %, recall 47.1 %, mAP50 49.9 %
**Manhole false-alarm rate** — 7.9 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## light=night  (9 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 8 | 35.0 | 33.3 | 12.5 | 18.2 |
| transverse_crack | 9 | 50.0 | 66.7 | 44.4 | 53.3 |
| alligator_crack | 15 | 47.0 | 80.0 | 53.3 | 64.0 |
| pothole | 15 | 78.4 | 84.6 | 73.3 | 78.6 |

**Defects overall** — precision 75.0 %, recall 51.1 %, mAP50 52.6 %

## night+dry  (4 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 1 | 50.0 | 50.0 | 100.0 | 66.7 |
| transverse_crack | 3 | 33.3 | 100.0 | 33.3 | 50.0 |
| alligator_crack | 7 | 57.1 | 100.0 | 57.1 | 72.7 |
| pothole | 4 | 75.0 | 75.0 | 75.0 | 75.0 |

**Defects overall** — precision 81.8 %, recall 60.0 %, mAP50 53.9 %

## night+wet  (5 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 7 | 45.2 | 0.0 | 0.0 | — |
| transverse_crack | 6 | 59.0 | 60.0 | 50.0 | 54.5 |
| alligator_crack | 8 | 42.5 | 66.7 | 50.0 | 57.1 |
| pothole | 11 | 82.8 | 88.9 | 72.7 | 80.0 |

**Defects overall** — precision 71.4 %, recall 46.9 %, mAP50 57.4 %

## source=kaggle_rdd  (200 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 71 | 6.7 | 50.0 | 2.8 | 5.3 |
| transverse_crack | 85 | 11.5 | 33.3 | 2.4 | 4.4 |
| alligator_crack | 63 | 40.7 | 53.1 | 27.0 | 35.8 |
| pothole | 97 | 25.4 | 47.5 | 19.6 | 27.7 |
| manhole | 152 | 62.9 | 76.7 | 58.6 | 66.4 |

**Defects overall** — precision 48.8 %, recall 12.7 %, mAP50 21.1 %
**Manhole false-alarm rate** — 7.9 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## source=kent  (63 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| pothole | 135 | 38.5 | 58.1 | 37.0 | 45.2 |

**Defects overall** — precision 58.1 %, recall 37.0 %, mAP50 38.5 %

## source=rdd2022  (1000 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 780 | 45.1 | 61.7 | 39.5 | 48.2 |
| transverse_crack | 278 | 41.8 | 54.5 | 43.5 | 48.4 |
| alligator_crack | 386 | 62.0 | 66.2 | 60.4 | 63.1 |
| pothole | 691 | 71.7 | 75.1 | 67.7 | 71.2 |
| manhole | 0 | — | 0.0 | — | — |

**Defects overall** — precision 66.6 %, recall 52.9 %, mAP50 55.1 %

## surface=dry  (1026 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 755 | 41.2 | 62.4 | 35.0 | 44.8 |
| transverse_crack | 291 | 32.5 | 51.7 | 30.9 | 38.7 |
| alligator_crack | 379 | 58.8 | 64.8 | 55.4 | 59.7 |
| pothole | 674 | 59.8 | 70.8 | 55.3 | 62.1 |
| manhole | 106 | 64.0 | 74.7 | 58.5 | 65.6 |

**Defects overall** — precision 64.7 %, recall 44.6 %, mAP50 48.1 %
**Manhole false-alarm rate** — 9.4 % of 106 intact manholes flagged as defects (target ≤ 10 %)

## surface=wet  (237 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 96 | 49.0 | 57.5 | 47.9 | 52.3 |
| transverse_crack | 72 | 49.1 | 61.1 | 45.8 | 52.4 |
| alligator_crack | 70 | 61.7 | 66.7 | 57.1 | 61.5 |
| pothole | 249 | 70.5 | 73.9 | 65.9 | 69.6 |
| manhole | 46 | 57.4 | 71.0 | 58.7 | 64.3 |

**Defects overall** — precision 68.0 %, recall 58.1 %, mAP50 57.6 %
**Manhole false-alarm rate** — 4.3 % of 46 intact manholes flagged as defects (target ≤ 10 %)
