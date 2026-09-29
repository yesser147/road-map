import { useMemo, useState } from "react";
import { ArrowDownWideNarrow, Download } from "lucide-react";
import { api } from "@/api";
import { SeverityBadge, StatusBadge } from "@/components/Badges";
import { useDefectDrawer } from "@/components/DefectDrawer";
import { ScorePill } from "@/components/PriorityBreakdown";
import { DEFECT_LABEL, SEVERITY_LABEL, SEVERITY_ORDER, daysSince, fmtTnd } from "@/config/labels";
import { DISTRICTS } from "@/mocks/generate";
import { useApi } from "@/state/useApi";
import type { Defect, DefectType, Severity } from "@/types/domain";

type SortKey = "score" | "cost" | "age";
const FACTOR_COLORS = ["#1d3761", "#2f6fde", "#8fb3f5", "#b7c3d9", "#f2b134"];

function exportCsv(rows: Defect[]) {
  const head = ["rang", "id", "type", "gravite", "statut", "voie", "arrondissement", "score", "cout_dt", "ligne_bareme", "premiere_detection"];
  const lines = rows.map((d) =>
    [d.priority.rank, d.id, DEFECT_LABEL[d.type], SEVERITY_LABEL[d.severity], d.status, d.roadName, d.district, d.priority.score, d.cost.amountTnd, d.cost.priceLine.code, d.firstSeen.slice(0, 10)]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(";"),
  );
  const blob = new Blob(["﻿" + [head.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `priorites_${new Date().toISOString().slice(0, 10)}.csv` });
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function PrioritiesPage() {
  const { open } = useDefectDrawer();
  const [district, setDistrict] = useState("");
  const [type, setType] = useState<DefectType | "">("");
  const [severity, setSeverity] = useState<Severity | "">("");
  const [sort, setSort] = useState<SortKey>("score");
  const { data, loading } = useApi(
    () => api.listDefects({ district: district || undefined, types: type ? [type] : undefined, severities: severity ? [severity] : undefined, statuses: ["detecte", "valide", "planifie", "en_cours"] }),
    [district, type, severity],
  );

  const rows = useMemo(() => {
    const r = [...(data ?? [])];
    if (sort === "score") r.sort((a, b) => b.priority.score - a.priority.score);
    if (sort === "cost") r.sort((a, b) => b.cost.amountTnd - a.cost.amountTnd);
    if (sort === "age") r.sort((a, b) => a.firstSeen.localeCompare(b.firstSeen));
    return r;
  }, [data, sort]);

  const total = rows.reduce((a, d) => a + d.cost.amountTnd, 0);

  return (
    <div className="card">
      <div className="card-h" style={{ flexWrap: "wrap", gap: 10 }}>
        <select className="select" value={district} onChange={(e) => setDistrict(e.target.value)}>
          <option value="">Tous les arrondissements</option>
          {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select className="select" value={type} onChange={(e) => setType(e.target.value as DefectType)}>
          <option value="">Tous les types</option>
          {(Object.keys(DEFECT_LABEL) as DefectType[]).map((t) => <option key={t} value={t}>{DEFECT_LABEL[t]}</option>)}
        </select>
        <select className="select" value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
          <option value="">Toutes gravités</option>
          {SEVERITY_ORDER.map((s) => <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>)}
        </select>
        <div className="row" style={{ gap: 6 }}>
          <ArrowDownWideNarrow size={15} className="muted" />
          {([["score", "Score"], ["cost", "Coût"], ["age", "Ancienneté"]] as [SortKey, string][]).map(([k, l]) => (
            <span key={k} className={`chip ${sort === k ? "on" : ""}`} onClick={() => setSort(k)}>{l}</span>
          ))}
        </div>
        <div className="right row">
          <span className="small muted num">{rows.length} défauts · {fmtTnd(total)}</span>
          <button className="btn" onClick={() => exportCsv(rows)}><Download size={15} /> Exporter CSV</button>
        </div>
      </div>
      <div style={{ overflow: "auto", maxHeight: "calc(100vh - 210px)" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Rang</th><th>Score</th><th>Défaut</th><th>Localisation</th><th>Gravité</th><th>Statut</th>
              <th style={{ width: 170 }}>Décomposition</th><th>Âge</th><th style={{ textAlign: "right" }}>Coût</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr><td colSpan={9}><div className="skeleton" style={{ height: 200 }} /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="empty">Aucun défaut ne correspond aux filtres.</td></tr>
            ) : (
              rows.map((d) => (
                <tr key={d.id} className="clickable" onClick={() => open(d.id)}>
                  <td className="num muted">#{d.priority.rank}</td>
                  <td><ScorePill score={d.priority.score} /></td>
                  <td><div style={{ fontWeight: 600 }}>{DEFECT_LABEL[d.type]}</div><div className="small muted num">{d.id}</div></td>
                  <td><div>{d.roadName}</div><div className="small muted">{d.district} · {d.surface === "trottoir" ? "trottoir" : "chaussée"}</div></td>
                  <td><SeverityBadge severity={d.severity} /></td>
                  <td><StatusBadge status={d.status} /></td>
                  <td>
                    <div className="bar" style={{ display: "flex", height: 8 }} title={d.priority.factors.map((f) => `${f.label} +${Math.round(f.weight * f.value * 100)}`).join("\n")}>
                      {d.priority.factors.map((f, i) => (
                        <span key={f.key} style={{ width: `${f.weight * f.value * 100}%`, background: FACTOR_COLORS[i], borderRadius: 0 }} />
                      ))}
                    </div>
                  </td>
                  <td className="num small">{daysSince(d.firstSeen)} j</td>
                  <td className="num" style={{ textAlign: "right" }}>{fmtTnd(d.cost.amountTnd)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="row small muted" style={{ padding: "10px 18px", gap: 14, borderTop: "1px solid var(--line)", flexWrap: "wrap" }}>
        Décomposition :
        {["Gravité 40 %", "Trafic 25 %", "École / hôpital 15 %", "Ancienneté 10 %", "Signalements 10 %"].map((l, i) => (
          <span key={l} className="row" style={{ gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: FACTOR_COLORS[i] }} />{l}</span>
        ))}
      </div>
    </div>
  );
}
