## finetuned_rsrd

| setting | outline | n | depth MAE cm | depth rel. err | length MAE cm | length rel. err | width MAE cm | width rel. err |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| blind | box | 79 | 3.7 | 283 % | 87.5 | 1196 % | 60.7 | 780 % |
| blind | mask | 79 | 3.0 | 201 % | 71.9 | 950 % | 53.0 | 656 % |
| known | box | 79 | 0.8 | 40 % | 15.6 | 200 % | 7.4 | 86 % |
| known | mask | 79 | 0.9 | 41 % | 11.8 | 146 % | 5.6 | 57 % |

Ground truth range: depth 0.4-4.4 cm, length 1-19 cm, camera 0.35-0.48 m from the road.
