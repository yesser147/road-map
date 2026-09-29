# CPU latency (4 threads, batch 1)

| variant | file MB | median ms | p90 ms |
|---|---:|---:|---:|
| PyTorch FP32 640 | 22.5 | 673 | 767 |
| PyTorch FP32 480 | 22.5 | 506 | 554 |
| ONNX FP32 640 | 44.8 | 934 | 979 |
| ONNX INT8 640 | 11.5 | 1498 | 1576 |