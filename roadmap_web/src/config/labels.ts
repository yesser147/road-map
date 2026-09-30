import type { DefectStatus, DefectType, Role, SegmentCondition, Severity, Source } from "@/types/domain";

export const DEFECT_LABEL: Record<DefectType, string> = {
  nid_de_poule: "Nid-de-poule",
  fissure_longitudinale: "Fissure longitudinale",
  fissure_transversale: "Fissure transversale",
  faiencage: "Faïençage",
  affaissement: "Affaissement",
  plaque_egout_defectueuse: "Plaque d'égout défectueuse",
  dalle_cassee: "Dalle cassée / descellée",
  ressaut: "Ressaut",
  soulevement_racine: "Soulèvement par racine",
  bordure_cassee: "Bordure cassée",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  faible: "Faible",
  moyenne: "Moyenne",
  elevee: "Élevée",
  critique: "Critique",
};

export const SEVERITY_ORDER: Severity[] = ["critique", "elevee", "moyenne", "faible"];

export const STATUS_LABEL: Record<DefectStatus, string> = {
  detecte: "Détecté",
  valide: "Validé",
  planifie: "Planifié",
  en_cours: "En cours",
  repare: "Réparé",
  verifie: "Vérifié",
};

export const STATUS_FLOW: DefectStatus[] = ["detecte", "valide", "planifie", "en_cours", "repare", "verifie"];

export const SOURCE_LABEL: Record<Source, string> = {
  vehicule: "Véhicule de collecte",
  pieton: "Agent piéton",
  citoyen_photo: "Photo citoyenne",
  citoyen_sms: "SMS citoyen",
};

export const CONDITION_LABEL: Record<SegmentCondition, string> = {
  bon: "Bon état",
  degrade: "Dégradé",
  critique: "Critique",
  non_couvert: "Non couvert (> 30 j)",
};

export const ROLE_LABEL: Record<Role, string> = {
  citoyen: "Citoyen",
  ministere: "Ministère — niveau national",
  direction_regionale: "Direction régionale",
  agent_municipal: "Agent municipal",
};

/** Couleurs métier : lues par la carte, les badges et les graphiques. Miroir de tokens.css. */
export const SEVERITY_COLOR: Record<Severity, string> = {
  critique: "#d2352c",
  elevee: "#e8772e",
  moyenne: "#e0a21b",
  faible: "#2e9e6b",
};

export const CONDITION_COLOR: Record<SegmentCondition, string> = {
  bon: "#2e9e6b",
  degrade: "#e8952e",
  critique: "#d2352c",
  non_couvert: "#9aa3ae",
};

export const ASSET_COLOR = "#6b6f76";

/** Couleur de marque (miroir de --brand dans tokens.css) — pour les tracés dessinés sur canvas. */
export const BRAND_COLOR = "#1b5fa8";

export function fmtTnd(v: number): string {
  return new Intl.NumberFormat("fr-TN", { maximumFractionDigits: 0 }).format(v) + " DT";
}

export function fmtDate(iso: string, withTime = false): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function daysSince(iso: string, now = new Date()): number {
  return Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 86_400_000));
}
