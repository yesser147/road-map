import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Bot, ClipboardList, Info, LayoutDashboard, LineChart, ListOrdered, LogOut, Map, MessagesSquare, Wifi, WifiOff } from "lucide-react";
import { API_MODE, api } from "@/api";
import { ROLE_LABEL } from "@/config/labels";
import { useSession } from "@/state/session";
import { useApi } from "@/state/useApi";
import { useOnline } from "@/state/useOnline";
import type { StaffRole } from "@/types/domain";

const STAFF_ROLES: StaffRole[] = ["ministere", "direction_regionale", "agent_municipal"];
import { DefectDrawer } from "./DefectDrawer";

export const ROUTES = [
  { path: "/pro", label: "Tableau de bord", icon: LayoutDashboard, section: "Pilotage" },
  { path: "/pro/carte", label: "Carte du réseau", icon: Map, section: "Pilotage" },
  { path: "/pro/priorites", label: "Priorités", icon: ListOrdered, section: "Pilotage" },
  { path: "/pro/reparations", label: "Réparations", icon: ClipboardList, section: "Opérations" },
  { path: "/pro/signalements", label: "Signalements citoyens", icon: MessagesSquare, section: "Opérations" },
  { path: "/pro/suivi", label: "Suivi dans le temps", icon: LineChart, section: "Analyse" },
  { path: "/pro/assistant", label: "Assistant", icon: Bot, section: "Analyse" },
] as const;

function Sidebar() {
  const { data: reports } = useApi(() => api.listReports());
  const pending = reports?.filter((r) => r.state === "a_valider").length ?? 0;
  let lastSection = "";
  return (
    <nav className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <svg width="20" height="20" viewBox="0 0 32 32"><path d="M9 26 14 6h4l5 20" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" /><path d="M16 10v3M16 17v3" stroke="#f2b134" strokeWidth="2.6" strokeLinecap="round" /></svg>
        </div>
        <div className="brand-text">
          <div className="brand-name">Road Map</div>
          <div className="brand-sub">État du réseau routier</div>
        </div>
      </div>
      {ROUTES.map((r) => {
        const header = r.section !== lastSection ? <div className="nav-section" key={`s-${r.section}`}>{r.section}</div> : null;
        lastSection = r.section;
        const Icon = r.icon;
        return [
          header,
          <NavLink key={r.path} to={r.path} end={r.path === "/pro"} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <Icon size={18} />
            <span className="label">{r.label}</span>
            {r.path === "/pro/signalements" && pending > 0 && <span className="count">{pending}</span>}
          </NavLink>,
        ];
      })}
      <div className="sidebar-foot">
        Zone pilote : Bizerte
        <br />v0.1 · {API_MODE === "mock" ? "données simulées" : "API connectée"}
      </div>
    </nav>
  );
}

const SHORT: Record<string, string> = {
  "/pro": "Accueil", "/pro/carte": "Carte", "/pro/priorites": "Priorités", "/pro/reparations": "Travaux",
  "/pro/signalements": "Signalem.", "/pro/suivi": "Suivi", "/pro/assistant": "Assistant",
};

function MobileNav() {
  const { data: reports } = useApi(() => api.listReports());
  const pending = reports?.filter((r) => r.state === "a_valider").length ?? 0;
  return (
    <nav className="mobile-nav">
      {ROUTES.map((r) => {
        const Icon = r.icon;
        return (
          <NavLink key={r.path} to={r.path} end={r.path === "/pro"} className={({ isActive }) => (isActive ? "active" : "")}>
            <Icon size={19} />
            {SHORT[r.path]}
            {r.path === "/pro/signalements" && pending > 0 && <span className="count">{pending}</span>}
          </NavLink>
        );
      })}
    </nav>
  );
}

function Topbar() {
  const { user, switchRole, logout } = useSession();
  const online = useOnline();
  const { pathname } = useLocation();
  const route = ROUTES.find((r) => r.path === pathname) ?? ROUTES[0];
  return (
    <header className="topbar">
      <div>
        <h1>{route.label}</h1>
        {user?.scope && <div className="crumb">Périmètre : {user.scope.label}</div>}
      </div>
      <div className="topbar-right">
        <span className={`badge ${online ? "sev-faible" : "warn"}`} title="F12 — fonctionnement hors ligne">
          {online ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span className="sync-text">{online ? "Synchronisé" : "Hors ligne · relevés en file d'attente"}</span>
        </span>
        {user && (
          <>
            {switchRole ? (
              <select className="select" value={user.role} onChange={(e) => switchRole(e.target.value as StaffRole)} title="Profil (démonstration des niveaux d'accès)">
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </select>
            ) : null}
            <div className="row" style={{ gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--navy-700)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 12 }}>
                {user.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
              </div>
              <div className="small user-text" style={{ lineHeight: 1.2 }}>
                <div style={{ fontWeight: 600 }}>{user.name}</div>
                <div className="muted">{ROLE_LABEL[user.role].split(" —")[0]}</div>
              </div>
            </div>
            <button className="btn ghost sm" onClick={logout} title="Se déconnecter" aria-label="Se déconnecter">
              <LogOut size={17} />
            </button>
          </>
        )}
      </div>
    </header>
  );
}

export function Layout() {
  const { pathname } = useLocation();
  const flush = pathname === "/pro/carte" || pathname === "/pro/assistant";
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        {API_MODE === "mock" && (
          <div className="demo-banner">
            <Info size={13} /> Maquette de démonstration — toutes les données affichées sont simulées (seul le fond de carte est réel).
          </div>
        )}
        <Topbar />
        <main className={`content ${flush ? "flush" : ""}`}>
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <DefectDrawer />
    </div>
  );
}
