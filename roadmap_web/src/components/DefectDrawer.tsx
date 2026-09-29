import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, CalendarDays, FileText, MapPin, Ruler, Users, X } from "lucide-react";
import { api } from "@/api";
import { DEFECT_LABEL, STATUS_FLOW, STATUS_LABEL, fmtDate, fmtTnd } from "@/config/labels";
import { useApi } from "@/state/useApi";
import type { Defect, DefectStatus } from "@/types/domain";
import { SeverityBadge, SourceTag, StatusBadge } from "./Badges";
import { PriorityBreakdown, ScorePill } from "./PriorityBreakdown";

/** Ouvre / ferme la fiche via le paramètre d'URL ?defect=ID (partageable, bouton retour du navigateur). */
export function useDefectDrawer() {
  const [params, setParams] = useSearchParams();
  return {
    openId: params.get("defect"),
    open: (id: string) => setParams((p) => (p.set("defect", id), p)),
    close: () => setParams((p) => (p.delete("defect"), p)),
  };
}

const NEXT_ACTION: Partial<Record<DefectStatus, string>> = {
  detecte: "Valider le défaut",
  valide: "Planifier l'intervention",
  planifie: "Démarrer les travaux",
  en_cours: "Déclarer réparé",
  repare: "Vérifier sur le terrain",
};

export function DefectDrawer() {
  const { openId, close } = useDefectDrawer();
  const { data: defect, setData } = useApi(() => (openId ? api.getDefect(openId) : Promise.resolve(undefined)), [openId]);
  const { data: teams } = useApi(() => api.listTeams());
  const [team, setTeam] = useState("");
  const [photo, setPhoto] = useState(0);

  useEffect(() => {
    setPhoto(0);
    setTeam(defect?.assignedTeam ?? "");
  }, [defect?.id, defect?.assignedTeam]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  if (!openId) return null;

  async function advance(d: Defect) {
    const next = STATUS_FLOW[STATUS_FLOW.indexOf(d.status) + 1];
    if (!next) return;
    const patch = next === "planifie" ? { assignedTeam: team || teams?.[0]?.name, plannedDate: new Date(Date.now() + 7 * 864e5).toISOString() } : undefined;
    setData(await api.updateDefectStatus(d.id, next, patch));
  }

  const photos = defect?.observations.filter((o) => o.imageUrl) ?? [];

  return (
    <>
      <div className="drawer-backdrop" onClick={close} />
      <aside className="drawer" role="dialog" aria-label="Fiche du défaut">
        {!defect ? (
          <div className="drawer-b">
            <div className="skeleton" style={{ height: 30, width: "60%" }} />
            <div className="skeleton" style={{ height: 220 }} />
          </div>
        ) : (
          <>
            <div className="drawer-h">
              <div className="row">
                <span className="muted small num">{defect.id}</span>
                <SeverityBadge severity={defect.severity} />
                <StatusBadge status={defect.status} />
                <button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={close} aria-label="Fermer">
                  <X size={18} />
                </button>
              </div>
              <h2 style={{ fontSize: 20, marginTop: 8 }}>{DEFECT_LABEL[defect.type]}</h2>
              <div className="row small muted" style={{ marginTop: 4 }}>
                <MapPin size={13} /> {defect.roadName} · {defect.district} · {defect.surface === "trottoir" ? "Trottoir" : "Chaussée"}
              </div>
            </div>

            <div className="drawer-b">
              {photos.length > 0 && (
                <section>
                  <img src={photos[photo].imageUrl} alt="Illustration du défaut" style={{ width: "100%", borderRadius: 10, display: "block", aspectRatio: "16/10", objectFit: "cover" }} />
                  <div className="row" style={{ marginTop: 8, gap: 6 }}>
                    {photos.map((o, i) => (
                      <img key={o.id} src={o.imageUrl} alt="" onClick={() => setPhoto(i)}
                        style={{ width: 64, height: 40, objectFit: "cover", borderRadius: 6, cursor: "pointer", outline: i === photo ? "2px solid var(--blue-500)" : "none" }} />
                    ))}
                    <span className="small muted" style={{ marginLeft: "auto" }}>{fmtDate(photos[photo].date, true)}</span>
                  </div>
                </section>
              )}

              <section>
                <h4>Mesures</h4>
                <div className="kv">
                  <div><div className="k"><Ruler size={11} /> Longueur</div><div className="v num">{defect.dimensions.lengthM != null ? `${defect.dimensions.lengthM} m` : "—"}</div></div>
                  <div><div className="k">Largeur</div><div className="v num">{defect.dimensions.widthM != null ? `${defect.dimensions.widthM} m` : "—"}</div></div>
                  <div><div className="k">Profondeur</div><div className="v num">{defect.dimensions.depthCm !== undefined ? `${defect.dimensions.depthCm} cm` : "—"}</div></div>
                  <div><div className="k">Première détection</div><div className="v">{fmtDate(defect.firstSeen)}</div></div>
                  <div><div className="k">Dernier passage</div><div className="v">{fmtDate(defect.lastSeen)}</div></div>
                  <div><div className="k">Signalements</div><div className="v num">{defect.citizenReports}</div></div>
                </div>
              </section>

              <section>
                <h4>Priorité</h4>
                <div className="row" style={{ marginBottom: 12 }}>
                  <ScorePill score={defect.priority.score} />
                  <span>{defect.priority.rank ? <>Rang <b className="num">{defect.priority.rank}</b> dans votre périmètre</> : "Défaut traité"}</span>
                </div>
                <PriorityBreakdown priority={defect.priority} />
              </section>

              <section>
                <h4>Coût estimé de réparation</h4>
                <div className="row" style={{ alignItems: "baseline" }}>
                  <span style={{ fontSize: 24, fontWeight: 700 }} className="num">{fmtTnd(defect.cost.amountTnd)}</span>
                  <span className="muted small num">fourchette {fmtTnd(defect.cost.rangeTnd[0])} – {fmtTnd(defect.cost.rangeTnd[1])}</span>
                </div>
                <div className="card" style={{ marginTop: 10, padding: "10px 12px", boxShadow: "none", background: "var(--surface-2)" }}>
                  <div className="row small"><FileText size={13} /><b>Ligne {defect.cost.priceLine.code}</b> — {defect.cost.priceLine.label}</div>
                  <div className="small muted num" style={{ marginTop: 3 }}>
                    {defect.cost.quantity} {defect.cost.unit} × {fmtTnd(defect.cost.priceLine.unitPriceTnd)} / {defect.cost.unit} + installation de chantier
                  </div>
                  <div className="small muted" style={{ marginTop: 3 }}>Référence technique : {defect.cost.technicalRef}</div>
                  {defect.cost.priceLine.provisional && (
                    <div className="row small" style={{ marginTop: 6, color: "#8a6300" }}>
                      <AlertTriangle size={13} /> Barème provisoire — le barème officiel n'a pas encore été communiqué.
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h4>Cycle de réparation</h4>
                <div className="stepper">
                  {STATUS_FLOW.map((s, i) => {
                    const idx = STATUS_FLOW.indexOf(defect.status);
                    return (
                      <div key={s} className={`step ${i < idx ? "done" : ""} ${i === idx ? "current" : ""}`}>
                        <div className="pip" />
                        {STATUS_LABEL[s]}
                      </div>
                    );
                  })}
                </div>
                {(defect.assignedTeam || defect.plannedDate) && (
                  <div className="row small muted" style={{ marginTop: 10, gap: 14 }}>
                    {defect.assignedTeam && <span className="row" style={{ gap: 5 }}><Users size={13} /> {defect.assignedTeam}</span>}
                    {defect.plannedDate && <span className="row" style={{ gap: 5 }}><CalendarDays size={13} /> prévu le {fmtDate(defect.plannedDate)}</span>}
                  </div>
                )}
                {NEXT_ACTION[defect.status] && (
                  <div className="row" style={{ marginTop: 12 }}>
                    {defect.status === "valide" && (
                      <select className="select" value={team} onChange={(e) => setTeam(e.target.value)} style={{ flex: 1 }}>
                        <option value="">Choisir une équipe…</option>
                        {teams?.map((t) => <option key={t.id}>{t.name}</option>)}
                      </select>
                    )}
                    <button className="btn primary" onClick={() => advance(defect)}>{NEXT_ACTION[defect.status]}</button>
                  </div>
                )}
              </section>

              <section>
                <h4>Historique des observations ({defect.observations.length})</h4>
                <div className="timeline">
                  {[...defect.observations].reverse().map((o) => (
                    <div className="ev" key={o.id}>
                      <div className="row" style={{ justifyContent: "space-between" }}>
                        <SourceTag source={o.source} />
                        <span className="small muted">{fmtDate(o.date, true)}</span>
                      </div>
                      <div className="small" style={{ marginTop: 2 }}>
                        Confiance {Math.round(o.confidence * 100)} %{o.depthCm !== undefined && <> · profondeur mesurée {o.depthCm} cm</>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="small muted">Les passages répétés sont regroupés en une seule entité (proximité GPS + similarité visuelle).</div>
              </section>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
