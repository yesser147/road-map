# Evaluation — `cmp_v3_orig`

Weights: `runs/finetune_v3/weights/best.pt` · imgsz 640 · operating threshold conf ≥ 0.25 · median inference 7.8 ms/image (GPU, batch 1)

### Threshold sweep — all (defect classes)

| conf | precision | recall | manhole false alarms |
|---:|---:|---:|---:|
| 0.15 | 50.6 | 57.7 | 20.4 |
| 0.2 | 56.3 | 53.6 | 11.2 |
| 0.25 | 61.0 | 49.9 | 7.2 |
| 0.3 | 65.4 | 46.8 | 4.0 |
| 0.35 | 69.3 | 43.9 | 4.0 |
| 0.4 | 73.1 | 41.0 | 2.0 |
| 0.5 | 78.4 | 34.4 | 1.3 |
| 0.6 | 83.8 | 27.0 | 0.0 |
| 0.7 | 88.4 | 17.8 | 0.0 |

### Threshold sweep — day+dry (defect classes)

| conf | precision | recall | manhole false alarms |
|---:|---:|---:|---:|
| 0.15 | 49.5 | 55.4 | 22.6 |
| 0.2 | 54.9 | 51.2 | 13.2 |
| 0.25 | 59.5 | 47.2 | 8.5 |
| 0.3 | 63.8 | 44.3 | 5.7 |
| 0.35 | 67.6 | 41.6 | 5.7 |
| 0.4 | 71.7 | 38.8 | 2.8 |
| 0.5 | 76.8 | 32.1 | 1.9 |
| 0.6 | 81.8 | 24.8 | 0.0 |
| 0.7 | 87.9 | 15.7 | 0.0 |

## all  (1263 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 851 | 43.8 | 56.2 | 40.9 | 47.3 |
| transverse_crack | 363 | 36.0 | 57.6 | 33.3 | 42.2 |
| alligator_crack | 449 | 60.8 | 62.8 | 60.8 | 61.8 |
| pothole | 923 | 61.6 | 64.3 | 59.3 | 61.7 |
| manhole | 152 | 67.2 | 68.2 | 67.8 | 68.0 |

**Defects overall** — precision 61.0 %, recall 49.9 %, mAP50 50.5 %
**Manhole false-alarm rate** — 7.2 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## cracks_merged  (1263 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 1663 | 50.5 | 60.9 | 46.3 | 52.6 |
| pothole | 923 | 61.6 | 64.3 | 59.3 | 61.7 |
| manhole | 152 | 67.2 | 68.2 | 67.8 | 68.0 |

**Defects overall** — precision 62.3 %, recall 50.9 %, mAP50 56.0 %
**Manhole false-alarm rate** — 7.2 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## day+dry  (1022 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 754 | 42.5 | 56.2 | 39.5 | 46.4 |
| transverse_crack | 288 | 33.9 | 56.8 | 31.9 | 40.9 |
| alligator_crack | 372 | 59.8 | 62.0 | 59.7 | 60.8 |
| pothole | 670 | 57.7 | 61.7 | 55.5 | 58.4 |
| manhole | 106 | 63.9 | 64.4 | 63.2 | 63.8 |

**Defects overall** — precision 59.5 %, recall 47.2 %, mAP50 48.5 %
**Manhole false-alarm rate** — 8.5 % of 106 intact manholes flagged as defects (target ≤ 10 %)

## day+wet  (232 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 89 | 58.5 | 55.8 | 53.9 | 54.9 |
| transverse_crack | 66 | 45.6 | 58.1 | 37.9 | 45.9 |
| alligator_crack | 62 | 72.9 | 65.1 | 69.3 | 67.2 |
| pothole | 238 | 71.1 | 70.1 | 68.9 | 69.5 |
| manhole | 46 | 75.2 | 76.6 | 78.3 | 77.4 |

**Defects overall** — precision 65.3 %, recall 61.5 %, mAP50 62.0 %
**Manhole false-alarm rate** — 4.3 % of 46 intact manholes flagged as defects (target ≤ 10 %)

## light=day  (1254 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 843 | 43.9 | 56.2 | 41.0 | 47.4 |
| transverse_crack | 354 | 35.7 | 57.1 | 33.1 | 41.9 |
| alligator_crack | 434 | 61.4 | 62.5 | 61.1 | 61.8 |
| pothole | 908 | 61.3 | 64.0 | 59.0 | 61.4 |
| manhole | 152 | 67.2 | 68.2 | 67.8 | 68.0 |

**Defects overall** — precision 60.7 %, recall 49.8 %, mAP50 50.6 %
**Manhole false-alarm rate** — 7.2 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## light=night  (9 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 8 | 34.3 | 66.7 | 25.0 | 36.4 |
| transverse_crack | 9 | 56.1 | 80.0 | 44.4 | 57.1 |
| alligator_crack | 15 | 46.7 | 72.7 | 53.3 | 61.5 |
| pothole | 15 | 86.6 | 84.6 | 73.3 | 78.6 |

**Defects overall** — precision 78.1 %, recall 53.2 %, mAP50 55.9 %

## night+dry  (4 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 1 | 50.0 | 50.0 | 100.0 | 66.7 |
| transverse_crack | 3 | 33.3 | 100.0 | 33.3 | 50.0 |
| alligator_crack | 7 | 69.0 | 100.0 | 57.1 | 72.7 |
| pothole | 4 | 100.0 | 80.0 | 100.0 | 88.9 |

**Defects overall** — precision 83.3 %, recall 66.7 %, mAP50 63.1 %

## night+wet  (5 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 7 | 45.2 | 100.0 | 14.3 | 25.0 |
| transverse_crack | 6 | 71.3 | 75.0 | 50.0 | 60.0 |
| alligator_crack | 8 | 35.1 | 57.1 | 50.0 | 53.3 |
| pothole | 11 | 83.6 | 87.5 | 63.6 | 73.7 |

**Defects overall** — precision 75.0 %, recall 46.9 %, mAP50 58.8 %

## source=kaggle_rdd  (200 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 71 | 8.8 | 23.1 | 4.2 | 7.1 |
| transverse_crack | 85 | 10.2 | 41.7 | 5.9 | 10.3 |
| alligator_crack | 63 | 55.9 | 56.9 | 58.7 | 57.8 |
| pothole | 97 | 29.2 | 52.8 | 19.6 | 28.6 |
| manhole | 152 | 67.4 | 68.7 | 67.8 | 68.2 |

**Defects overall** — precision 50.8 %, recall 20.2 %, mAP50 26.0 %
**Manhole false-alarm rate** — 7.2 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## source=kent  (63 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 0 | — | 0.0 | — | — |
| alligator_crack | 0 | — | 0.0 | — | — |
| pothole | 135 | 36.1 | 50.5 | 40.7 | 45.1 |

**Defects overall** — precision 48.7 %, recall 40.7 %, mAP50 36.1 %

## source=rdd2022  (1000 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 780 | 46.7 | 57.0 | 44.2 | 49.8 |
| transverse_crack | 278 | 43.3 | 58.6 | 41.7 | 48.7 |
| alligator_crack | 386 | 61.8 | 64.3 | 61.1 | 62.7 |
| pothole | 691 | 70.2 | 67.1 | 68.5 | 67.8 |
| manhole | 0 | — | 0.0 | — | — |

**Defects overall** — precision 62.4 %, recall 54.8 %, mAP50 55.5 %

## surface=dry  (1026 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 755 | 42.5 | 56.2 | 39.6 | 46.5 |
| transverse_crack | 291 | 33.8 | 57.1 | 32.0 | 41.0 |
| alligator_crack | 379 | 59.7 | 62.4 | 59.6 | 61.0 |
| pothole | 674 | 57.9 | 61.8 | 55.8 | 58.7 |
| manhole | 106 | 63.9 | 64.4 | 63.2 | 63.8 |

**Defects overall** — precision 59.7 %, recall 47.4 %, mAP50 48.5 %
**Manhole false-alarm rate** — 8.5 % of 106 intact manholes flagged as defects (target ≤ 10 %)

## surface=wet  (237 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 96 | 56.4 | 56.3 | 51.0 | 53.5 |
| transverse_crack | 72 | 47.4 | 59.6 | 38.9 | 47.1 |
| alligator_crack | 70 | 67.3 | 64.4 | 67.1 | 65.7 |
| pothole | 249 | 71.5 | 70.7 | 68.7 | 69.7 |
| manhole | 46 | 75.2 | 76.6 | 78.3 | 77.4 |

**Defects overall** — precision 65.7 %, recall 60.6 %, mAP50 60.7 %
**Manhole false-alarm rate** — 4.3 % of 46 intact manholes flagged as defects (target ≤ 10 %)
