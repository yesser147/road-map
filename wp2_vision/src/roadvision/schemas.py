"""Pydantic mirror of contracts/detection_event.schema.json (DetectionEvent v1)."""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class GPS(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    accuracy_m: Optional[float] = None
    heading_deg: Optional[float] = None


class ModelInfo(BaseModel):
    detector: str
    version: str
    depth_model: Optional[str] = None


class ImageInfo(BaseModel):
    width: int
    height: int


class Quality(BaseModel):
    blur_score: float
    brightness: float
    road_score: Optional[float] = None


class Detection(BaseModel):
    class_id: int
    class_name: str
    class_name_fr: str = ""
    is_defect: bool
    confidence: float = Field(ge=0, le=1)
    bbox_xyxy: list[float] = Field(min_length=4, max_length=4)
    bbox_norm: list[float] = Field(min_length=4, max_length=4)
    area_ratio: float = 0.0
    depth_cm: Optional[float] = None
    depth_method: Optional[str] = None
    # Dimensions estimées (m) à partir de la carte de profondeur ; null si la profondeur n'a pas été calculée.
    length_m: Optional[float] = None
    width_m: Optional[float] = None
    # Comment les dimensions ont été obtenues et leur incertitude typique (±%), cf. reports/dimensions_report.md :
    #   vehicle_calibrated : caméra embarquée, hauteur connue ; citizen_geometry : focale + inclinaison du téléphone
    #   + hauteur de prise de vue ; citizen_estimate : sans inclinaison, ordre de grandeur seulement.
    measure_method: Optional[Literal["vehicle_calibrated", "citizen_geometry", "citizen_estimate"]] = None
    size_uncertainty_pct: Optional[float] = None
    severity: Literal["low", "medium", "high"]
    severity_score: float = Field(ge=0, le=1)
    embedding: Optional[list[float]] = None


class DetectionEvent(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    image_id: str
    source: Literal["vehicle", "pedestrian", "citizen", "unknown"] = "unknown"
    captured_at: Optional[datetime] = None
    gps: Optional[GPS] = None
    model: ModelInfo
    image: ImageInfo
    accepted: bool
    rejection_reason: Optional[Literal["blurry", "too_dark", "not_road", "too_small"]] = None
    quality: Optional[Quality] = None
    detections: list[Detection] = []
    timing_ms: dict[str, float] = {}
