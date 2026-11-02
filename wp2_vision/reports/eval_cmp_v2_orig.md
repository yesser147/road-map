# Evaluation — `cmp_v2_orig`

Weights: `models/roadvision_best.pt` · imgsz 640 · operating threshold conf ≥ 0.25 · median inference 10.7 ms/image (GPU, batch 1)

### Threshold sweep — all (defect classes)

| conf | precision | recall | manhole false alarms |
|---:|---:|---:|---:|
| 0.15 | 51.8 | 58.4 | 22.4 |
| 0.2 | 58.2 | 54.2 | 14.5 |
| 0.25 | 63.3 | 51.0 | 7.2 |
| 0.3 | 66.8 | 47.2 | 4.0 |
| 0.35 | 70.4 | 43.7 | 3.3 |
| 0.4 | 73.9 | 40.3 | 1.3 |
| 0.5 | 79.9 | 34.0 | 0.7 |
| 0.6 | 86.1 | 27.0 | 0.0 |
| 0.7 | 90.9 | 16.9 | 0.0 |

### Threshold sweep — day+dry (defect classes)

| conf | precision | recall | manhole false alarms |
|---:|---:|---:|---:|
| 0.15 | 50.6 | 55.9 | 25.5 |
| 0.2 | 57.2 | 51.6 | 17.0 |
| 0.25 | 62.0 | 48.3 | 9.4 |
| 0.3 | 65.6 | 44.7 | 5.7 |
| 0.35 | 68.9 | 41.2 | 4.7 |
| 0.4 | 72.5 | 37.9 | 1.9 |
| 0.5 | 78.6 | 31.6 | 0.9 |
| 0.6 | 84.8 | 24.9 | 0.0 |
| 0.7 | 89.9 | 15.3 | 0.0 |

## all  (1263 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 851 | 43.9 | 58.6 | 41.9 | 48.9 |
| transverse_crack | 363 | 39.2 | 56.4 | 37.7 | 45.2 |
| alligator_crack | 449 | 61.8 | 64.1 | 59.7 | 61.8 |
| pothole | 923 | 63.6 | 68.4 | 60.2 | 64.1 |
| manhole | 152 | 64.9 | 68.2 | 67.8 | 68.0 |

**Defects overall** — precision 63.3 %, recall 51.0 %, mAP50 52.1 %
**Manhole false-alarm rate** — 7.2 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## cracks_merged  (1263 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 1663 | 51.5 | 62.3 | 47.6 | 53.9 |
| pothole | 923 | 63.6 | 68.4 | 60.2 | 64.1 |
| manhole | 152 | 64.9 | 68.2 | 67.8 | 68.0 |

**Defects overall** — precision 64.7 %, recall 52.1 %, mAP50 57.5 %
**Manhole false-alarm rate** — 7.2 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## day+dry  (1022 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 754 | 43.1 | 58.9 | 40.5 | 48.0 |
| transverse_crack | 288 | 37.2 | 55.1 | 35.8 | 43.4 |
| alligator_crack | 372 | 60.5 | 63.2 | 58.6 | 60.8 |
| pothole | 670 | 59.5 | 66.4 | 56.7 | 61.2 |
| manhole | 106 | 61.8 | 65.4 | 64.1 | 64.8 |

**Defects overall** — precision 62.0 %, recall 48.3 %, mAP50 50.1 %
**Manhole false-alarm rate** — 9.4 % of 106 intact manholes flagged as defects (target ≤ 10 %)

## day+wet  (232 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 89 | 53.6 | 57.0 | 55.1 | 56.0 |
| transverse_crack | 66 | 49.4 | 60.8 | 47.0 | 53.0 |
| alligator_crack | 62 | 73.2 | 66.7 | 67.7 | 67.2 |
| pothole | 238 | 73.5 | 71.9 | 68.9 | 70.4 |
| manhole | 46 | 73.7 | 74.5 | 76.1 | 75.3 |

**Defects overall** — precision 66.8 %, recall 62.9 %, mAP50 62.4 %
**Manhole false-alarm rate** — 2.2 % of 46 intact manholes flagged as defects (target ≤ 10 %)

## light=day  (1254 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 843 | 44.0 | 58.6 | 42.0 | 48.9 |
| transverse_crack | 354 | 39.0 | 56.3 | 37.9 | 45.3 |
| alligator_crack | 434 | 62.2 | 63.7 | 59.9 | 61.8 |
| pothole | 908 | 63.2 | 68.0 | 59.9 | 63.7 |
| manhole | 152 | 64.9 | 68.2 | 67.8 | 68.0 |

**Defects overall** — precision 63.0 %, recall 50.9 %, mAP50 52.1 %
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
| longitudinal_crack | 71 | 7.0 | 33.3 | 4.2 | 7.5 |
| transverse_crack | 85 | 12.6 | 25.0 | 3.5 | 6.2 |
| alligator_crack | 63 | 51.3 | 52.5 | 49.2 | 50.8 |
| pothole | 97 | 27.3 | 50.0 | 26.8 | 34.9 |
| manhole | 152 | 65.2 | 70.1 | 67.8 | 68.9 |

**Defects overall** — precision 47.7 %, recall 19.9 %, mAP50 24.5 %
**Manhole false-alarm rate** — 7.2 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## source=kent  (63 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| pothole | 135 | 37.8 | 59.1 | 40.7 | 48.2 |

**Defects overall** — precision 59.1 %, recall 40.7 %, mAP50 37.8 %

## source=rdd2022  (1000 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 780 | 46.9 | 59.0 | 45.4 | 51.3 |
| transverse_crack | 278 | 46.7 | 58.0 | 48.2 | 52.6 |
| alligator_crack | 386 | 63.5 | 66.0 | 61.4 | 63.6 |
| pothole | 691 | 72.0 | 71.1 | 68.7 | 69.9 |
| manhole | 0 | — | 0.0 | — | — |

**Defects overall** — precision 64.6 %, recall 56.2 %, mAP50 57.3 %

## surface=dry  (1026 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 755 | 43.2 | 58.9 | 40.5 | 48.0 |
| transverse_crack | 291 | 37.1 | 55.3 | 35.7 | 43.4 |
| alligator_crack | 379 | 60.6 | 63.6 | 58.6 | 61.0 |
| pothole | 674 | 59.7 | 66.7 | 57.0 | 61.4 |
| manhole | 106 | 61.8 | 65.4 | 64.1 | 64.8 |

**Defects overall** — precision 62.2 %, recall 48.4 %, mAP50 50.1 %
**Manhole false-alarm rate** — 9.4 % of 106 intact manholes flagged as defects (target ≤ 10 %)

## surface=wet  (237 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 96 | 52.3 | 57.3 | 53.1 | 55.1 |
| transverse_crack | 72 | 50.3 | 60.0 | 45.8 | 52.0 |
| alligator_crack | 70 | 69.3 | 66.7 | 65.7 | 66.2 |
| pothole | 249 | 73.9 | 72.6 | 69.1 | 70.8 |
| manhole | 46 | 73.7 | 74.5 | 76.1 | 75.3 |

**Defects overall** — precision 67.1 %, recall 62.0 %, mAP50 61.4 %
**Manhole false-alarm rate** — 2.2 % of 46 intact manholes flagged as defects (target ≤ 10 %)
