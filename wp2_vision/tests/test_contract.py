"""Contract tests: the pipeline output must validate against contracts/detection_event.schema.json,
and clustering must merge repeated passes over the same defect into one entity.
Run: pytest -q tests
"""
import json
import sys
from pathlib import Path

import numpy as np
import pytest
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from roadvision.clustering import Observation, cluster_observations  # noqa: E402
from roadvision.severity import severity  # noqa: E402

SCHEMA = json.loads((ROOT / "contracts" / "detection_event.schema.json").read_text())


def test_cluster_merges_repeated_passes():
    # same pothole seen on 3 passes with ~3 m GPS noise, plus a different one 40 m away
    base = (36.8065, 10.1815)
    obs = [Observation(f"p{i}", "pothole", base[0] + d, base[1] + d) for i, d in enumerate([0, 2e-5, -2e-5])]
    obs.append(Observation("far", "pothole", base[0] + 4e-4, base[1]))
    obs.append(Observation("crack", "transverse_crack", base[0], base[1]))
    ents = cluster_observations(obs)
    assert len(ents) == 3
    assert sorted(e.n_observations for e in ents) == [1, 1, 3]


def test_severity_rules():
    assert severity("manhole", 0.2, None, 0.9) == ("low", 0.0)
    assert severity("pothole", 0.01, 8.0, 0.9)[0] == "high"
    assert severity("pothole", 0.01, 2.0, 0.9)[0] == "low"


@pytest.mark.skipif(not any((ROOT / "models").glob("*.pt")), reason="no weights")
def test_event_validates_against_schema():
    from roadvision.pipeline import VisionPipeline

    img = (np.random.rand(480, 640, 3) * 255).astype(np.uint8)
    ev = VisionPipeline(use_clip_filter=False).analyze(img, "t1", source="vehicle", gps={"lat": 36.8, "lon": 10.18})
    data = json.loads(ev.model_dump_json())
    errors = list(Draft202012Validator(SCHEMA).iter_errors(data))
    assert not errors, errors
