import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Camera, CheckCircle2, GitMerge, MessageSquareText, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import { api } from "@/api";
import { SeverityBadge } from "@/components/Badges";
import { useDefectDrawer } from "@/components/DefectDrawer";
import { DEFECT_LABEL, fmtDate } from "@/config/labels";
import { useApi } from "@/state/useApi";
import type { CitizenReport } from "@/types/domain";

const STATE_LABEL: Record<CitizenReport["state"], [string, string]> = {
  a_valider: ["À valider", "warn"],
  valide: ["Validé", "sev-faible"],
  rejete: ["Rejeté", "neutral"],
  fusionne: ["Fusionné", "info"],
};

function Field({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--line)" }}>
      <span className="muted small">{k}</span>
      <span style={{ fontWeight: 500 }}>{v ?? <span className="muted">non identifié</span>}</span>
    </div>
  );
}

export default function ReportsPage() {
  const { open } = useDefectDrawer();
  const { data: reports, setData } = useApi(() => api.listReports());
  const [tab, setTab] = useState<"todo" | "done">("todo");
  const [selId, setSelId] = useState<string | null>(null);

  const list = useMemo(() => (reports ?? []).filter((r) => (tab === "todo" ? r.state === "a_valider" : r.state !== "a_valider")), [reports, tab]);
  const sel = list.find((r) => r.id === selId) ?? list[0];

  useEffect(() => setSelId(null), [tab]);

  async function review(r: CitizenReport, decision: "valide" | "rejete" | "fusionne") {
    const updated = await api.reviewReport(r.id, decision, r.matchedDefectId);
    setData((prev) => prev?.map((x) => (x.id === r.id ? updated : x)));
    setSelId(null);
  }

  return (
    <div className="grid resp" style={{ gridTemplateColumns: "minmax(300px, 380px) minmax(0, 1fr)", alignItems: "start" }}>
      <div className="card">
        <div className="card-h" style={{ gap: 6 }}>
          <span className={`chip ${tab === "todo" ? "on" : ""}`} onClick={() => setTab("todo")}>À valider ({(reports ?? []).filter((r) => r.state === "a_valider").length})</span>
          <span className={`chip ${tab === "done" ? "on" : ""}`} onClick={() => setTab("done")}>Traités</span>
        </div>
        <div style={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
          {list.length === 0 && <div className="empty">File vide.</div>}
          {list.map((r) => (
            <div key={r.id} onClick={() => setSelId(r.id)}
              style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", cursor: "pointer", background: sel?.id === r.id ? "var(--blue-100)" : undefined }}>
              <div className="row small">
                {r.channel === "sms" ? <MessageSquareText size={14} /> : <Camera size={14} />}
                <b>{r.channel === "sms" ? "SMS" : "Photo"}</b>
                <span className="muted num">{r.id}</span>
                <span className="muted" style={{ marginLeft: "auto" }}>{fmtDate(r.receivedAt, true)}</span>
              </div>
              <div className="small" style={{ marginTop: 5, color: "var(--ink-2)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {r.channel === "sms" ? r.rawText : r.photoCheck?.accepted ? `Photo acceptée — ${r.extraction?.type ? DEFECT_LABEL[r.extraction.type] : ""}` : `Photo rejetée automatiquement : ${r.photoCheck?.reason}`}
              </div>
              {tab === "done" && <span className={`badge ${STATE_LABEL[r.state][1]}`} style={{ marginTop: 6 }}>{STATE_LABEL[r.state][0]}</span>}
            </div>
          ))}
        </div>
      </div>

      {sel ? (
        <div className="card">
          <div className="card-h">
            <h3>{sel.channel === "sms" ? "Signalement par SMS" : "Signalement photo"} · {sel.id}</h3>
            <span className={`right badge ${STATE_LABEL[sel.state][1]}`}>{STATE_LABEL[sel.state][0]}</span>
          </div>
          <div className="card-b grid resp" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 22 }}>
            <div>
              {sel.channel === "sms" ? (
                <>
                  <div className="small muted" style={{ marginBottom: 6 }}>Message reçu · {sel.phoneMasked}</div>
                  <div style={{ background: "#eef2f8", borderRadius: "14px 14px 14px 4px", padding: "12px 14px", fontSize: 15 }} dir="auto">{sel.rawText}</div>
                  <div className="small muted" style={{ marginTop: 8 }}>Numéro masqué — les données personnelles ne sont pas conservées au-delà du traitement.</div>
                </>
              ) : (
                <>
                  <img src={sel.imageUrl} alt="Photo du signalement" style={{ width: "100%", borderRadius: 10 }} />
                  {sel.description && (
                    <div style={{ background: "#eef2f8", borderRadius: 10, padding: "9px 12px", marginTop: 10 }}>« {sel.description} »</div>
                  )}
                  <div className="card" style={{ marginTop: 10, padding: "10px 12px", boxShadow: "none", background: "var(--surface-2)" }}>
                    {sel.photoCheck?.analyzed === false ? (
                      <div className="row small" style={{ fontWeight: 600, color: "#8a6300" }}>
                        <ShieldAlert size={15} /> Photo non analysée (service vision indisponible au dépôt) — à vérifier visuellement
                      </div>
                    ) : (
                      <>
                        <div className="row small" style={{ fontWeight: 600, color: sel.photoCheck?.accepted ? "var(--ok)" : "var(--sev-critique)" }}>
                          {sel.photoCheck?.accepted ? <ShieldCheck size={15} /> : <ShieldAlert size={15} />}
                          Filtre automatique : {sel.photoCheck?.accepted ? "photo exploitable" : `rejetée (${sel.photoCheck?.reason})`}
                        </div>
                        <div className="small muted num" style={{ marginTop: 4 }}>Netteté {sel.photoCheck?.blurScore} · probabilité « voirie » {Math.round((sel.photoCheck?.roadScore ?? 0) * 100)} %</div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
            <div>
              <div className="small muted" style={{ marginBottom: 4, fontWeight: 600 }}>{sel.channel === "sms" ? "Extraction automatique (modèle de langage)" : "Analyse automatique (vision)"}</div>
              {sel.extraction ? (
                <>
                  <Field k="Type de défaut" v={sel.extraction.type && DEFECT_LABEL[sel.extraction.type]} />
                  <Field k="Localisation" v={sel.extraction.location} />
                  <Field k="Gravité estimée" v={sel.extraction.severityHint && <SeverityBadge severity={sel.extraction.severityHint} />} />
                  {sel.extraction.depthCm != null && <Field k="Profondeur estimée" v={<span className="num">{sel.extraction.depthCm} cm</span>} />}
                  {sel.extraction.lengthM != null && sel.extraction.widthM != null && (
                    <Field k="Dimensions estimées" v={<span className="num">{sel.extraction.lengthM} × {sel.extraction.widthM} m</span>} />
                  )}
                  <Field k="Confiance" v={<span className="num">{Math.round(sel.extraction.confidence * 100)} %</span>} />
                  <Field k="Sortie structurée" v={sel.extraction.schemaValid ? <span className="badge sev-faible">conforme au schéma</span> : <span className="badge warn">incomplète</span>} />
                </>
              ) : (
                <div className="empty">Aucune extraction : la photo a été écartée avant analyse.</div>
              )}

              {sel.matchedDefectId && (
                <div className="card" style={{ marginTop: 14, padding: "10px 12px", boxShadow: "none", borderColor: "#bcd0f5", background: "#f4f8ff" }}>
                  <div className="row small"><GitMerge size={14} /> Correspond probablement au défaut existant <a onClick={() => open(sel.matchedDefectId!)} style={{ cursor: "pointer", fontWeight: 600 }}>{sel.matchedDefectId}</a></div>
                  <div className="small muted" style={{ marginTop: 3 }}>Même type, à moins de 15 m. Fusionner évite un doublon en base.</div>
                </div>
              )}

              {sel.state === "a_valider" && (
                <div className="row" style={{ marginTop: 16, flexWrap: "wrap" }}>
                  {sel.matchedDefectId && <button className="btn primary" onClick={() => review(sel, "fusionne")}><GitMerge size={15} /> Fusionner</button>}
                  <button className={`btn ${sel.matchedDefectId ? "" : "primary"}`} onClick={() => review(sel, "valide")}><CheckCircle2 size={15} /> Valider comme nouveau défaut</button>
                  <button className="btn danger" onClick={() => review(sel, "rejete")}><XCircle size={15} /> Rejeter</button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card empty">Sélectionnez un signalement.</div>
      )}
    </div>
  );
}
