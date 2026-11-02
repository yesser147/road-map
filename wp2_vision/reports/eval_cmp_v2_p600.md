# Evaluation — `cmp_v2_p600`

Weights: `models/roadvision_best.pt` · imgsz 640 · operating threshold conf ≥ 0.25 · median inference 10.7 ms/image (GPU, batch 1)

### Threshold sweep — all (defect classes)

| conf | precision | recall | manhole false alarms |
|---:|---:|---:|---:|
| 0.15 | 57.6 | 13.2 | — |
| 0.2 | 70.6 | 9.3 | — |
| 0.25 | 76.5 | 5.1 | — |
| 0.3 | 86.7 | 5.1 | — |
| 0.35 | 90.9 | 3.9 | — |
| 0.4 | 88.9 | 3.1 | — |
| 0.5 | 83.3 | 1.9 | — |
| 0.6 | 100.0 | 0.4 | — |
| 0.7 | — | 0.0 | — |

### Threshold sweep — day+dry (defect classes)

| conf | precision | recall | manhole false alarms |
|---:|---:|---:|---:|
| 0.15 | 57.6 | 13.2 | — |
| 0.2 | 70.6 | 9.3 | — |
| 0.25 | 76.5 | 5.1 | — |
| 0.3 | 86.7 | 5.1 | — |
| 0.35 | 90.9 | 3.9 | — |
| 0.4 | 88.9 | 3.1 | — |
| 0.5 | 83.3 | 1.9 | — |
| 0.6 | 100.0 | 0.4 | — |
| 0.7 | — | 0.0 | — |

## all  (240 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| pothole | 257 | 24.0 | 76.5 | 5.1 | 9.5 |

**Defects overall** — precision 76.5 %, recall 5.1 %, mAP50 24.0 %

## cracks_merged  (240 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| pothole | 257 | 24.0 | 76.5 | 5.1 | 9.5 |

**Defects overall** — precision 76.5 %, recall 5.1 %, mAP50 24.0 %

## day+dry  (240 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| pothole | 257 | 24.0 | 76.5 | 5.1 | 9.5 |

**Defects overall** — precision 76.5 %, recall 5.1 %, mAP50 24.0 %

## light=day  (240 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| pothole | 257 | 24.0 | 76.5 | 5.1 | 9.5 |

**Defects overall** — precision 76.5 %, recall 5.1 %, mAP50 24.0 %

## source=unknown  (240 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| pothole | 257 | 24.0 | 76.5 | 5.1 | 9.5 |

**Defects overall** — precision 76.5 %, recall 5.1 %, mAP50 24.0 %

## surface=dry  (240 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| pothole | 257 | 24.0 | 76.5 | 5.1 | 9.5 |

**Defects overall** — precision 76.5 %, recall 5.1 %, mAP50 24.0 %
