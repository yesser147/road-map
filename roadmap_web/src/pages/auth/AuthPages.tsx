import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Camera, Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { API_MODE } from "@/api";
import { BrandMark } from "@/components/BrandMark";
import { useSession } from "@/state/session";

/**
 * Comptes de démonstration (créés par roadmap_api/SeedService, mêmes valeurs en mode simulé).
 * Affichés uniquement en développement ou en mode démo — jamais dans un build de production branché sur l'API.
 */
const SHOW_DEMO = import.meta.env.DEV || API_MODE === "mock";
const DEMO_PASSWORD = "Demo2026!";
const DEMO_STAFF = [
  { email: "ministere@roadmap.tn", label: "Ministère (national)" },
  { email: "direction.bizerte@roadmap.tn", label: "Direction régionale" },
  { email: "agent.centre@roadmap.tn", label: "Agent municipal" },
];
const DEMO_CITIZEN = "citoyen@demo.tn";

function AuthShell({ tone, icon, title, subtitle, children }: { tone: "staff" | "citizen"; icon: ReactNode; title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className={`auth-page ${tone}`}>
      <div className="auth-card">
        <Link to="/" className="auth-back"><ArrowLeft size={16} /> Accueil</Link>
        <div className="row" style={{ gap: 12, marginBottom: 18 }}>
          <BrandMark size={40} />
          <div>
            <div className="auth-kicker">{icon} Road Map</div>
            <h1>{title}</h1>
          </div>
        </div>
        <p className="muted" style={{ marginTop: -6 }}>{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, autoComplete }: { value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pwd">
      <input className="input" type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required minLength={autoComplete === "new-password" ? 8 : undefined} />
      <button type="button" className="btn ghost sm" onClick={() => setShow(!show)} aria-label={show ? "Masquer" : "Afficher"}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function useRedirectAfterLogin(fallback: string) {
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  return () => navigate(from && from.startsWith(fallback) ? from : fallback, { replace: true });
}

// ---------------------------------------------------------------- espace Ministère

export function StaffLoginPage() {
  const { login } = useSession();
  const done = useRedirectAfterLogin("/pro");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password, "ministere");
      done();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell tone="staff" icon={<Building2 size={13} />} title="Espace Ministère" subtitle="Accès réservé aux agents du Ministère de l'Équipement et des collectivités partenaires.">
      <form className="stack" onSubmit={submit} style={{ gap: 12, marginTop: 18 }}>
        <label className="field">Adresse e-mail professionnelle
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required autoFocus />
        </label>
        <label className="field">Mot de passe
          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button className="btn primary lg" disabled={busy}><LogIn size={17} /> {busy ? "Connexion…" : "Se connecter"}</button>
        <p className="small muted" style={{ margin: 0 }}>Pas de compte ? Les accès agents sont créés par l'administrateur de la plateforme.</p>
      </form>
      {SHOW_DEMO && (
        <div className="demo-accounts">
          <div className="small muted">Comptes de démonstration</div>
          <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
            {DEMO_STAFF.map((a) => (
              <span key={a.email} className="chip" onClick={() => { setEmail(a.email); setPassword(DEMO_PASSWORD); }}>{a.label}</span>
            ))}
          </div>
        </div>
      )}
    </AuthShell>
  );
}

// ---------------------------------------------------------------- espace citoyen

export function CitizenAuthPage() {
  const { login, register } = useSession();
  const done = useRedirectAfterLogin("/citoyen");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") await login(email, password, "citoyen");
      else await register({ fullName, email, phone: phone || undefined, password });
      done();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell tone="citizen" icon={<Camera size={13} />} title="Espace citoyen" subtitle="Signalez une dégradation de la chaussée ou d'un trottoir et suivez sa réparation.">
      <div className="seg" style={{ marginTop: 16 }}>
        <button type="button" className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>Se connecter</button>
        <button type="button" className={mode === "register" ? "on" : ""} onClick={() => setMode("register")}>Créer un compte</button>
      </div>
      <form className="stack" onSubmit={submit} style={{ gap: 12, marginTop: 16 }}>
        {mode === "register" && (
          <>
            <label className="field">Nom et prénom
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required />
            </label>
            <label className="field">Téléphone <span className="muted">(facultatif)</span>
              <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+216 …" />
            </label>
          </>
        )}
        <label className="field">Adresse e-mail
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </label>
        <label className="field">Mot de passe {mode === "register" && <span className="muted">(8 caractères minimum)</span>}
          <PasswordInput value={password} onChange={setPassword} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </label>
        {mode === "register" && (
          <label className="row small" style={{ alignItems: "flex-start", gap: 8 }}>
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} required style={{ marginTop: 3 }} />
            <span>J'accepte que mes photos et leur position soient utilisées pour l'entretien du réseau. Les visages et plaques d'immatriculation sont floutés automatiquement.</span>
          </label>
        )}
        {error && <div className="form-error">{error}</div>}
        <button className="btn primary lg" disabled={busy}>
          {mode === "login" ? <><LogIn size={17} /> {busy ? "Connexion…" : "Se connecter"}</> : <><UserPlus size={17} /> {busy ? "Création…" : "Créer mon compte"}</>}
        </button>
      </form>
      {SHOW_DEMO && mode === "login" && (
        <div className="demo-accounts">
          <div className="small muted">Compte de démonstration</div>
          <span className="chip" onClick={() => { setEmail(DEMO_CITIZEN); setPassword(DEMO_PASSWORD); }}>Citoyen (démo)</span>
        </div>
      )}
    </AuthShell>
  );
}
