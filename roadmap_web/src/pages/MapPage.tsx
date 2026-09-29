import { useMemo, useState } from "react";
import { CircleMarker, MapContainer, Pane, Polyline, Popup, TileLayer, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Layers, Search, SlidersHorizontal } from "lucide-react";
import { api } from "@/api";
import { useDefectDrawer } from "@/components/DefectDrawer";
import {
  ASSET_COLOR, CONDITION_COLOR, CONDITION_LABEL, DEFECT_LABEL, SEVERITY_COLOR, SEVERITY_LABEL, SEVERITY_ORDER, fmtDate, fmtTnd,
} from "@/config/labels";
import { PILOT_ZONE } from "@/mocks/generate";
import { useApi } from "@/state/useApi";
import type { DefectType, RoadSegment, Severity } from "@/types/domain";

/** Fonds de carte sans clé d'API. En production : fond hébergé (tuiles propres ou fournisseur sous contrat). */
const BASEMAPS = {
  plan: {
    label: "Plan",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Fond &copy; Esri, HERE, Garmin, &copy; OpenStreetMap",
    maxNativeZoom: 16,
  },
  osm: {
    label: "Détaillé",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxNativeZoom: 19,
  },
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Imagerie &copy; Esri",
    maxNativeZoom: 18,
  },
} as const;

const TYPE_GROUPS: { label: string; types: DefectType[] }[] = [
  { label: "Nids-de-poule", types: ["nid_de_poule"] },
  { label: "Fissures", types: ["fissure_longitudinale", "fissure_transversale", "faiencage"] },
  { label: "Affaissements", types: ["affaissement"] },
  { label: "Plaques d'égout défectueuses", types: ["plaque_egout_defectueuse"] },
  { label: "Trottoirs", types: ["dalle_cassee", "bordure_cassee", "ressaut", "soulevement_racine"] },
];

const SEV_RADIUS: Record<Severity, number> = { critique: 9, elevee: 7.5, moyenne: 6.5, faible: 5.5 };
const CLASS_WEIGHT: Record<string, number> = { trunk: 7, primary: 6.5, secondary: 5.5, tertiary: 4.5, unclassified: 4 };

type StatusFilter = "actifs" | "traites" | "tous";

export default function MapPage() {
  const { open } = useDefectDrawer();
  const { data: defects } = useApi(() => api.listDefects());
  const { data: segments } = useApi(() => api.listSegments());
  const { data: assets } = useApi(() => api.listAssets());

  const [groups, setGroups] = useState<Set<number>>(new Set(TYPE_GROUPS.map((_, i) => i)));
  const [sevs, setSevs] = useState<Set<Severity>>(new Set(SEVERITY_ORDER));
  const [status, setStatus] = useState<StatusFilter>("actifs");
  const [search, setSearch] = useState("");
  const [layers, setLayers] = useState({ segments: true, defects: true, assets: true, uncovered: true });
  const [basemap, setBasemap] = useState<keyof typeof BASEMAPS>("plan");
  const [filtersOpen, setFiltersOpen] = useState(() => window.innerWidth > 720);

  const visible = useMemo(() => {
    const types = new Set(TYPE_GROUPS.filter((_, i) => groups.has(i)).flatMap((g) => g.types));
    const q = search.trim().toLowerCase();
    return (defects ?? []).filter((d) => {
      const treated = d.status === "repare" || d.status === "verifie";
      if (status === "actifs" && treated) return false;
      if (status === "traites" && !treated) return false;
      return types.has(d.type) && sevs.has(d.severity) && (!q || `${d.id} ${d.roadName}`.toLowerCase().includes(q));
    });
  }, [defects, groups, sevs, status, search]);

  const segStats = useMemo(() => {
    const c = { bon: 0, degrade: 0, critique: 0, non_couvert: 0 };
    segments?.forEach((s) => c[s.condition]++);
    return c;
  }, [segments]);

  const toggle = <T,>(set: Set<T>, v: T, apply: (s: Set<T>) => void) => {
    const n = new Set(set);
    n.has(v) ? n.delete(v) : n.add(v);
    apply(n);
  };

  const segStyle = (s: RoadSegment) => {
    const w = CLASS_WEIGHT[s.roadClass] ?? 4;
    if (s.condition === "non_couvert") return { color: CONDITION_COLOR.non_couvert, weight: w - 1, opacity: 0.85, dashArray: "6 7" };
    if (s.condition === "bon") return { color: CONDITION_COLOR.bon, weight: w - 1.5, opacity: 0.55 };
    return { color: CONDITION_COLOR[s.condition], weight: w + 1.5, opacity: 0.9 };
  };

  const critical = visible.filter((d) => d.severity === "critique").length;
  const cost = visible.reduce((a, d) => a + d.cost.amountTnd, 0);

  return (
    <div className="map-wrap">
      <MapContainer center={[PILOT_ZONE.center.lat, PILOT_ZONE.center.lng]} zoom={PILOT_ZONE.zoom} zoomControl={false} preferCanvas>
        <TileLayer key={basemap} url={BASEMAPS[basemap].url} attribution={BASEMAPS[basemap].attribution} maxNativeZoom={BASEMAPS[basemap].maxNativeZoom} maxZoom={19} />

        {layers.segments && segments?.filter((s) => layers.uncovered || s.condition !== "non_couvert").map((s) => (
          <Polyline key={s.id} positions={s.coords} pathOptions={segStyle(s)}>
            <Popup>
              <b>{s.roadName ?? "Voie sans nom"}</b>
              <div style={{ marginTop: 4 }}>
                <span className="legend-line" style={{ background: CONDITION_COLOR[s.condition] }} />
                {CONDITION_LABEL[s.condition]}
              </div>
              <div className="small muted" style={{ marginTop: 4 }}>
                {s.defectIds.length} défaut(s) sur ce tronçon · dernier passage {s.lastPass ? fmtDate(s.lastPass) : "—"}
              </div>
              {s.condition === "non_couvert" && <div className="small" style={{ marginTop: 4, color: "#8a6300" }}>Tronçon non parcouru récemment : état inconnu.</div>}
            </Popup>
          </Polyline>
        ))}

        <Pane name="assets" style={{ zIndex: 450 }}>
          {layers.assets && assets?.map((a) => (
            <CircleMarker key={a.id} center={[a.position.lat, a.position.lng]} radius={4} pane="assets"
              pathOptions={{ color: "#fff", weight: 1.5, fillColor: ASSET_COLOR, fillOpacity: 1 }}>
              <Tooltip>Plaque d'égout — intacte (non comptée comme défaut)</Tooltip>
            </CircleMarker>
          ))}
        </Pane>

        <Pane name="defects" style={{ zIndex: 460 }}>
          {layers.defects && visible.map((d) => (
            <CircleMarker key={d.id} center={[d.position.lat, d.position.lng]} radius={SEV_RADIUS[d.severity]} pane="defects"
              pathOptions={{ color: "#fff", weight: 2, fillColor: SEVERITY_COLOR[d.severity], fillOpacity: d.status === "repare" || d.status === "verifie" ? 0.45 : 1, dashArray: d.surface === "trottoir" ? "2 2" : undefined }}
              eventHandlers={{ click: () => open(d.id) }}>
              <Tooltip direction="top" offset={[0, -6]}>
                <b>{DEFECT_LABEL[d.type]}</b> · {SEVERITY_LABEL[d.severity]}
                <br />
                <span className="muted">{d.roadName} · priorité {d.priority.score}/100</span>
              </Tooltip>
            </CircleMarker>
          ))}
        </Pane>
      </MapContainer>

      {/* ---- filtres ---- */}
      <div className={`map-panel map-filters ${filtersOpen ? "" : "collapsed"}`}>
        <div style={{ padding: "14px 16px 10px" }}>
          <div className="row" style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 10, color: "var(--ink-3)" }} />
            <input className="input" style={{ width: "100%", paddingLeft: 32 }} placeholder="Rechercher une voie ou un n° de défaut" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div style={{ padding: "4px 16px 12px", borderTop: "1px solid var(--line)" }}>
          <div className="small muted" style={{ margin: "10px 0 6px", fontWeight: 600 }}>Statut</div>
          <div className="row" style={{ gap: 6 }}>
            {(["actifs", "traites", "tous"] as StatusFilter[]).map((s) => (
              <span key={s} className={`chip ${status === s ? "on" : ""}`} onClick={() => setStatus(s)}>
                {s === "actifs" ? "À traiter" : s === "traites" ? "Réparés" : "Tous"}
              </span>
            ))}
          </div>
          <div className="small muted" style={{ margin: "12px 0 6px", fontWeight: 600 }}>Gravité</div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {SEVERITY_ORDER.map((s) => (
              <span key={s} className={`chip ${sevs.has(s) ? "on" : ""}`} onClick={() => toggle(sevs, s, setSevs)}>
                <span className="dot" style={{ background: SEVERITY_COLOR[s] }} /> {SEVERITY_LABEL[s]}
              </span>
            ))}
          </div>
          <div className="small muted" style={{ margin: "12px 0 6px", fontWeight: 600 }}>Type de défaut</div>
          <div className="stack" style={{ gap: 6 }}>
            {TYPE_GROUPS.map((g, i) => {
              const n = (defects ?? []).filter((d) => g.types.includes(d.type) && (status === "tous" || (status === "actifs") === !(d.status === "repare" || d.status === "verifie"))).length;
              return (
                <label key={g.label} className="row small" style={{ cursor: "pointer" }}>
                  <input type="checkbox" checked={groups.has(i)} onChange={() => toggle(groups, i, setGroups)} />
                  {g.label}
                  <span className="muted num" style={{ marginLeft: "auto" }}>{n}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div style={{ padding: "4px 16px 14px", borderTop: "1px solid var(--line)" }}>
          <div className="row small muted" style={{ margin: "10px 0 6px", fontWeight: 600 }}><Layers size={13} /> Couches</div>
          <div className="stack" style={{ gap: 6 }}>
            {([
              ["segments", "État des tronçons"],
              ["uncovered", "Zones non couvertes"],
              ["defects", "Défauts"],
              ["assets", "Plaques d'égout intactes"],
            ] as const).map(([k, label]) => (
              <label key={k} className="row small" style={{ cursor: "pointer" }}>
                <input type="checkbox" checked={layers[k]} onChange={() => setLayers({ ...layers, [k]: !layers[k] })} /> {label}
              </label>
            ))}
          </div>
          <div className="row" style={{ gap: 6, marginTop: 12 }}>
            {(Object.keys(BASEMAPS) as (keyof typeof BASEMAPS)[]).map((b) => (
              <span key={b} className={`chip ${basemap === b ? "on" : ""}`} onClick={() => setBasemap(b)}>{BASEMAPS[b].label}</span>
            ))}
          </div>
        </div>
      </div>

      <button className="btn primary filters-toggle" onClick={() => setFiltersOpen(!filtersOpen)}>
        <SlidersHorizontal size={15} /> {filtersOpen ? "Voir la carte" : `Filtres · ${visible.length} défauts`}
      </button>

      {/* ---- chiffres de la vue ---- */}
      <div className="map-panel map-stats">
        <div><div className="v num">{visible.length}</div><div className="k">défauts affichés</div></div>
        <div><div className="v num" style={{ color: "var(--sev-critique)" }}>{critical}</div><div className="k">critiques</div></div>
        <div><div className="v num">{fmtTnd(cost)}</div><div className="k">coût estimé</div></div>
        <div><div className="v num" style={{ color: "var(--uncovered)" }}>{segStats.non_couvert}</div><div className="k">tronçons non couverts</div></div>
      </div>

      {/* ---- légende ---- */}
      <div className="map-panel map-legend">
        <div style={{ fontWeight: 600, marginBottom: 6 }}>État des tronçons</div>
        {(["critique", "degrade", "bon"] as const).map((c) => (
          <div key={c}><span className="legend-line" style={{ background: CONDITION_COLOR[c] }} />{CONDITION_LABEL[c]}</div>
        ))}
        <div><span className="legend-line dashed" />{CONDITION_LABEL.non_couvert}</div>
        <div style={{ fontWeight: 600, margin: "8px 0 6px" }}>Défauts</div>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          {SEVERITY_ORDER.map((s) => (
            <span key={s} className="row" style={{ gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: SEVERITY_COLOR[s], display: "inline-block" }} />{SEVERITY_LABEL[s]}</span>
          ))}
        </div>
        <div className="row" style={{ gap: 5, marginTop: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: ASSET_COLOR, display: "inline-block" }} /> Plaque d'égout intacte
        </div>
      </div>
    </div>
  );
}
