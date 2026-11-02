# Evaluation — `cmp_v3_p600`

Weights: `runs/finetune_v3/weights/best.pt` · imgsz 640 · operating threshold conf ≥ 0.25 · median inference 7.9 ms/image (GPU, batch 1)

### Threshold sweep — all (defect classes)

| conf | precision | recall | manhole false alarms |
|---:|---:|---:|---:|
| 0.15 | 25.3 | 16.7 | — |
| 0.2 | 32.2 | 14.4 | — |
| 0.25 | 29.9 | 8.9 | — |
| 0.3 | 48.8 | 7.8 | — |
| 0.35 | 50.0 | 5.8 | — |
| 0.4 | 41.2 | 2.7 | — |
| 0.5 | 60.0 | 1.2 | — |
| 0.6 | — | 0.0 | — |
| 0.7 | — | 0.0 | — |

### Threshold sweep — day+dry (defect classes)

| conf | precision | recall | manhole false alarms |
|---:|---:|---:|---:|
| 0.15 | 25.3 | 16.7 | — |
| 0.2 | 32.2 | 14.4 | — |
| 0.25 | 29.9 | 8.9 | — |
| 0.3 | 48.8 | 7.8 | — |
| 0.35 | 50.0 | 5.8 | — |
| 0.4 | 41.2 | 2.7 | — |
| 0.5 | 60.0 | 1.2 | — |
| 0.6 | — | 0.0 | — |
| 0.7 | — | 0.0 | — |

## all  (240 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| pothole | 257 | 14.5 | 29.9 | 8.9 | 13.8 |

**Defects overall** — precision 29.9 %, recall 8.9 %, mAP50 14.5 %

## cracks_merged  (240 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| pothole | 257 | 14.5 | 29.9 | 8.9 | 13.8 |

**Defects overall** — precision 29.9 %, recall 8.9 %, mAP50 14.5 %

## day+dry  (240 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| pothole | 257 | 14.5 | 29.9 | 8.9 | 13.8 |

**Defects overall** — precision 29.9 %, recall 8.9 %, mAP50 14.5 %

## light=day  (240 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| pothole | 257 | 14.5 | 29.9 | 8.9 | 13.8 |

**Defects overall** — precision 29.9 %, recall 8.9 %, mAP50 14.5 %

## source=unknown  (240 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| pothole | 257 | 14.5 | 29.9 | 8.9 | 13.8 |

**Defects overall** — precision 29.9 %, recall 8.9 %, mAP50 14.5 %

## surface=dry  (240 images)

| class | GT boxes | AP50 | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|
| pothole | 257 | 14.5 | 29.9 | 8.9 | 13.8 |

**Defects overall** — precision 29.9 %, recall 8.9 %, mAP50 14.5 %
