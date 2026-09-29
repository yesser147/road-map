"""WP2 HTTP service. WP4 calls it; the demo page (demo/index.html) is served at /.

Run:  uvicorn roadvision.api:app --app-dir src --port 8002
Env:  ROADVISION_WEIGHTS (path), ROADVISION_DEPTH=1 to enable depth by default.

Endpoints
  GET  /health                  -> {"status": "ok", ...}
  GET  /v1/model                -> model + class taxonomy (the "model format" contract)
  POST /v1/detect               -> DetectionEvent v1   (multipart: file + form fields)
  POST /v1/cluster              -> merged defect entities from many observations (JSON)
  POST /v1/detect/annotated     -> JPEG with boxes drawn (for quick visual checks)
"""
from __future__ import annotations

import json
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .clustering import Observation, cluster_observations
from .config import CLASSES, MODEL_VERSION, ROOT
from .pipeline import VisionPipeline
from .schemas import DetectionEvent

_pipe: VisionPipeline | None = None


def pipe() -> VisionPipeline:
    global _pipe
    if _pipe is None:
        _pipe = VisionPipeline(weights=os.getenv("ROADVISION_WEIGHTS") or None,
                               use_depth=os.getenv("ROADVISION_DEPTH", "0") == "1")
    return _pipe


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Préchargement : détecteur + filtre photo (CLIP) chargés et « chauffés » au démarrage,
    # pour que le premier signalement citoyen ne paie pas ~30 s de chargement.
    warm = np.full((480, 640, 3), 110, np.uint8)
    pipe().analyze(warm, "warmup", source="citizen", with_embedding=False)
    pipe().depth.depth_map(warm)  # modèle de profondeur (sinon chargé au premier nid-de-poule)
    yield


app = FastAPI(title="Road Map - WP2 Vision", version=MODEL_VERSION, lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def _decode(data: bytes) -> np.ndarray:
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "file is not a readable image")
    return img


@app.get("/health")
def health():
    return {"status": "ok", "version": MODEL_VERSION, "detector": pipe().detector.name}


@app.get("/v1/model")
def model_info():
    return {"version": MODEL_VERSION, "detector": pipe().detector.name, "input_size": pipe().detector.imgsz,
            "classes": CLASSES, "schema": "contracts/detection_event.schema.json"}


@app.post("/v1/detect", response_model=DetectionEvent, response_model_exclude_none=False)
async def detect(
    file: UploadFile = File(...),
    image_id: Optional[str] = Form(None),
    source: str = Form("unknown"),
    lat: Optional[float] = Form(None),
    lon: Optional[float] = Form(None),
    accuracy_m: Optional[float] = Form(None),
    heading_deg: Optional[float] = Form(None),
    captured_at: Optional[datetime] = Form(None),
    filter_photo: Optional[bool] = Form(None),
    with_depth: Optional[bool] = Form(None),
    with_embedding: bool = Form(True),
    conf: Optional[float] = Form(None),
):
    if source not in ("vehicle", "pedestrian", "citizen", "unknown"):
        raise HTTPException(422, "source must be vehicle|pedestrian|citizen|unknown")
    img = _decode(await file.read())
    gps = {"lat": lat, "lon": lon, "accuracy_m": accuracy_m, "heading_deg": heading_deg} if lat is not None and lon is not None else None
    p = pipe()
    old = p.detector.conf
    if conf is not None:
        p.detector.conf = conf
    try:
        return p.analyze(img, image_id or uuid.uuid4().hex, source=source, gps=gps, captured_at=captured_at,
                         filter_photo=filter_photo, with_depth=with_depth, with_embedding=with_embedding)
    finally:
        p.detector.conf = old


COLORS = {0: (255, 170, 0), 1: (0, 200, 255), 2: (200, 0, 255), 3: (0, 0, 255), 4: (160, 160, 160)}


@app.post("/v1/detect/annotated")
async def detect_annotated(file: UploadFile = File(...), with_depth: Optional[bool] = Form(None)):
    img = _decode(await file.read())
    ev = pipe().analyze(img, "annotated", with_depth=with_depth, with_embedding=False, filter_photo=False)
    for d in ev.detections:
        x1, y1, x2, y2 = map(int, d.bbox_xyxy)
        col = COLORS.get(d.class_id, (0, 255, 0))
        cv2.rectangle(img, (x1, y1), (x2, y2), col, 2)
        label = f"{d.class_name} {d.confidence:.2f}" + (f" {d.depth_cm}cm" if d.depth_cm is not None else "")
        cv2.putText(img, label, (x1, max(12, y1 - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, col, 2)
    ok, buf = cv2.imencode(".jpg", img)
    return Response(buf.tobytes(), media_type="image/jpeg", headers={"X-Detection-Event": json.dumps(len(ev.detections))})


class ObservationIn(BaseModel):
    obs_id: str
    class_name: str
    lat: float
    lon: float
    confidence: float = 1.0
    embedding: Optional[list[float]] = None


class ClusterRequest(BaseModel):
    observations: list[ObservationIn]
    radius_m: float = 8.0
    sim_min: float = 0.80


@app.post("/v1/cluster")
def cluster(req: ClusterRequest):
    obs = [Observation(**o.model_dump()) for o in req.observations]
    return {"entities": [c.__dict__ for c in cluster_observations(obs, req.radius_m, req.sim_min)]}


@app.get("/")
def demo_page():
    return FileResponse(ROOT / "demo" / "index.html")


@app.get("/v1/samples")
def samples():
    d = ROOT / "demo" / "samples"
    return sorted(p.name for p in d.glob("*.jpg")) if d.exists() else []


if (ROOT / "demo" / "samples").exists():
    app.mount("/samples", StaticFiles(directory=ROOT / "demo" / "samples"), name="samples")
