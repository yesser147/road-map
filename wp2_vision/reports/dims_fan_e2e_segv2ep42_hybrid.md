## e2e_segv2ep42_hybrid

| setting | outline | n | depth MAE cm | depth rel. err | length MAE cm | length rel. err | width MAE cm | width rel. err |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| blind | box | 79 | 3.7 | 283 % | 86.4 | 1215 % | 105.7 | 1274 % |
| blind | mask | 79 | 3.0 | 201 % | 71.7 | 987 % | 87.7 | 1066 % |
| blind | predicted | 16 | 4.5 | 153 % | 70.3 | 965 % | 75.4 | 1007 % |
| known | box | 73 | 0.8 | 38 % | 1.0 | 10 % | 1.5 | 17 % |
| known | mask | 78 | 0.9 | 40 % | 0.9 | 11 % | 0.5 | 5 % |
| known | predicted | 16 | 1.4 | 42 % | 1.1 | 10 % | 0.8 | 5 % |

Predicted outlines: 16/79 potholes found, mean IoU with the true outline 0.16 (missed = 0).

Ground truth range: depth 0.4-4.4 cm, length 1-19 cm, camera 0.35-0.48 m from the road.
