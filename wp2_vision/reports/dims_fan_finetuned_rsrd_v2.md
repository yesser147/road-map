## finetuned_rsrd_v2

| setting | outline | n | depth MAE cm | depth rel. err | length MAE cm | length rel. err | width MAE cm | width rel. err |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| blind | box | 79 | 3.3 | 140 % | 56.9 | 844 % | 58.0 | 766 % |
| blind | mask | 79 | 3.0 | 178 % | 46.6 | 706 % | 47.7 | 625 % |
| known | box | 77 | 1.3 | 63 % | 4.9 | 65 % | 3.8 | 41 % |
| known | mask | 79 | 1.2 | 56 % | 2.9 | 40 % | 1.8 | 21 % |

Ground truth range: depth 0.4-4.4 cm, length 1-19 cm, camera 0.35-0.48 m from the road.
