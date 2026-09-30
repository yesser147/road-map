import { NavLink, Outlet } from "react-router-dom";
import { Camera, History, House, LogOut } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { useSession } from "@/state/session";

/** Coque de l'espace citoyen : pensée pour le téléphone (onglets en bas, action principale au centre). */
export function CitizenLayout() {
  const { user, logout } = useSession();
  return (
    <div className="cz">
      <header className="cz-top">
        <BrandMark size={28} />
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontWeight: 600 }}>Road Map</div>
          <div className="small muted">Espace citoyen</div>
        </div>
        <div className="row" style={{ marginLeft: "auto", gap: 4 }}>
          <span className="small cz-name">{user?.name}</span>
          <button className="btn ghost sm" onClick={logout} aria-label="Se déconnecter" title="Se déconnecter"><LogOut size={17} /></button>
        </div>
      </header>
      <main className="cz-main">
        <Outlet />
      </main>
      <nav className="cz-tabs">
        <NavLink to="/citoyen" end className={({ isActive }) => (isActive ? "active" : "")}><House size={20} />Accueil</NavLink>
        <NavLink to="/citoyen/signaler" className={({ isActive }) => `cta ${isActive ? "active" : ""}`}>
          <span className="cta-box"><Camera size={20} /></span>Signaler
        </NavLink>
        <NavLink to="/citoyen/mes-signalements" className={({ isActive }) => (isActive ? "active" : "")}><History size={20} />Mes signalements</NavLink>
      </nav>
    </div>
  );
}
