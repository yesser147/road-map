import { Link } from "react-router-dom";
import { Camera, MapPin } from "lucide-react";
import { api } from "@/api";
import { DEFECT_LABEL, fmtDate } from "@/config/labels";
import { useApi } from "@/state/useApi";
import { ProgressSteps } from "./progress";

export default function MyReportsPage() {
  const { data, loading } = useApi(() => api.myReports());

  return (
    <div className="cz-page stack" style={{ gap: 12 }}>
      <h2 className="cz-h2">Mes signalements</h2>
      {loading && !data && <div className="skeleton" style={{ height: 140 }} />}
      {data && data.length === 0 && (
        <div className="card empty stack" style={{ alignItems: "center", gap: 12 }}>
          Vous n'avez encore rien signalé.
          <Link to="/citoyen/signaler" className="btn primary"><Camera size={16} /> Faire un signalement</Link>
        </div>
      )}
      {data?.map((m) => {
        const r = m.report;
        return (
          <article key={r.id} className="card cz-report">
            {r.imageUrl && <img src={r.imageUrl} alt="Photo du signalement" />}
            <div className="cz-report-b">
              <div className="row small muted" style={{ justifyContent: "space-between" }}>
                <span className="num">{r.id}</span>
                <span>{fmtDate(r.receivedAt, true)}</span>
              </div>
              <b>{r.extraction?.type ? DEFECT_LABEL[r.extraction.type] : "Dégradation signalée"}</b>
              {r.extraction?.location && <div className="row small muted" style={{ gap: 4 }}><MapPin size={12} /> {r.extraction.location}</div>}
              {r.description && <div className="small" style={{ color: "var(--ink-2)" }}>« {r.description} »</div>}
              <div style={{ marginTop: 8 }}><ProgressSteps item={m} /></div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
