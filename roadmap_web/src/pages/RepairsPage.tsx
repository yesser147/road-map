import { useState } from "react";
import { CalendarDays, Users } from "lucide-react";
import { api } from "@/api";
import { SeverityBadge } from "@/components/Badges";
import { useDefectDrawer } from "@/components/DefectDrawer";
import { DEFECT_LABEL, SEVERITY_ORDER, STATUS_FLOW, STATUS_LABEL, fmtDate, fmtTnd } from "@/config/labels";
import { useApi } from "@/state/useApi";
import type { Defect, DefectStatus } from "@/types/domain";

const PER_COLUMN = 14;
const COLUMN_HINT: Record<DefectStatus, string> = {
  detecte: "Détection automatique ou signalement, à confirmer",
  valide: "Confirmé, en attente de planification",
  planifie: "Équipe et date affectées",
  en_cours: "Travaux sur le terrain",
  repare: "Déclaré réparé par l'équipe",
  verifie: "Confirmé par un nouveau passage",
};

export default function RepairsPage() {
  const { open } = useDefectDrawer();
  const [team, setTeam] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const { data: teams } = useApi(() => api.listTeams());
  const { data: defects, setData } = useApi(() => api.listDefects());

  const filtered = (defects ?? []).filter((d) => !team || d.assignedTeam === team || d.status === "detecte" || d.status === "valide");

  async function move(id: string, status: DefectStatus) {
    const updated = await api.updateDefectStatus(id, status, status === "planifie" ? { assignedTeam: team || teams?.[0]?.name } : undefined);
    setData((prev) => prev?.map((d) => (d.id === id ? updated : d)));
  }

  const sortCol = (xs: Defect[]) => xs.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || b.priority.score - a.priority.score);

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="row" style={{ flexWrap: "wrap" }}>
        <select className="select" value={team} onChange={(e) => setTeam(e.target.value)}>
          <option value="">Toutes les équipes</option>
          {teams?.map((t) => <option key={t.id}>{t.name}</option>)}
        </select>
        <span className="small muted">Glissez une carte vers une autre colonne pour faire avancer l'intervention. Un défaut n'est « vérifié » qu'après un nouveau passage.</span>
      </div>
      <div className="kanban">
        {STATUS_FLOW.map((s) => {
          const col = sortCol(filtered.filter((d) => d.status === s));
          return (
            <div key={s} className="kcol" onDragOver={(e) => e.preventDefault()} onDrop={() => dragId && move(dragId, s)}>
              <div className="kcol-h">
                {STATUS_LABEL[s]}
                <span className="n num">{col.length}</span>
              </div>
              <div className="small muted" style={{ padding: "0 4px 4px", marginTop: -6 }}>{COLUMN_HINT[s]}</div>
              {col.slice(0, PER_COLUMN).map((d) => (
                <div key={d.id} className="kcard" draggable onDragStart={() => setDragId(d.id)} onDragEnd={() => setDragId(null)} onClick={() => open(d.id)}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span className="small muted num">{d.id}</span>
                    <SeverityBadge severity={d.severity} />
                  </div>
                  <div className="t" style={{ marginTop: 6 }}>{DEFECT_LABEL[d.type]}</div>
                  <div className="small muted">{d.roadName}</div>
                  <div className="row small muted" style={{ marginTop: 8, justifyContent: "space-between" }}>
                    <span className="num">{fmtTnd(d.cost.amountTnd)}</span>
                    {d.assignedTeam && <span className="row" style={{ gap: 4 }}><Users size={12} />{d.assignedTeam.replace("Équipe ", "")}</span>}
                  </div>
                  {d.plannedDate && s === "planifie" && (
                    <div className="row small" style={{ gap: 4, marginTop: 4, color: "var(--navy-600)" }}><CalendarDays size={12} /> {fmtDate(d.plannedDate)}</div>
                  )}
                </div>
              ))}
              {col.length > PER_COLUMN && <div className="small muted" style={{ textAlign: "center", padding: 6 }}>+ {col.length - PER_COLUMN} autres</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
