## e2e_segv2_conf0.1

| setting | outline | n | depth MAE cm | depth rel. err | length MAE cm | length rel. err | width MAE cm | width rel. err |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| blind | box | 79 | 3.7 | 283 % | 86.4 | 1215 % | 105.7 | 1274 % |
| blind | mask | 79 | 3.0 | 201 % | 71.7 | 987 % | 87.7 | 1066 % |
| blind | predicted | 27 | 4.2 | 162 % | 72.0 | 1042 % | 84.4 | 1176 % |
| known | box | 73 | 0.8 | 38 % | 1.0 | 10 % | 1.5 | 17 % |
| known | mask | 78 | 0.9 | 40 % | 0.9 | 11 % | 0.5 | 5 % |
| known | predicted | 27 | 1.2 | 41 % | 1.4 | 12 % | 1.9 | 9 % |

Predicted outlines: 27/79 potholes found, mean IoU with the true outline 0.24 (missed = 0).

Ground truth range: depth 0.4-4.4 cm, length 1-19 cm, camera 0.35-0.48 m from the road.
