import { NavLink, Outlet } from "react-router-dom";
import { Camera, History, House, LogOut } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { useSession } from "@/state/session";

/** Coque de l'espace citoyen : pensée pour le téléphone (barre d'onglets en bas, bouton central « Signaler »). */
export function CitizenLayout() {
  const { user, logout } = useSession();
  return (
    <div className="cz">
      <header className="cz-top">
        <BrandMark size={32} />
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontWeight: 700 }}>Road Map</div>
          <div className="small" style={{ color: "#9fb2d3" }}>Espace citoyen</div>
        </div>
        <div className="row" style={{ marginLeft: "auto", gap: 6 }}>
          <span className="small cz-name">{user?.name}</span>
          <button className="btn ghost sm" style={{ color: "#c9d4e8" }} onClick={logout} aria-label="Se déconnecter"><LogOut size={18} /></button>
        </div>
      </header>
      <main className="cz-main">
        <Outlet />
      </main>
      <nav className="cz-tabs">
        <NavLink to="/citoyen" end className={({ isActive }) => (isActive ? "active" : "")}><House size={21} />Accueil</NavLink>
        <NavLink to="/citoyen/signaler" className={({ isActive }) => `cta ${isActive ? "active" : ""}`}>
          <span className="cta-dot"><Camera size={24} /></span>Signaler
        </NavLink>
        <NavLink to="/citoyen/mes-signalements" className={({ isActive }) => (isActive ? "active" : "")}><History size={21} />Mes signalements</NavLink>
      </nav>
    </div>
  );
}
