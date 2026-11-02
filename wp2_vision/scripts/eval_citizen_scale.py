"""How well can a photo with NO calibration be measured? (the citizen-photo case)

Test data: RSRD test split (300 frames, LiDAR depth, known intrinsics), camera at roughly a standing person's
height. The ORIGINAL metric model is used (never trained on RSRD), so this is not an in-distribution test.
A fixed patch of road (centre-bottom of the image, pixels with a LiDAR measurement) acts as a ruler:
its true length/width come from the LiDAR points; the pipeline measures it from the photo alone.

Scenarios (what a citizen photo may carry):
  vehicle      true focal + true camera height                    (calibrated bus camera, the ceiling)
  exif_model   true focal (EXIF) + scale from the depth model itself (no height known)
  noexif_model 70 deg assumed  + scale from the depth model
  exif_gravity true focal + phone tilt (gravity) + scale from the model's distance to that known plane
  exif_prior   true focal + assumed hand-held height (1.4 m)  -> error = |1.4 / true height - 1|
Usage: python scripts/eval_citizen_scale.py [--limit N]
"""
import argparse
import json
import pickle
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from roadvision.depth import DepthEstimator, ransac_plane  # noqa: E402

RSRD = ROOT / "data" / "raw" / "rsrd"
PRIOR_H = 1.4


def calib_for(stem):
    day = stem[:8]
    f = RSRD / "calib" / f"calib_{day}_half.pkl"
    K = np.array(pickle.load(open(f, "rb"))["K"], dtype=float)
    return K[0, 0], K[0, 2], K[1, 2]


def backproject(depth, ys, xs, f, cx, cy):
    z = depth[ys, xs]
    return np.stack([(xs - cx) * z / f, (ys - cy) * z / f, z], 1)


def extents(pts, n):
    u = np.array([1.0, 0, 0]) - n * n[0]
    u /= np.linalg.norm(u)
    v = np.cross(n, u)
    pu, pv = pts @ u, pts @ v
    return float(np.percentile(pv, 98) - np.percentile(pv, 2)), float(np.percentile(pu, 98) - np.percentile(pu, 2))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--no-depthpro", action="store_true")
    a = ap.parse_args()
    est = DepthEstimator(cam_height_m=None)
    if not a.no_depthpro:
        from roadvision.depthpro import DepthPro
        dpro = DepthPro()
    frames = sorted((RSRD / "extracted" / "RSRD-dense" / "test" / "depth_half").glob("*.png"))
    if a.limit:
        frames = frames[:a.limit]
    rows = []
    for dp in frames:
        gt = cv2.imread(str(dp), cv2.IMREAD_UNCHANGED).astype(np.float32) / 256.0
        bgr = cv2.imread(str(dp).replace("depth_half", "left_half").replace(".png", ".jpg"))
        h, w = gt.shape
        f, cx, cy = calib_for(dp.stem)
        valid = gt > 0.5
        road_ys, road_xs = np.nonzero(valid)
        if len(road_ys) < 2000:
            continue
        # ruler: valid pixels in the centre-bottom of the measured road
        y0, y1 = np.percentile(road_ys, [55, 90]).astype(int)
        x0, x1 = int(w * 0.38), int(w * 0.62)
        box = np.zeros_like(valid)
        box[y0:y1, x0:x1] = True
        ry, rx = np.nonzero(box & valid)
        if len(ry) < 300:
            continue
        sub = slice(None, None, 7)
        gt_road = backproject(gt, road_ys[sub], road_xs[sub], f, cx, cy)
        plane = ransac_plane(gt_road, iters=300, tol=0.01)
        if plane is None:
            continue
        n_gt, h_gt = plane
        L_gt, W_gt = extents(backproject(gt, ry, rx, f, cx, cy), n_gt)

        raw = est.depth_map(bgr)  # original model, no scale correction
        res = {"frame": dp.stem, "true_height_m": float(h_gt), "L_gt": L_gt, "W_gt": W_gt}
        for name, focal, mode in [("vehicle", f, "true_h"), ("exif_model", f, "model"),
                                  ("noexif_model", (w / 2) / np.tan(np.radians(35)), "model"),
                                  ("exif_gravity", f, "gravity"), ("exif_prior", f, "prior")]:
            ccx, ccy = (cx, cy) if focal == f else (w / 2, h / 2)
            pts_road = backproject(raw, road_ys[sub], road_xs[sub], focal, ccx, ccy)
            pl = ransac_plane(pts_road, iters=300, tol=0.01)
            if pl is None:
                continue
            n, h_model = pl
            if mode == "gravity":  # tilt known from the phone sensors: distance of road points to that plane
                n = n_gt
                h_model = float(np.median(pts_road @ (-n_gt))) if np.median(pts_road @ n_gt) < 0 else float(np.median(pts_road @ n_gt))
            scale = {"true_h": h_gt / h_model, "model": 1.0, "gravity": 1.0, "prior": PRIOR_H / h_model}[mode]
            L, W = extents(backproject(raw * scale, ry, rx, focal, ccx, ccy), n)
            res[name] = {"h_used": float(h_model * scale), "L": L, "W": W}
        # pure geometry: road plane from the phone tilt (here the true plane normal stands in for the gravity
        # sensor), EXIF focal, camera height known or assumed -> each road pixel placed by ray-plane intersection
        for name, hh in [("geo_true_height", h_gt), ("geo_tilt_prior", PRIOR_H)]:
            rays = np.stack([(rx - cx) / f, (ry - cy) / f, np.ones(len(rx))], 1)
            t = -hh / (rays @ n_gt)
            ok = t > 0
            L, W = extents(rays[ok] * t[ok, None], n_gt)
            res[name] = {"h_used": float(hh), "L": L, "W": W}
        if a.no_depthpro:
            rows.append(res)
            continue
        # Depth Pro: blind (its own focal + scale), with EXIF focal, and with EXIF focal + hand-held height
        for name, known_f, prior in [("dp_blind", None, False), ("dp_exif", f, False), ("dp_exif_prior", f, True)]:
            dd, fu = dpro.predict(bgr, focal_px=known_f)
            ccx, ccy = (cx, cy) if known_f else (w / 2, h / 2)
            pts_road = backproject(dd, road_ys[sub], road_xs[sub], fu, ccx, ccy)
            pl = ransac_plane(pts_road, iters=300, tol=0.01)
            if pl is None:
                continue
            n, h_model = pl
            scale = PRIOR_H / h_model if prior else 1.0
            L, W = extents(backproject(dd * scale, ry, rx, fu, ccx, ccy), n)
            res[name] = {"h_used": float(h_model * scale), "L": L, "W": W, "focal_used": fu}
        rows.append(res)
    (ROOT / "reports" / "citizen_scale_rsrd.json").write_text(json.dumps(rows, indent=1))
    summarize(rows)


def summarize(rows):
    hs = [r["true_height_m"] for r in rows]
    lines = ["| scenario | n | height used (median) | length error (median) | width error (median) | within 20 % |",
             "|---|---:|---:|---:|---:|---:|"]
    for s in ["vehicle", "exif_model", "noexif_model", "exif_gravity", "exif_prior", "geo_true_height", "geo_tilt_prior",
              "dp_blind", "dp_exif", "dp_exif_prior"]:
        r = [x for x in rows if s in x]
        if not r:
            continue
        le = np.array([abs(x[s]["L"] / x["L_gt"] - 1) for x in r])
        we = np.array([abs(x[s]["W"] / x["W_gt"] - 1) for x in r])
        both = np.mean((le < 0.2) & (we < 0.2))
        lines.append(f"| {s} | {len(r)} | {np.median([x[s]['h_used'] for x in r]):.2f} m | {np.median(le) * 100:.0f} % | "
                     f"{np.median(we) * 100:.0f} % | {both * 100:.0f} % |")
    lines.append(f"\nTrue camera height: {np.median(hs):.2f} m (range {min(hs):.2f}-{max(hs):.2f}); "
                 f"ruler size: length {np.median([r['L_gt'] for r in rows]):.2f} m, width {np.median([r['W_gt'] for r in rows]):.2f} m.")
    text = "\n".join(lines)
    print(text)
    (ROOT / "reports" / "citizen_scale_rsrd.md").write_text(text + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
