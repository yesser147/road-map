import { Link } from "react-router-dom";
import { AlertOctagon, Banknote, CheckCircle2, Gauge, MessagesSquare, Route, Timer, TriangleAlert } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/api";
import { SeverityBadge, StatusBadge } from "@/components/Badges";
import { useDefectDrawer } from "@/components/DefectDrawer";
import { KpiCard } from "@/components/KpiCard";
import { ScorePill } from "@/components/PriorityBreakdown";
import { DEFECT_LABEL, SEVERITY_COLOR, SEVERITY_ORDER, fmtTnd } from "@/config/labels";
import { useApi } from "@/state/useApi";
import type { Defect, DefectType } from "@/types/domain";

const monthLabel = (m: string) => new Date(m + "-01").toLocaleDateString("fr-FR", { month: "short" });

export default function DashboardPage() {
  const { open } = useDefectDrawer();
  const { data: kpis } = useApi(() => api.getKpis());
  const { data: defects } = useApi(() => api.listDefects());
  const { data: timeline } = useApi(() => api.getTimeline());

  const active = (defects ?? []).filter((d) => d.status !== "repare" && d.status !== "verifie");
  const top = [...active].sort((a, b) => b.priority.score - a.priority.score).slice(0, 6);

  const byType = Object.entries(
    active.reduce<Record<string, Record<string, number>>>((acc, d) => {
      acc[d.type] ??= { critique: 0, elevee: 0, moyenne: 0, faible: 0 };
      acc[d.type][d.severity]++;
      return acc;
    }, {}),
  )
    .map(([type, v]) => ({ type: DEFECT_LABEL[type as DefectType], ...v, total: Object.values(v).reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total);

  const byDistrict = Object.values(
    active.reduce<Record<string, { district: string; n: number; crit: number; cost: number }>>((acc, d: Defect) => {
      acc[d.district] ??= { district: d.district, n: 0, crit: 0, cost: 0 };
      acc[d.district].n++;
      if (d.severity === "critique") acc[d.district].crit++;
      acc[d.district].cost += d.cost.amountTnd;
      return acc;
    }, {}),
  ).sort((a, b) => b.cost - a.cost);

  const tl = (timeline ?? []).map((t) => ({ ...t, label: monthLabel(t.month) }));
  const last = tl[tl.length - 1];
  const prev = tl[tl.length - 2];

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <KpiCard label="Défauts à traiter" icon={<TriangleAlert size={14} />} value={kpis?.activeDefects ?? "—"}
          hint={<><b style={{ color: "var(--sev-critique)" }}>{kpis?.criticalDefects ?? "—"}</b> critiques</>} accent="var(--sev-elevee)" />
        <KpiCard label="Coût du reste à faire" icon={<Banknote size={14} />} value={kpis ? fmtTnd(kpis.backlogCostTnd) : "—"} hint="estimation sourcée (barème provisoire)" accent="var(--navy-600)" />
        <KpiCard label="Indice d'état du réseau" icon={<Gauge size={14} />} value={kpis ? `${kpis.conditionIndex}/100` : "—"}
          hint={last && prev && <span className={last.conditionIndex >= prev.conditionIndex ? "trend-up" : "trend-down"}>{last.conditionIndex >= prev.conditionIndex ? "▲" : "▼"} {Math.abs(last.conditionIndex - prev.conditionIndex).toFixed(1)} pt ce mois</span>} accent="var(--ok)" />
        <KpiCard label="Couverture du réseau" icon={<Route size={14} />} value={kpis ? `${Math.round((100 * kpis.coveredKm) / kpis.networkKm)} %` : "—"}
          hint={kpis && `${kpis.coveredKm} / ${kpis.networkKm} km parcourus < 30 j`} accent="var(--uncovered)" />
        <KpiCard label="Réparés (30 j)" icon={<CheckCircle2 size={14} />} value={kpis?.repairedLast30d ?? "—"} hint={<><Timer size={11} /> délai moyen {kpis?.meanRepairDays ?? "—"} j</>} accent="var(--ok)" />
        <KpiCard label="Signalements à valider" icon={<MessagesSquare size={14} />} value={kpis?.pendingReports ?? "—"} hint={<Link to="/pro/signalements">Ouvrir la file →</Link>} accent="var(--gold-400)" />
      </div>

      <div className="grid resp" style={{ gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)" }}>
        <div className="card">
          <div className="card-h"><h3>Détections et réparations par mois</h3><span className="right small muted">collecte automatisée depuis 6 mois</span></div>
          <div className="card-b" style={{ height: 270 }}>
            <ResponsiveContainer>
              <BarChart data={tl} barGap={2}>
                <CartesianGrid vertical={false} stroke="#edf0f5" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={30} />
                <Tooltip cursor={{ fill: "#f3f5f9" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="detected" name="Détectés" fill="#e0712c" radius={[4, 4, 0, 0]} />
                <Bar dataKey="repaired" name="Réparés" fill="#2a4a7f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Indice d'état du réseau</h3></div>
          <div className="card-b" style={{ height: 270 }}>
            <ResponsiveContainer>
              <LineChart data={tl}>
                <CartesianGrid vertical={false} stroke="#edf0f5" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis domain={[40, 100]} tickLine={false} axisLine={false} fontSize={12} width={30} />
                <Tooltip />
                <Line type="monotone" dataKey="conditionIndex" name="Indice /100" stroke="#3f8f6b" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid resp" style={{ gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 1fr)" }}>
        <div className="card">
          <div className="card-h"><h3>Défauts les plus prioritaires</h3><Link className="right small" to="/pro/priorites">Tout voir →</Link></div>
          <table className="table">
            <tbody>
              {top.map((d) => (
                <tr key={d.id} className="clickable" onClick={() => open(d.id)}>
                  <td style={{ width: 50 }}><ScorePill score={d.priority.score} /></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{DEFECT_LABEL[d.type]}</div>
                    <div className="small muted">{d.roadName} · {d.district}</div>
                  </td>
                  <td><SeverityBadge severity={d.severity} /></td>
                  <td><StatusBadge status={d.status} /></td>
                  <td className="num" style={{ textAlign: "right" }}>{fmtTnd(d.cost.amountTnd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="card-h"><h3>Défauts actifs par type</h3></div>
          <div className="card-b" style={{ height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={byType} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="type" width={150} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip cursor={{ fill: "#f3f5f9" }} />
                {SEVERITY_ORDER.map((s, i) => (
                  <Bar key={s} dataKey={s} stackId="a" name={s} fill={SEVERITY_COLOR[s]} radius={i === SEVERITY_ORDER.length - 1 ? [0, 4, 4, 0] : 0} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><h3>Répartition par arrondissement</h3></div>
        <table className="table">
          <thead>
            <tr><th>Arrondissement</th><th>Défauts actifs</th><th>Critiques</th><th>Coût estimé</th><th style={{ width: "35%" }}>Part du coût</th></tr>
          </thead>
          <tbody>
            {byDistrict.map((r) => {
              const max = byDistrict[0]?.cost || 1;
              return (
                <tr key={r.district}>
                  <td style={{ fontWeight: 600 }}>{r.district}</td>
                  <td className="num">{r.n}</td>
                  <td className="num"><span className="row" style={{ gap: 6 }}>{r.crit > 0 && <AlertOctagon size={13} color="var(--sev-critique)" />}{r.crit}</span></td>
                  <td className="num">{fmtTnd(r.cost)}</td>
                  <td><div className="bar"><span style={{ width: `${(100 * r.cost) / max}%`, background: "var(--navy-600)" }} /></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
