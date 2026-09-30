import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/api";
import { SeverityBadge } from "@/components/Badges";
import { useDefectDrawer } from "@/components/DefectDrawer";
import { fmtDate, fmtTnd } from "@/config/labels";
import { useApi } from "@/state/useApi";

const monthLabel = (m: string) => new Date(m + "-01").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });

export default function HistoryPage() {
  const { open } = useDefectDrawer();
  const { data: timeline } = useApi(() => api.getTimeline());
  const { data: potholes } = useApi(() => api.listDefects({ types: ["nid_de_poule"] }));

  const tracked = useMemo(
    () => (potholes ?? []).filter((d) => d.observations.filter((o) => o.depthCm !== undefined).length >= 3).sort((a, b) => b.priority.score - a.priority.score).slice(0, 8),
    [potholes],
  );
  const [selId, setSelId] = useState<string | null>(null);
  const sel = tracked.find((d) => d.id === selId) ?? tracked[0];

  let cumD = 0;
  let cumR = 0;
  const tl = (timeline ?? []).map((t) => ({ ...t, label: monthLabel(t.month), cumDetected: (cumD += t.detected), cumRepaired: (cumR += t.repaired) }));
  const depthSeries = (sel?.observations ?? []).filter((o) => o.depthCm !== undefined).map((o) => ({ date: fmtDate(o.date), depth: o.depthCm }));

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="grid resp" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
        <div className="card">
          <div className="card-h"><h3>Coût du reste à faire</h3><span className="right small muted">estimation mensuelle</span></div>
          <div className="card-b" style={{ height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={tl}>
                <defs><linearGradient id="bk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1b5fa8" stopOpacity={0.35} /><stop offset="1" stopColor="#1b5fa8" stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="#ecebe6" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)} k`} tickLine={false} axisLine={false} fontSize={12} width={44} />
                <Tooltip formatter={(v) => fmtTnd(Number(v))} />
                <ReferenceLine x={tl[6]?.label} stroke="#9a9a93" strokeDasharray="4 4" label={{ value: "début collecte auto.", fontSize: 11, fill: "#6b6f76", position: "insideTopLeft" }} />
                <Area type="monotone" dataKey="backlogCostTnd" name="Reste à faire" stroke="#1b5fa8" strokeWidth={2} fill="url(#bk)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Défauts détectés et réparés (cumul)</h3></div>
          <div className="card-b" style={{ height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={tl}>
                <CartesianGrid vertical={false} stroke="#ecebe6" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={34} />
                <Tooltip />
                <Line type="monotone" dataKey="cumDetected" name="Détectés" stroke="#d2612e" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="cumRepaired" name="Réparés" stroke="#1b5fa8" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><h3>Évolution d'un défaut entre les passages</h3><span className="right small muted">profondeur mesurée à chaque passage du véhicule</span></div>
        <div className="grid resp" style={{ gridTemplateColumns: "300px minmax(0,1fr)", gap: 0 }}>
          <div style={{ borderRight: "1px solid var(--line)" }}>
            {tracked.map((d) => (
              <div key={d.id} onClick={() => setSelId(d.id)} style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", cursor: "pointer", background: sel?.id === d.id ? "var(--blue-100)" : undefined }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <b className="num">{d.id}</b>
                  <SeverityBadge severity={d.severity} />
                </div>
                <div className="small muted">{d.roadName}</div>
              </div>
            ))}
          </div>
          <div className="card-b" style={{ height: 320 }}>
            {sel && (
              <>
                <div className="row small" style={{ marginBottom: 8 }}>
                  <span>Nid-de-poule {sel.id} — {sel.roadName}</span>
                  <a className="right" style={{ cursor: "pointer" }} onClick={() => open(sel.id)}>Ouvrir la fiche →</a>
                </div>
                <ResponsiveContainer height="88%">
                  <LineChart data={depthSeries}>
                    <CartesianGrid vertical={false} stroke="#ecebe6" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis unit=" cm" tickLine={false} axisLine={false} fontSize={12} width={48} />
                    <Tooltip formatter={(v) => `${v} cm`} />
                    <ReferenceLine y={6} stroke="#d2612e" strokeDasharray="4 4" label={{ value: "seuil gravité élevée", fontSize: 11, fill: "#b8541a", position: "insideTopRight" }} />
                    <ReferenceLine y={10} stroke="#d2352c" strokeDasharray="4 4" label={{ value: "seuil critique", fontSize: 11, fill: "#d2352c", position: "insideTopRight" }} />
                    <Line type="monotone" dataKey="depth" name="Profondeur" stroke="#1b5fa8" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
