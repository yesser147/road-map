# Evaluation — `cmp_v4_orig`

Weights: `runs/finetune_v4_zoom/weights/best.pt` · imgsz 640 · operating threshold conf ≥ 0.25 · median inference 8.0 ms/image (GPU, batch 1)

### Threshold sweep — all (defect classes)

| conf | precision | recall | manhole false alarms |
|---:|---:|---:|---:|
| 0.15 | 50.8 | 58.0 | 20.4 |
| 0.2 | 56.6 | 54.1 | 10.5 |
| 0.25 | 61.5 | 50.5 | 5.9 |
| 0.3 | 66.4 | 47.1 | 4.0 |
| 0.35 | 69.5 | 43.5 | 2.0 |
| 0.4 | 73.1 | 40.5 | 2.0 |
| 0.5 | 79.0 | 34.0 | 1.3 |
| 0.6 | 84.0 | 25.9 | 0.7 |
| 0.7 | 90.8 | 16.5 | 0.0 |

### Threshold sweep — day+dry (defect classes)

| conf | precision | recall | manhole false alarms |
|---:|---:|---:|---:|
| 0.15 | 49.7 | 55.4 | 20.8 |
| 0.2 | 55.4 | 51.5 | 12.3 |
| 0.25 | 60.4 | 47.9 | 7.5 |
| 0.3 | 65.2 | 44.8 | 5.7 |
| 0.35 | 68.5 | 41.3 | 2.8 |
| 0.4 | 72.0 | 38.1 | 2.8 |
| 0.5 | 77.5 | 31.4 | 1.9 |
| 0.6 | 83.1 | 23.6 | 0.9 |
| 0.7 | 89.9 | 15.0 | 0.0 |

## all  (1263 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 851 | 44.7 | 58.0 | 41.5 | 48.4 |
| transverse_crack | 363 | 38.1 | 53.3 | 37.7 | 44.2 |
| alligator_crack | 449 | 61.9 | 63.6 | 59.2 | 61.4 |
| pothole | 923 | 61.5 | 65.4 | 59.5 | 62.3 |
| manhole | 152 | 71.3 | 63.4 | 73.0 | 67.9 |

**Defects overall** — precision 61.5 %, recall 50.5 %, mAP50 51.5 %
**Manhole false-alarm rate** — 5.9 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## cracks_merged  (1263 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 1663 | 51.2 | 61.3 | 47.3 | 53.4 |
| pothole | 923 | 61.5 | 65.4 | 59.5 | 62.3 |
| manhole | 152 | 71.3 | 63.4 | 73.0 | 67.9 |

**Defects overall** — precision 62.9 %, recall 51.7 %, mAP50 56.4 %
**Manhole false-alarm rate** — 5.9 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## day+dry  (1022 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 754 | 43.8 | 58.1 | 40.3 | 47.6 |
| transverse_crack | 288 | 35.2 | 51.7 | 36.5 | 42.8 |
| alligator_crack | 372 | 60.8 | 63.5 | 58.1 | 60.7 |
| pothole | 670 | 57.3 | 63.5 | 55.8 | 59.4 |
| manhole | 106 | 66.7 | 58.8 | 66.0 | 62.2 |

**Defects overall** — precision 60.4 %, recall 47.9 %, mAP50 49.3 %
**Manhole false-alarm rate** — 7.5 % of 106 intact manholes flagged as defects (target ≤ 10 %)

## day+wet  (232 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 89 | 56.0 | 57.8 | 53.9 | 55.8 |
| transverse_crack | 66 | 53.3 | 58.8 | 45.5 | 51.3 |
| alligator_crack | 62 | 71.8 | 61.8 | 67.7 | 64.6 |
| pothole | 238 | 71.9 | 68.8 | 68.5 | 68.6 |
| manhole | 46 | 84.7 | 73.2 | 89.1 | 80.4 |

**Defects overall** — precision 64.5 %, recall 62.2 %, mAP50 63.2 %
**Manhole false-alarm rate** — 2.2 % of 46 intact manholes flagged as defects (target ≤ 10 %)

## light=day  (1254 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 843 | 44.9 | 58.1 | 41.8 | 48.6 |
| transverse_crack | 354 | 37.9 | 53.1 | 38.1 | 44.4 |
| alligator_crack | 434 | 62.3 | 63.2 | 59.5 | 61.3 |
| pothole | 908 | 61.2 | 65.0 | 59.1 | 61.9 |
| manhole | 152 | 71.3 | 63.4 | 73.0 | 67.9 |

**Defects overall** — precision 61.2 %, recall 50.5 %, mAP50 51.5 %
**Manhole false-alarm rate** — 5.9 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## light=night  (9 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 8 | 39.6 | 33.3 | 12.5 | 18.2 |
| transverse_crack | 9 | 55.9 | 66.7 | 22.2 | 33.3 |
| alligator_crack | 15 | 53.4 | 80.0 | 53.3 | 64.0 |
| pothole | 15 | 90.9 | 92.3 | 80.0 | 85.7 |

**Defects overall** — precision 79.3 %, recall 48.9 %, mAP50 60.0 %

## night+dry  (4 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 1 | 50.0 | 50.0 | 100.0 | 66.7 |
| transverse_crack | 3 | 33.3 | — | 0.0 | — |
| alligator_crack | 7 | 71.4 | 100.0 | 57.1 | 72.7 |
| pothole | 4 | 100.0 | 100.0 | 100.0 | 100.0 |

**Defects overall** — precision 90.0 %, recall 60.0 %, mAP50 63.7 %

## night+wet  (5 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 7 | 41.7 | 0.0 | 0.0 | — |
| transverse_crack | 6 | 70.5 | 66.7 | 33.3 | 44.4 |
| alligator_crack | 8 | 42.5 | 66.7 | 50.0 | 57.1 |
| pothole | 11 | 87.7 | 88.9 | 72.7 | 80.0 |

**Defects overall** — precision 73.7 %, recall 43.8 %, mAP50 60.6 %

## source=kaggle_rdd  (200 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 71 | 8.3 | 25.0 | 4.2 | 7.2 |
| transverse_crack | 85 | 10.2 | 21.1 | 4.7 | 7.7 |
| alligator_crack | 63 | 46.1 | 47.8 | 50.8 | 49.2 |
| pothole | 97 | 30.6 | 53.2 | 25.8 | 34.7 |
| manhole | 152 | 71.9 | 65.3 | 73.0 | 68.9 |

**Defects overall** — precision 44.1 %, recall 20.2 %, mAP50 23.8 %
**Manhole false-alarm rate** — 5.9 % of 152 intact manholes flagged as defects (target ≤ 10 %)

## source=kent  (63 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 0 | — | 0.0 | — | — |
| pothole | 135 | 36.5 | 52.0 | 39.3 | 44.7 |
| manhole | 0 | — | 0.0 | — | — |

**Defects overall** — precision 51.5 %, recall 39.3 %, mAP50 36.5 %

## source=rdd2022  (1000 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 780 | 47.6 | 58.7 | 44.9 | 50.9 |
| transverse_crack | 278 | 46.0 | 55.9 | 47.8 | 51.5 |
| alligator_crack | 386 | 64.2 | 66.7 | 60.6 | 63.5 |
| pothole | 691 | 69.4 | 68.3 | 68.2 | 68.2 |
| manhole | 0 | — | 0.0 | — | — |

**Defects overall** — precision 63.4 %, recall 55.6 %, mAP50 56.8 %

## surface=dry  (1026 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 755 | 43.8 | 58.1 | 40.4 | 47.7 |
| transverse_crack | 291 | 35.0 | 51.7 | 36.1 | 42.5 |
| alligator_crack | 379 | 60.8 | 63.9 | 58.1 | 60.9 |
| pothole | 674 | 57.5 | 63.7 | 56.1 | 59.7 |
| manhole | 106 | 66.7 | 58.8 | 66.0 | 62.2 |

**Defects overall** — precision 60.5 %, recall 48.0 %, mAP50 49.3 %
**Manhole false-alarm rate** — 7.5 % of 106 intact manholes flagged as defects (target ≤ 10 %)

## surface=wet  (237 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| longitudinal_crack | 96 | 53.8 | 57.1 | 50.0 | 53.3 |
| transverse_crack | 72 | 54.0 | 59.3 | 44.4 | 50.8 |
| alligator_crack | 70 | 68.3 | 62.2 | 65.7 | 63.9 |
| pothole | 249 | 72.4 | 69.5 | 68.7 | 69.1 |
| manhole | 46 | 84.7 | 73.2 | 89.1 | 80.4 |

**Defects overall** — precision 64.8 %, recall 61.0 %, mAP50 62.1 %
**Manhole false-alarm rate** — 2.2 % of 46 intact manholes flagged as defects (target ≤ 10 %)
