import { Link } from "react-router-dom";
import { MapContainer, Polyline, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { CONDITION_COLOR } from "@/config/labels";
import { PILOT_ZONE, db } from "@/mocks/generate";

/** Aperçu non interactif de l'état du réseau (zone pilote). */
function NetworkPreview() {
  return (
    <figure className="wl-preview">
      <MapContainer center={[PILOT_ZONE.center.lat, PILOT_ZONE.center.lng]} zoom={14} zoomControl={false} dragging={false}
        scrollWheelZoom={false} doubleClickZoom={false} touchZoom={false} keyboard={false} attributionControl={false} preferCanvas>
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={16} />
        {db.segments.map((s) => (
          <Polyline key={s.id} positions={s.coords}
            pathOptions={{ color: CONDITION_COLOR[s.condition], weight: s.condition === "bon" ? 2 : 4, opacity: s.condition === "non_couvert" ? 0.6 : 0.9, dashArray: s.condition === "non_couvert" ? "4 5" : undefined }} />
        ))}
      </MapContainer>
      <figcaption>
        <span><i style={{ background: CONDITION_COLOR.critique }} />Critique</span>
        <span><i style={{ background: CONDITION_COLOR.degrade }} />Dégradé</span>
        <span><i style={{ background: CONDITION_COLOR.bon }} />Bon état</span>
        <span><i className="dash" />Non parcouru récemment</span>
        <span className="muted">Bizerte, zone pilote</span>
      </figcaption>
    </figure>
  );
}

export default function WelcomePage() {
  return (
    <div className="wl">
      <div className="wl-band road-pattern">
      <header className="wl-top">
        <Link to="/" className="row" style={{ gap: 10, color: "inherit", textDecoration: "none" }}>
          <BrandMark size={30} />
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontWeight: 600 }}>Road Map</div>
            <div className="small wl-sub">Ministère de l'Équipement — état du réseau routier</div>
          </div>
        </Link>
        <nav className="wl-nav">
          <Link to="/citoyen">Signaler un problème</Link>
          <Link to="/pro" className="btn wl-ghost">Espace agents</Link>
        </nav>
      </header>

      <main className="wl-main">
        <section className="wl-hero">
          <div>
            <p className="wl-kicker">Cartographie des dégradations routières et de trottoirs</p>
            <h1>L'état de chaque rue, mis à jour tous les jours.</h1>
            <p className="wl-lead">
              Les bus et les véhicules de collecte filment la chaussée pendant leur service. Les citoyens signalent ce
              qu'ils voient. Chaque dégradation est localisée, mesurée, chiffrée et classée par priorité pour les
              équipes d'entretien.
            </p>
            <div className="row" style={{ gap: 10, flexWrap: "wrap", marginTop: 24 }}>
              <Link to="/citoyen" className="btn accent lg">Signaler une dégradation <ArrowRight size={16} /></Link>
              <Link to="/pro" className="btn lg wl-ghost">Accès agents du Ministère</Link>
            </div>
          </div>
          <NetworkPreview />
        </section>
      </main>
      </div>

      <main className="wl-main wl-lower">
        <section className="wl-steps">
          <div>
            <span className="wl-num" style={{ background: "var(--brand)" }}>01</span>
            <h3>Collecter</h3>
            <p>Caméras embarquées sur les bus et les bennes, photos envoyées par les citoyens, SMS. Visages et plaques floutés avant tout stockage.</p>
          </div>
          <div>
            <span className="wl-num" style={{ background: "var(--accent)" }}>02</span>
            <h3>Analyser</h3>
            <p>Un modèle de vision détecte nids-de-poule, fissures et plaques d'égout, estime la profondeur et regroupe les passages répétés.</p>
          </div>
          <div>
            <span className="wl-num" style={{ background: "var(--teal)" }}>03</span>
            <h3>Décider et réparer</h3>
            <p>Coût estimé à partir du barème, score de priorité expliqué, planification des équipes et vérification après travaux.</p>
          </div>
        </section>
      </main>

      <footer className="wl-foot">
        <span>Projet Road Map — zone pilote : Bizerte</span>
        <span className="muted">Données de démonstration</span>
      </footer>
    </div>
  );
}
