import { Link } from "react-router-dom";
import { Camera, ChevronRight, Lightbulb } from "lucide-react";
import { api } from "@/api";
import { fmtDate } from "@/config/labels";
import { useSession } from "@/state/session";
import { useApi } from "@/state/useApi";
import { ProgressSteps } from "./progress";

export default function CitizenHome() {
  const { user } = useSession();
  const { data: mine } = useApi(() => api.myReports());
  const repaired = mine?.filter((m) => m.progress === "repare").length ?? 0;
  const inProgress = mine?.filter((m) => m.progress !== "repare" && m.progress !== "non_retenu").length ?? 0;

  return (
    <div className="cz-page stack" style={{ gap: 16 }}>
      <div>
        <h2 className="cz-h2">Bonjour {user?.name.split(" ")[0]}</h2>
        <div className="muted small">Merci de contribuer à l'entretien des routes de votre quartier.</div>
      </div>

      <Link to="/citoyen/signaler" className="cz-hero">
        <div className="cz-hero-icon"><Camera size={28} /></div>
        <div>
          <b>Signaler une dégradation</b>
          <div className="small">Nid-de-poule, plaque d'égout, trottoir cassé… une photo suffit.</div>
        </div>
        <ChevronRight />
      </Link>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div className="card cz-stat"><b className="num">{mine?.length ?? "—"}</b><span>envoyés</span></div>
        <div className="card cz-stat"><b className="num">{inProgress}</b><span>en cours</span></div>
        <div className="card cz-stat"><b className="num" style={{ color: "var(--ok)" }}>{repaired}</b><span>réparés</span></div>
      </div>

      {mine && mine.length > 0 && (
        <div className="stack" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <b>Derniers signalements</b>
            <Link to="/citoyen/mes-signalements" className="small">Tout voir</Link>
          </div>
          {mine.slice(0, 2).map((m) => (
            <div key={m.report.id} className="card" style={{ padding: 12 }}>
              <div className="row small muted" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <span className="num">{m.report.id}</span>
                <span>{fmtDate(m.report.receivedAt)}</span>
              </div>
              <ProgressSteps item={m} />
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 14 }}>
        <div className="row" style={{ gap: 8, fontWeight: 600 }}><Lightbulb size={16} color="var(--ink-3)" /> Une bonne photo</div>
        <ul className="small" style={{ margin: "8px 0 0", paddingLeft: 18, color: "var(--ink-2)" }}>
          <li>Cadrez le défaut entier, à 1–2 mètres.</li>
          <li>Restez en sécurité : ne vous arrêtez jamais sur la chaussée.</li>
          <li>Évitez les personnes et les plaques d'immatriculation (elles sont floutées de toute façon).</li>
        </ul>
      </div>
    </div>
  );
}
