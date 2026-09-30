import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Bus, CheckCircle2, Circle, Info, Loader2, Truck } from "lucide-react";
import { api } from "@/api";
import { SeverityBadge } from "@/components/Badges";
import { useDefectDrawer } from "@/components/DefectDrawer";
import { BRAND_COLOR, DEFECT_LABEL, SEVERITY_COLOR, fmtDate } from "@/config/labels";
import { useApi } from "@/state/useApi";
import type { CaptureRun, CaptureVehicle } from "@/types/domain";

const fmtN = (n: number) => n.toLocaleString("fr-FR");
const fmtDur = (sec?: number) => (sec == null ? "—" : sec < 60 ? `${sec} s` : `${Math.floor(sec / 60)} min ${String(sec % 60).padStart(2, "0")} s`);
const time = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

function FitTrack({ run }: { run: CaptureRun }) {
  const map = useMap();
  useEffect(() => {
    const pts = run.track.flat();
    if (pts.length) map.fitBounds(L.latLngBounds(pts as L.LatLngTuple[]), { padding: [24, 24] });
  }, [run.id, map, run.track]);
  return null;
}

function VehicleIcon({ v, size = 16 }: { v: CaptureVehicle; size?: number }) {
  return v.kind === "bus" ? <Bus size={size} /> : <Truck size={size} />;
}

export default function CapturesPage() {
  const { open } = useDefectDrawer();
  const { data, loading } = useApi(() => api.getCaptures());
  const [vehicle, setVehicle] = useState<string>("");
  const [runId, setRunId] = useState<string | null>(null);

  const runs = useMemo(() => (data?.runs ?? []).filter((r) => !vehicle || r.vehicleId === vehicle), [data, vehicle]);
  const run = runs.find((r) => r.id === runId) ?? runs[0];
  const vehicleOf = (id: string) => data?.vehicles.find((v) => v.id === id);

  const weekAgo = Date.now() - 7 * 86_400_000;
  const week = (data?.runs ?? []).filter((r) => new Date(r.startedAt).getTime() >= weekAgo);
  const totals = {
    trips: week.length,
    km: week.reduce((a, r) => a + r.distanceKm, 0),
    hours: week.reduce((a, r) => a + r.videoMinutes, 0) / 60,
    frames: week.reduce((a, r) => a + r.framesAnalyzed, 0),
    detections: week.reduce((a, r) => a + r.detections.length, 0),
    newDefects: week.reduce((a, r) => a + r.detections.filter((d) => d.isNew).length, 0),
  };

  if (loading && !data) return <div className="skeleton" style={{ height: 400 }} />;
  if (!data) return <div className="empty">Données de collecte indisponibles.</div>;

  return (
    <div className="stack" style={{ gap: 20 }}>
      {data.simulated && (
        <div className="notice">
          <Info size={15} />
          <span>
            Données de démonstration : le service de traitement des vidéos (WP1) n'est pas encore connecté. Les images et
            positions affichées correspondent aux défauts de la carte.
          </span>
        </div>
      )}

      {/* ---- indicateurs 7 jours ---- */}
      <section className="statline">
        <div><span className="k">Trajets filmés (7 j)</span><span className="v num">{totals.trips}</span></div>
        <div><span className="k">Distance couverte</span><span className="v num">{fmtN(Math.round(totals.km))} km</span></div>
        <div><span className="k">Vidéo traitée</span><span className="v num">{totals.hours.toFixed(1)} h</span></div>
        <div><span className="k">Images analysées</span><span className="v num">{fmtN(totals.frames)}</span></div>
        <div><span className="k">Détections</span><span className="v num">{fmtN(totals.detections)}</span></div>
        <div><span className="k">Nouveaux défauts</span><span className="v num">{totals.newDefects}</span></div>
      </section>

      {/* ---- flotte ---- */}
      <section className="fleet">
        <button className={`fleet-item ${vehicle === "" ? "on" : ""}`} onClick={() => { setVehicle(""); setRunId(null); }}>
          <span className="fleet-id">Tous les véhicules</span>
          <span className="small muted">{data.vehicles.length} véhicules équipés</span>
        </button>
        {data.vehicles.map((v) => (
          <button key={v.id} className={`fleet-item ${vehicle === v.id ? "on" : ""}`} onClick={() => { setVehicle(v.id); setRunId(null); }}>
            <span className="fleet-id"><VehicleIcon v={v} size={14} /> {v.id}</span>
            <span className="small">{v.label}</span>
            <span className="small muted">Dernière synchronisation {v.lastSync ? `${fmtDate(v.lastSync)}, ${time(v.lastSync)}` : "—"}</span>
          </button>
        ))}
      </section>

      <div className="grid resp" style={{ gridTemplateColumns: "minmax(280px, 340px) minmax(0, 1fr)", alignItems: "start" }}>
        {/* ---- trajets ---- */}
        <div className="card">
          <div className="card-h"><h3>Trajets</h3><span className="right small muted">{runs.length}</span></div>
          <div style={{ maxHeight: 640, overflowY: "auto" }}>
            {runs.map((r) => {
              const v = vehicleOf(r.vehicleId)!;
              return (
                <button key={r.id} className={`run-row ${run?.id === r.id ? "on" : ""}`} onClick={() => setRunId(r.id)}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span className="mono">{v.id}</span>
                    <span className="small muted">{fmtDate(r.startedAt)} · {time(r.startedAt)}</span>
                  </div>
                  <div className="row small" style={{ justifyContent: "space-between", marginTop: 3 }}>
                    <span className="muted">{r.distanceKm} km · {r.durationMin} min</span>
                    {r.status === "en_traitement"
                      ? <span className="tag warn">En traitement</span>
                      : <span className="tag">{r.detections.length} détection{r.detections.length > 1 ? "s" : ""}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ---- détail du trajet ---- */}
        {run && (
          <div className="stack" style={{ gap: 16 }}>
            <div className="card">
              <div className="card-h" style={{ flexWrap: "wrap" }}>
                <div>
                  <h3 className="row" style={{ gap: 8 }}><VehicleIcon v={vehicleOf(run.vehicleId)!} /> {run.vehicleId} — {vehicleOf(run.vehicleId)?.label}</h3>
                  <div className="small muted">{fmtDate(run.startedAt)}, départ {time(run.startedAt)} · {vehicleOf(run.vehicleId)?.camera} · véhicule {vehicleOf(run.vehicleId)?.plateMasked}</div>
                </div>
                <span className={`right tag ${run.status === "en_traitement" ? "warn" : "ok"}`}>{run.status === "en_traitement" ? "En traitement" : "Publié sur la carte"}</span>
              </div>
              <div className="figures">
                <div><span className="k">Distance</span><span className="v num">{run.distanceKm} km</span></div>
                <div><span className="k">Vidéo</span><span className="v num">{run.videoMinutes} min</span></div>
                <div><span className="k">Images extraites</span><span className="v num">{fmtN(run.framesExtracted)}</span></div>
                <div><span className="k">Images analysées</span><span className="v num">{fmtN(run.framesAnalyzed)}</span></div>
                <div><span className="k">Images floutées</span><span className="v num">{fmtN(run.framesBlurred)}</span></div>
                <div><span className="k">Détections</span><span className="v num">{run.detections.length}</span></div>
              </div>

              {/* chaîne de traitement */}
              <ol className="pipeline">
                {run.pipeline.map((s) => (
                  <li key={s.key} className={s.status}>
                    <span className="pl-icon">
                      {s.status === "termine" ? <CheckCircle2 size={16} /> : s.status === "en_cours" ? <Loader2 size={16} className="spin" /> : <Circle size={16} />}
                    </span>
                    <span className="pl-label">{s.label}</span>
                    <span className="pl-detail small muted">{s.detail}</span>
                    <span className="pl-dur small mono">{s.status === "termine" ? fmtDur(s.durationSec) : s.status === "en_cours" ? "en cours" : "—"}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="card" style={{ overflow: "hidden" }}>
              <div className="card-h"><h3>Tracé GPS et détections</h3><span className="right small muted">Cliquez sur un point pour ouvrir la fiche</span></div>
              <div style={{ height: 340 }}>
                <MapContainer center={[37.2745, 9.8655]} zoom={14} zoomControl={false} style={{ height: "100%" }} preferCanvas>
                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                    attribution="Fond &copy; Esri, &copy; OpenStreetMap" maxNativeZoom={16} maxZoom={19} />
                  <FitTrack run={run} />
                  {run.track.map((t, i) => (
                    <Polyline key={i} positions={t} pathOptions={{ color: BRAND_COLOR, weight: 4, opacity: 0.6 }} />
                  ))}
                  {run.detections.map((d) => (
                    <CircleMarker key={d.id} center={[d.position.lat, d.position.lng]} radius={7}
                      pathOptions={{ color: "#fff", weight: 2, fillColor: SEVERITY_COLOR[d.severity], fillOpacity: 1 }}
                      eventHandlers={{ click: () => open(d.defectId) }}>
                      <Tooltip direction="top" offset={[0, -6]}>{DEFECT_LABEL[d.type]} · {d.roadName} · {d.videoTime}</Tooltip>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-h">
                <h3>Images avec défaut détecté</h3>
                <span className="right small muted">{run.detections.length} image{run.detections.length > 1 ? "s" : ""}</span>
              </div>
              {run.detections.length === 0 ? (
                <div className="empty">{run.status === "en_traitement" ? "Analyse en cours — les détections apparaîtront ici." : "Aucun défaut détecté sur ce trajet."}</div>
              ) : (
                <div className="frames">
                  {run.detections.map((d) => (
                    <button key={d.id} className="frame" onClick={() => open(d.defectId)}>
                      <div className="frame-img">
                        {d.frameUrl && <img src={d.frameUrl} alt={DEFECT_LABEL[d.type]} loading="lazy" />}
                        <span className="frame-time mono">{d.videoTime}</span>
                        {d.isNew && <span className="frame-new">Nouveau</span>}
                      </div>
                      <div className="frame-b">
                        <div className="row" style={{ justifyContent: "space-between", gap: 6 }}>
                          <b>{DEFECT_LABEL[d.type]}</b>
                          <SeverityBadge severity={d.severity} />
                        </div>
                        <div className="small muted">{d.roadName}</div>
                        <div className="small muted mono">
                          {d.position.lat.toFixed(5)}, {d.position.lng.toFixed(5)} · {Math.round(d.confidence * 100)} %
                          {d.depthCm != null && <> · {d.depthCm} cm</>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
