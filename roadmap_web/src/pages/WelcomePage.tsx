import { Link } from "react-router-dom";
import { Building2, Camera, ChevronRight, MapPinned, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

/** Page d'accueil publique : deux espaces, un pour les citoyens, un pour les agents du Ministère. */
export default function WelcomePage() {
  return (
    <div className="welcome">
      <header className="welcome-top">
        <BrandMark />
        <div>
          <div className="brand-name">Road Map</div>
          <div className="brand-sub">Cartographie des dégradations routières et de trottoirs</div>
        </div>
      </header>

      <main className="welcome-main">
        <h1>Des routes et des trottoirs mieux entretenus, ensemble.</h1>
        <p className="lead">
          Signalez un nid-de-poule, une plaque d'égout dangereuse ou un trottoir cassé en une photo. Les services
          du Ministère de l'Équipement suivent l'état du réseau en temps réel et planifient les réparations.
        </p>

        <div className="welcome-cards">
          <Link to="/citoyen" className="space-card citizen">
            <div className="space-icon"><Camera size={26} /></div>
            <div>
              <h2>Espace citoyen</h2>
              <p>Signaler une dégradation avec une photo et suivre sa prise en charge.</p>
            </div>
            <ChevronRight className="chev" />
          </Link>
          <Link to="/pro" className="space-card staff">
            <div className="space-icon"><Building2 size={26} /></div>
            <div>
              <h2>Espace Ministère</h2>
              <p>Carte du réseau, priorités, réparations et validation des signalements. Accès réservé aux agents.</p>
            </div>
            <ChevronRight className="chev" />
          </Link>
        </div>

        <div className="welcome-points">
          <div><MapPinned size={18} /> Position automatique, ajustable sur la carte</div>
          <div><ShieldCheck size={18} /> Visages et plaques d'immatriculation floutés</div>
          <div><Camera size={18} /> Vérification automatique de la photo</div>
        </div>
      </main>
      <footer className="welcome-foot">Projet Road Map — zone pilote : Bizerte</footer>
    </div>
  );
}
