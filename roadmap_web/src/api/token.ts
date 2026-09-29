import type { AuthSession } from "@/types/domain";

/** Session conservée dans le navigateur (jeton JWT émis par l'API). */
const KEY = "roadmap.session";

export function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as AuthSession;
    return new Date(s.expiresAt).getTime() > Date.now() ? s : null;
  } catch {
    return null;
  }
}

export function saveSession(s: AuthSession | null): void {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* stockage indisponible (navigation privée) : la session reste en mémoire */
  }
  memory = s;
  listeners.forEach((l) => l(s));
}

let memory: AuthSession | null = loadSession();
const listeners = new Set<(s: AuthSession | null) => void>();

export const currentToken = () => memory?.token ?? null;

export function onSessionChange(l: (s: AuthSession | null) => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
