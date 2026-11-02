"""Out-of-distribution test of the dimension module on Fan et al. stereo potholes (never used for training).

Ground truth comes from the stereo point clouds (mm, 2.2 mm accuracy vs laser scan):
  - road plane = RANSAC on the non-pothole pixels around each pothole
  - depth      = 95th percentile of the distance below that plane inside the pothole mask
  - width      = extent across the image (camera X axis projected on the road), 2nd-98th percentile
  - length     = extent along the road (in-plane axis perpendicular to width), 2nd-98th percentile
The model only sees the RGB photo. Two settings are reported:
  blind   : 70 deg field of view assumed, no camera height (what a random citizen photo gives)
  known   : true focal length + camera height above the road (what a calibrated bus camera gives)
and two ways of outlining the pothole: its bounding box (what YOLO gives) and its mask.

Usage: python scripts/eval_dims_fan.py [--model <hf id or local dir>] [--tag name]
"""
import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np
import scipy.io as sio
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from roadvision.depth import DepthEstimator, METRIC_MODEL_ID, ransac_plane  # noqa: E402

FAN = ROOT / "data" / "raw" / "fan_stereo"
MIN_AREA = 1500  # px, ignore specks in the masks


def plane_axes(n):
    """Two in-plane unit vectors: u = camera X projected on the road, v = perpendicular (along the road)."""
    x = np.array([1.0, 0, 0])
    u = x - n * (x @ n)
    u /= np.linalg.norm(u)
    v = np.cross(n, u)
    return u, v


def ground_truth(P, comp, ring):
    pts_ring = P[ring]
    pts_ring = pts_ring[np.isfinite(pts_ring).all(1)] / 1000.0
    pts_in = P[comp]
    pts_in = pts_in[np.isfinite(pts_in).all(1)] / 1000.0
    if len(pts_ring) < 200 or len(pts_in) < 200:
        return None
    plane = ransac_plane(pts_ring, iters=300, tol=0.004)
    if plane is None:
        return None
    n, d = plane
    if d < 0:  # orient the normal toward the camera (camera at origin on the positive side)
        n, d = -n, -d
    below = -(pts_in @ n + d)
    depth_cm = float(np.percentile(below, 95) * 100)
    u, v = plane_axes(n)
    pu, pv = pts_in @ u, pts_in @ v
    width = float(np.percentile(pu, 98) - np.percentile(pu, 2))
    length = float(np.percentile(pv, 98) - np.percentile(pv, 2))
    return {"depth_cm": depth_cm, "width_m": width, "length_m": length, "cam_height_m": float(d)}


def components(label):
    m = (label.max(-1) > 0).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
    out = []
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] < MIN_AREA:
            continue
        comp = lab == i
        k = max(15, int(np.sqrt(stats[i, cv2.CC_STAT_AREA]) * 0.6))
        ring = cv2.dilate(comp.astype(np.uint8), np.ones((k, k), np.uint8)).astype(bool) & (m == 0)
        x, y, w, h = stats[i, :4]
        out.append((comp, ring, [float(x), float(y), float(x + w), float(y + h)]))
    return out


def predicted_masks(seg, bgr, conf=0.25):
    r = seg.predict(bgr, conf=conf, retina_masks=True, verbose=False)[0]
    if r.masks is None:
        return []
    return [m.astype(bool) for m in r.masks.data.cpu().numpy() > 0.5]


def best_match(pred_masks, gt):
    """Predicted outline overlapping the true pothole best, and its IoU (None, 0 if missed)."""
    best, best_iou = None, 0.0
    for m in pred_masks:
        if m.shape != gt.shape:
            m = cv2.resize(m.astype(np.uint8), gt.shape[::-1], interpolation=cv2.INTER_NEAREST).astype(bool)
        iou = float((m & gt).sum() / max((m | gt).sum(), 1))
        if iou > best_iou:
            best, best_iou = m, iou
    return (best, best_iou) if best_iou >= 0.1 else (None, best_iou)


def frames():
    for ds in sorted(FAN.glob("dataset*")):
        for rgb in sorted((ds / "rgb").glob("*.png")):
            pc, lb = ds / "ptcloud" / f"{rgb.stem}.mat", ds / "label" / rgb.name
            if pc.exists() and lb.exists():
                yield f"{ds.name}/{rgb.stem}", rgb, pc, lb


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=METRIC_MODEL_ID)
    ap.add_argument("--tag", default="baseline")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--seg", default="", help="pothole outline model: adds the end-to-end 'predicted mask' outline")
    ap.add_argument("--relief", default="", help="second depth model used only for the depth below the road plane")
    ap.add_argument("--seg-conf", type=float, default=0.25)
    a = ap.parse_args()

    est = DepthEstimator(model_id=a.model, relief_model_id=a.relief or None)
    seg = None
    if a.seg:
        from ultralytics import YOLO
        seg = YOLO(a.seg)
    rows = []
    for k, (name, rgb, pc, lb) in enumerate(frames()):
        if a.limit and k >= a.limit:
            break
        P = sio.loadmat(pc)["xyzPoints"]
        label = np.array(Image.open(lb))
        bgr = cv2.imread(str(rgb))
        h, w = bgr.shape[:2]
        # true focal length from the point cloud (u = fx * X/Z + cx)
        v_, u_ = np.nonzero(np.isfinite(P).all(-1))
        sel = slice(None, None, 50)
        fx = float(np.linalg.lstsq(np.stack([P[v_[sel], u_[sel], 0] / P[v_[sel], u_[sel], 2],
                                              np.ones(len(v_[sel]))], 1), u_[sel], rcond=None)[0][0])
        true_hfov = float(np.degrees(2 * np.arctan((w / 2) / fx)))
        comps = components(label)
        gts = [ground_truth(P, c, r) for c, r, _ in comps]
        if not any(gts):
            continue
        cam_h = float(np.median([g["cam_height_m"] for g in gts if g]))
        pred_masks = predicted_masks(seg, bgr, conf=a.seg_conf) if seg else []
        for setting, hfov, ch in [("blind", 70.0, None), ("known", true_hfov, cam_h)]:
            est.hfov, est.cam_height = hfov, ch
            depth = est.depth_map(bgr)
            relief = est.relief_map(bgr) if a.relief else depth
            for (comp, ring, box), gt in zip(comps, gts):
                if gt is None:
                    continue
                outlines = ["box", "mask"]
                pm, iou = best_match(pred_masks, comp)
                if seg:
                    outlines.append("predicted")
                for outline in outlines:
                    if outline == "predicted":
                        if pm is None:
                            rows.append({"frame": name, "setting": setting, "outline": outline, **gt, "iou": 0.0,
                                         "pred_depth_cm": None, "pred_length_m": None, "pred_width_m": None})
                            continue
                        m = pm
                    else:
                        m = comp if outline == "mask" else None
                    pred_d = est.pothole_depth_cm(relief, box, mask=m)
                    size = est.box_size_m(depth, box, mask=m)
                    rows.append({"frame": name, "setting": setting, "outline": outline, **gt,
                                 "iou": iou if outline == "predicted" else None,
                                 "pred_depth_cm": pred_d,
                                 "pred_length_m": size[0] if size else None,
                                 "pred_width_m": size[1] if size else None})
        print(name, len(comps), "potholes", flush=True)

    out = ROOT / "reports" / f"dims_fan_{a.tag}.json"
    out.write_text(json.dumps(rows, indent=1))
    summarize(rows, a.tag)


def summarize(rows, tag):
    lines = [f"## {tag}", "", "| setting | outline | n | depth MAE cm | depth rel. err | length MAE cm | length rel. err | width MAE cm | width rel. err |",
             "|---|---|---:|---:|---:|---:|---:|---:|---:|"]
    for setting in ["blind", "known"]:
        for outline in ["box", "mask", "predicted"]:
            r = [x for x in rows if x["setting"] == setting and x["outline"] == outline
                 and x["pred_depth_cm"] is not None and x["pred_length_m"] is not None]
            if not r:
                continue
            def err(p, g, scale=1.0):
                e = np.array([abs(x[p] - x[g]) * scale for x in r])
                rel = np.array([abs(x[p] - x[g]) / max(x[g], 1e-6) for x in r])
                return f"{e.mean():.1f}", f"{np.median(rel) * 100:.0f} %"
            d = err("pred_depth_cm", "depth_cm")
            l = err("pred_length_m", "length_m", 100)
            wd = err("pred_width_m", "width_m", 100)
            lines.append(f"| {setting} | {outline} | {len(r)} | {d[0]} | {d[1]} | {l[0]} | {l[1]} | {wd[0]} | {wd[1]} |")
    pr = [x for x in rows if x["setting"] == "known" and x["outline"] == "predicted"]
    if pr:
        found = [x for x in pr if x["pred_depth_cm"] is not None]
        lines += ["", f"Predicted outlines: {len(found)}/{len(pr)} potholes found, mean IoU with the true outline "
                  f"{np.mean([x['iou'] for x in pr]):.2f} (missed = 0)."]
    gt = [x for x in rows if x["setting"] == "known" and x["outline"] == "mask"]
    if gt:
        lines += ["", f"Ground truth range: depth {min(x['depth_cm'] for x in gt):.1f}-{max(x['depth_cm'] for x in gt):.1f} cm, "
                  f"length {min(x['length_m'] for x in gt) * 100:.0f}-{max(x['length_m'] for x in gt) * 100:.0f} cm, "
                  f"camera {min(x['cam_height_m'] for x in gt):.2f}-{max(x['cam_height_m'] for x in gt):.2f} m from the road."]
    text = "\n".join(lines)
    print(text)
    (ROOT / "reports" / f"dims_fan_{tag}.md").write_text(text + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
