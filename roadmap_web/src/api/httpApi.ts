/**
 * Implémentation REST (VITE_API_MODE=http) : serveur roadmap_api (Spring Boot).
 * En développement, Vite relaie /api et /media vers http://localhost:8080 (vite.config.ts).
 */
import type { AuthSession } from "@/types/domain";
import { currentToken, saveSession } from "./token";
import type { RoadMapApi } from "./types";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = currentToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    // réseau coupé, serveur arrêté, ou téléphone qui a interrompu la requête (écran verrouillé…)
    throw new ApiError(0, "Connexion au serveur impossible. Vérifiez votre connexion Wi-Fi puis réessayez.");
  }
  if (!res.ok) {
    let msg = `Erreur ${res.status}`;
    try {
      const body = await res.json();
      msg = body.detail ?? body.message ?? msg;
    } catch {
      /* corps non JSON */
    }
    if (res.status === 401 && token) saveSession(null); // jeton expiré : retour à la connexion
    throw new ApiError(res.status, msg);
  }
  return (res.status === 204 ? undefined : res.json()) as Promise<T>;
}

function qs(params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "" || v === "all") continue;
    if (Array.isArray(v)) v.forEach((x) => q.append(k, String(x)));
    else q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const httpApi: RoadMapApi = {
  login: (email, password, space) => http<AuthSession>("/auth/login", post({ email, password, space })),
  registerCitizen: (input) => http<AuthSession>("/auth/register", post(input)),
  getCurrentUser: () => http("/auth/me"),

  getKpis: () => http("/kpis"),
  listSegments: () => http("/segments"),
  listAssets: () => http("/assets"),
  listDefects: (f = {}) =>
    http(`/defects${qs({ type: f.types, severity: f.severities, status: f.statuses, surface: f.surface, district: f.district, q: f.search })}`),
  getDefect: (id) => http(`/defects/${encodeURIComponent(id)}`),
  listTeams: () => http("/teams"),
  updateDefectStatus: (id, status, patch) =>
    http(`/defects/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ status, ...patch }) }),
  listReports: () => http("/reports"),
  reviewReport: (id, decision, defectId) => http(`/reports/${encodeURIComponent(id)}/review`, post({ decision, defectId })),

  submitReport: ({ photo, lat, lng, description, type, camera }) => {
    const form = new FormData();
    form.append("photo", photo);
    form.append("lat", String(lat));
    form.append("lng", String(lng));
    if (description) form.append("description", description);
    if (type) form.append("type", type);
    if (camera?.focal35) form.append("focal35", String(camera.focal35));
    if (camera?.focalMm) form.append("focalMm", String(camera.focalMm));
    if (camera?.tiltBeta !== undefined) form.append("tiltBeta", String(camera.tiltBeta));
    if (camera?.tiltGamma !== undefined) form.append("tiltGamma", String(camera.tiltGamma));
    if (camera?.capture) form.append("capture", camera.capture);
    if (camera?.capture === "camera") form.append("posture", camera.posture ?? "standing");
    return http("/citizen/reports", { method: "POST", body: form });
  },
  myReports: () => http("/citizen/reports"),

  getCaptures: async () => {
    try {
      return await http("/captures");
    } catch (e) {
      // Service de traitement vidéo (WP1) pas encore branché : données de démonstration, signalées comme telles.
      if (e instanceof ApiError && (e.status === 404 || e.status === 403)) {
        const { captures } = await import("@/mocks/captures");
        return captures;
      }
      throw e;
    }
  },
  getTimeline: () => http("/timeline"),
  ask: (question) => http("/assistant", post({ question })),
};
