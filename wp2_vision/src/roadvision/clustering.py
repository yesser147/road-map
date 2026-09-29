"""Merge repeated detections of the same physical defect into one entity.

Two detections are the same defect when they share a class, lie within
GEO_RADIUS_M of each other, and (when both have embeddings) their appearance
cosine similarity is >= SIM_MIN. Connected components give the entities.
Contract criterion: one real defect -> one database entity after repeated passes.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np

GEO_RADIUS_M = 8.0
SIM_MIN = 0.80


@dataclass
class Observation:
    obs_id: str
    class_name: str
    lat: float
    lon: float
    confidence: float = 1.0
    embedding: list[float] | None = None


@dataclass
class DefectCluster:
    cluster_id: int
    class_name: str
    lat: float
    lon: float
    n_observations: int
    obs_ids: list[str] = field(default_factory=list)
    mean_confidence: float = 0.0


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6_371_000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _cos(a, b) -> float:
    a, b = np.asarray(a, float), np.asarray(b, float)
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))


def cluster_observations(obs: list[Observation], radius_m: float = GEO_RADIUS_M, sim_min: float = SIM_MIN) -> list[DefectCluster]:
    parent = list(range(len(obs)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for i in range(len(obs)):
        for j in range(i + 1, len(obs)):
            a, b = obs[i], obs[j]
            if a.class_name != b.class_name:
                continue
            if haversine_m(a.lat, a.lon, b.lat, b.lon) > radius_m:
                continue
            if a.embedding is not None and b.embedding is not None and _cos(a.embedding, b.embedding) < sim_min:
                continue
            parent[find(i)] = find(j)

    groups: dict[int, list[int]] = {}
    for i in range(len(obs)):
        groups.setdefault(find(i), []).append(i)

    out = []
    for cid, idx in enumerate(groups.values()):
        w = np.array([obs[i].confidence for i in idx])
        out.append(DefectCluster(
            cluster_id=cid,
            class_name=obs[idx[0]].class_name,
            lat=float(np.average([obs[i].lat for i in idx], weights=w)),
            lon=float(np.average([obs[i].lon for i in idx], weights=w)),
            n_observations=len(idx),
            obs_ids=[obs[i].obs_id for i in idx],
            mean_confidence=float(w.mean()),
        ))
    return out


def crop_embedding(bgr: np.ndarray, box: list[float]) -> list[float]:
    """Cheap appearance vector: HSV histogram + 8x8 grey thumbnail of the crop.

    Good enough to split two different potholes a few metres apart; replace with
    a learned embedding (e.g. DINOv2) if WP1 data shows it is not.
    """
    import cv2

    x1, y1, x2, y2 = [int(v) for v in box]
    crop = bgr[max(0, y1):y2, max(0, x1):x2]
    if crop.size == 0:
        return [0.0] * 112
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    hist = cv2.calcHist([hsv], [0, 1], None, [8, 6], [0, 180, 0, 256]).ravel()
    hist = hist / (hist.sum() + 1e-9)
    thumb = cv2.resize(cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY), (8, 8)).astype(float).ravel()
    thumb = (thumb - thumb.mean()) / (thumb.std() + 1e-9) / 8
    return [round(float(v), 4) for v in np.concatenate([hist, thumb])]
