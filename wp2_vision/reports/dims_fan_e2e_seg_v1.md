## e2e_seg_v1

| setting | outline | n | depth MAE cm | depth rel. err | length MAE cm | length rel. err | width MAE cm | width rel. err |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| blind | box | 79 | 8.0 | 279 % | 86.4 | 1215 % | 105.7 | 1274 % |
| blind | mask | 79 | 7.2 | 329 % | 71.7 | 987 % | 87.7 | 1066 % |
| blind | predicted | 4 | 25.1 | 647 % | 52.8 | 809 % | 71.8 | 975 % |
| known | box | 73 | 1.4 | 76 % | 1.0 | 10 % | 1.5 | 17 % |
| known | mask | 78 | 1.3 | 67 % | 0.9 | 11 % | 0.5 | 5 % |
| known | predicted | 4 | 1.5 | 29 % | 0.9 | 12 % | 0.2 | 3 % |

Predicted outlines: 4/79 potholes found, mean IoU with the true outline 0.04 (missed = 0).

Ground truth range: depth 0.4-4.4 cm, length 1-19 cm, camera 0.35-0.48 m from the road.
