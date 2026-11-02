"""Fine-tune Depth Anything V2 (metric, outdoor, Small) on real road-surface depth.

Data: RSRD dense (Tsinghua; stereo + LiDAR, 1920x1080 / 960x540, depth PNG = metres x 256, 0 = no measure).
Recipe (Depth Anything V2 metric fine-tuning): scale-invariant log loss on measured pixels only,
AdamW, encoder lr 10x smaller than the head, mixed precision, horizontal flips + colour jitter.

Usage:
  python scripts/train_depth.py --epochs 6 --batch 4
  python scripts/train_depth.py --eval-only --model depth-anything/Depth-Anything-V2-Metric-Outdoor-Small-hf
Output: models/depth_finetuned/ (HF format, loadable by roadvision.depth.DepthEstimator(model_id=...))
"""
import argparse
import json
import math
import random
import sys
import time
from pathlib import Path

import cv2
import numpy as np
import torch
from torch.utils.data import DataLoader, Dataset

ROOT = Path(__file__).resolve().parents[1]
BASE = "depth-anything/Depth-Anything-V2-Metric-Outdoor-Small-hf"
RSRD = ROOT / "data" / "raw" / "rsrd" / "extracted"
MEAN, STD = np.array([0.485, 0.456, 0.406]), np.array([0.229, 0.224, 0.225])


def rsrd_pairs(split: str):
    """(image, depth png) pairs. Looks for depth maps next to left images (RSRD dense layout)."""
    root = next((p for p in RSRD.rglob(split) if p.is_dir()), None)
    if root is None:
        raise SystemExit(f"no '{split}' folder under {RSRD}")
    pairs = []
    for d in sorted(root.rglob("*.png")):
        if "depth" not in str(d.parent).lower():
            continue
        stem = d.stem.replace("_depth", "")
        seq = d.parent.parent
        img = next((p for p in [seq / "left" / f"{stem}.jpg", seq / "left_half" / f"{stem}.jpg",
                                seq / "left" / f"{stem}.png"] if p.exists()), None)
        if img is not None:
            pairs.append((img, d))
    return pairs


class DepthSet(Dataset):
    def __init__(self, pairs, size=(378, 672), train=True, max_depth=80.0, crop_aug=False):
        self.pairs, self.size, self.train, self.max_depth = pairs, size, train, max_depth
        self.crop_aug = crop_aug

    def __len__(self):
        return len(self.pairs)

    def __getitem__(self, i):
        ip, dp = self.pairs[i]
        img = cv2.cvtColor(cv2.imread(str(ip)), cv2.COLOR_BGR2RGB)
        dep = cv2.imread(str(dp), cv2.IMREAD_UNCHANGED).astype(np.float32) / 256.0
        if self.train and self.crop_aug:
            # random zoom + position: changes the apparent field of view and camera pitch, so the model
            # cannot memorise the single camera mounting of the training vehicle
            H, W = img.shape[:2]
            s = random.uniform(0.45, 1.0)
            ch, cw = int(H * s), int(W * s)
            y0 = random.randint(0, H - ch)
            x0 = random.randint(0, W - cw)
            img, dep = img[y0:y0 + ch, x0:x0 + cw], dep[y0:y0 + ch, x0:x0 + cw]
        h, w = self.size
        img = cv2.resize(img, (w, h), interpolation=cv2.INTER_AREA)
        dep = cv2.resize(dep, (w, h), interpolation=cv2.INTER_NEAREST)  # never blend measured and empty pixels
        if self.train:
            if random.random() < 0.5:
                img, dep = img[:, ::-1].copy(), dep[:, ::-1].copy()
            img = np.clip(img * random.uniform(0.75, 1.25) + random.uniform(-20, 20), 0, 255)
        x = ((img / 255.0 - MEAN) / STD).transpose(2, 0, 1).astype(np.float32)
        valid = (dep > 0.1) & (dep < self.max_depth)
        return torch.from_numpy(x), torch.from_numpy(dep), torch.from_numpy(valid)


def silog(pred, gt, valid, lam=0.5):
    d = torch.log(pred[valid].clamp(min=1e-3)) - torch.log(gt[valid])
    return torch.sqrt((d ** 2).mean() - lam * d.mean() ** 2 + 1e-8) * 10


@torch.no_grad()
def evaluate(model, loader, device):
    model.eval()
    err = {"abs_rel": [], "rmse": [], "d1": [], "mae_cm_near": []}
    for x, gt, valid in loader:
        x, gt, valid = x.to(device), gt.to(device), valid.to(device)
        with torch.autocast("cuda", dtype=torch.float16):
            pred = model(pixel_values=x).predicted_depth
        pred = torch.nn.functional.interpolate(pred[:, None].float(), size=gt.shape[-2:], mode="bilinear",
                                               align_corners=False)[:, 0]
        for p, g, v in zip(pred, gt, valid):
            p, g = p[v], g[v]
            if g.numel() < 100:
                continue
            err["abs_rel"].append(((p - g).abs() / g).mean().item())
            err["rmse"].append(torch.sqrt(((p - g) ** 2).mean()).item())
            err["d1"].append((torch.maximum(p / g, g / p) < 1.25).float().mean().item())
            near = g < 10  # the road just ahead of the vehicle, where defects are measured
            if near.any():
                err["mae_cm_near"].append(((p[near] - g[near]).abs().mean() * 100).item())
    model.train()
    return {k: round(float(np.mean(v)), 4) for k, v in err.items() if v}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=BASE)
    ap.add_argument("--epochs", type=int, default=6)
    ap.add_argument("--batch", type=int, default=4)
    ap.add_argument("--lr", type=float, default=5e-6, help="encoder lr; the head uses 10x")
    ap.add_argument("--eval-only", action="store_true")
    ap.add_argument("--out", default=str(ROOT / "models" / "depth_finetuned"))
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--crop-aug", action="store_true", help="random zoom/position crops (viewpoint diversity)")
    ap.add_argument("--freeze-blocks", type=int, default=0, help="freeze the first N ViT blocks of the encoder")
    ap.add_argument("--report", default="depth_finetune_rsrd")
    a = ap.parse_args()

    from transformers import AutoImageProcessor, AutoModelForDepthEstimation
    device = "cuda"
    torch.manual_seed(0), random.seed(0)
    train_pairs, test_pairs = rsrd_pairs("train"), rsrd_pairs("test")
    if a.limit:
        train_pairs, test_pairs = train_pairs[:a.limit], test_pairs[:max(20, a.limit // 5)]
    print(f"train {len(train_pairs)}  test {len(test_pairs)}", flush=True)
    test_dl = DataLoader(DepthSet(test_pairs, train=False), batch_size=4, num_workers=2)

    model = AutoModelForDepthEstimation.from_pretrained(a.model).to(device)
    report = {"model": a.model, "before": evaluate(model, test_dl, device)}
    print("before", report["before"], flush=True)
    if a.eval_only:
        print(json.dumps(report, indent=1))
        return

    train_dl = DataLoader(DepthSet(train_pairs, crop_aug=a.crop_aug), batch_size=a.batch, shuffle=True,
                          num_workers=4, drop_last=True)
    if a.freeze_blocks:
        import re
        for n, p in model.named_parameters():
            m = re.search(r"encoder\.layer\.(\d+)\.", n)
            if n.startswith("backbone") and (("embeddings" in n) or (m and int(m.group(1)) < a.freeze_blocks)):
                p.requires_grad = False
    enc = [p for n, p in model.named_parameters() if n.startswith("backbone") and p.requires_grad]
    dec = [p for n, p in model.named_parameters() if not n.startswith("backbone")]
    opt = torch.optim.AdamW([{"params": enc, "lr": a.lr}, {"params": dec, "lr": a.lr * 10}], weight_decay=0.01)
    total = a.epochs * len(train_dl)
    sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: min(1.0, s / 200) * 0.5 * (1 + math.cos(math.pi * s / total)))
    scaler = torch.amp.GradScaler()
    best, step, t0 = None, 0, time.time()
    for ep in range(a.epochs):
        for x, gt, valid in train_dl:
            x, gt, valid = x.to(device), gt.to(device), valid.to(device)
            with torch.autocast("cuda", dtype=torch.float16):
                pred = model(pixel_values=x).predicted_depth
            pred = torch.nn.functional.interpolate(pred[:, None].float(), size=gt.shape[-2:], mode="bilinear",
                                                   align_corners=False)[:, 0]
            if valid.sum() < 100:
                continue
            loss = silog(pred, gt, valid)
            opt.zero_grad(set_to_none=True)
            scaler.scale(loss).backward()
            scaler.unscale_(opt)
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            scaler.step(opt), scaler.update(), sched.step()
            step += 1
            if step % 100 == 0:
                print(f"ep {ep} step {step}/{total} loss {loss.item():.3f} {time.time() - t0:.0f}s", flush=True)
        m = evaluate(model, test_dl, device)
        print(f"epoch {ep} test {m}", flush=True)
        report[f"epoch_{ep}"] = m
        if best is None or m["abs_rel"] < best:
            best = m["abs_rel"]
            model.save_pretrained(a.out)
            AutoImageProcessor.from_pretrained(a.model).save_pretrained(a.out)
    (ROOT / "reports" / f"{a.report}.json").write_text(json.dumps(report, indent=1))
    print("best abs_rel", best, "->", a.out)


if __name__ == "__main__":
    main()
