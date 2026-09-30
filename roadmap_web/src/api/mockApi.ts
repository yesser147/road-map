/**
 * Implémentation simulée de RoadMapApi : données en mémoire (src/mocks), latence artificielle,
 * cloisonnement territorial reproduit selon le profil actif.
 */
import { DEFECT_LABEL, SEVERITY_LABEL, fmtTnd } from "@/config/labels";
import { computeKpis, db } from "@/mocks/generate";
import type { AssistantAnswer, AuthSession, CitizenReport, Defect, DefectType, MyReport, StaffRole, User } from "@/types/domain";
import type { RoadMapApi } from "./types";

const USERS: Record<StaffRole, User> = {
  ministere: { id: "u-1", name: "Leila Ben Salah", role: "ministere", scope: { level: "national", label: "Tunisie — toutes régions" } },
  direction_regionale: { id: "u-2", name: "Karim Trabelsi", role: "direction_regionale", scope: { level: "gouvernorat", label: "Gouvernorat de Bizerte" } },
  agent_municipal: { id: "u-3", name: "Sami Jaziri", role: "agent_municipal", scope: { level: "commune", label: "Centre-ville" } },
};

/** Mêmes comptes de démonstration que roadmap_api (SeedService). */
const DEMO_PASSWORD = "Demo2026!";
const CITIZEN: User = { id: "u-4", name: "Amira Haddad", role: "citoyen", email: "citoyen@demo.tn" };
const ACCOUNTS: Record<string, User> = {
  "ministere@roadmap.tn": USERS.ministere,
  "direction.bizerte@roadmap.tn": USERS.direction_regionale,
  "agent.centre@roadmap.tn": USERS.agent_municipal,
  "citoyen@demo.tn": CITIZEN,
};
const myReportIds = new Set<string>();

let current: User = USERS.direction_regionale;

/** Restaure l'utilisateur simulé après un rechargement de page (session conservée dans le navigateur). */
export function restoreMockUser(u: User): void {
  current = u;
}

function session(u: User): AuthSession {
  current = u;
  return { token: `mock.${u.id}`, expiresAt: new Date(Date.now() + 12 * 3600_000).toISOString(), user: u };
}

function fail(message: string): Promise<never> {
  return new Promise((_, rej) => setTimeout(() => rej(new Error(message)), 300));
}

const wait = <T,>(v: T, ms = 120 + Math.random() * 220) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), ms));

/** L'agent municipal ne voit que son arrondissement ; les autres profils voient toute la zone pilote. */
function inScope(d: { district?: string }): boolean {
  return current.role !== "agent_municipal" || d.district === current.scope?.label;
}
const scopedDefects = () => db.defects.filter(inScope);

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const TYPE_WORDS: [RegExp, DefectType][] = [
  [/nid|trou|7ofra|poule/, "nid_de_poule"],
  [/fissure/, "fissure_longitudinale"],
  [/faiencage/, "faiencage"],
  [/affaissement/, "affaissement"],
  [/plaque|egout|tampon/, "plaque_egout_defectueuse"],
  [/dalle|trottoir/, "dalle_cassee"],
  [/bordure/, "bordure_cassee"],
  [/racine|arbre/, "soulevement_racine"],
];

function answer(q: string): AssistantAnswer {
  const n = norm(q);
  const district = ["centre-ville", "bizerte nord", "bizerte ouest", "bizerte sud", "zarzouna"].find((d) => n.includes(d));
  const districtLabel = district ? district.replace(/(^|[\s-])\S/g, (m) => m.toUpperCase()) : undefined;
  const type = TYPE_WORDS.find(([re]) => re.test(n))?.[1];
  const limit = Number(n.match(/\b(\d{1,2})\b/)?.[1] ?? 5);
  let pool = scopedDefects().filter((d) => d.status !== "repare" && d.status !== "verifie");
  if (districtLabel) pool = pool.filter((d) => norm(d.district) === norm(districtLabel));
  if (type) pool = pool.filter((d) => (type === "fissure_longitudinale" ? d.type.startsWith("fissure") : d.type === type));
  const args: Record<string, unknown> = { zone: districtLabel ?? (current.scope?.label ?? ""), ...(type ? { type } : {}), statut: "actif" };

  if (/cout|budget|combien.*(dt|dinar)|montant/.test(n)) {
    const total = pool.reduce((a, d) => a + d.cost.amountTnd, 0);
    const bySev = (["critique", "elevee"] as const).map((s) => pool.filter((d) => d.severity === s).reduce((a, d) => a + d.cost.amountTnd, 0));
    return {
      text: `Le coût estimé pour traiter les ${pool.length} défauts actifs${type ? ` de type « ${DEFECT_LABEL[type].toLowerCase()} »` : ""} dans ${args.zone} est de **${fmtTnd(total)}**, dont ${fmtTnd(bySev[0])} pour les défauts critiques et ${fmtTnd(bySev[1])} pour les défauts de gravité élevée. Chaque montant cite sa ligne de barème (provisoire tant que le barème officiel n'est pas communiqué).`,
      calls: [{ name: "rechercher_defauts", args }, { name: "somme_couts", args: { regroupement: "gravite" } }],
      defects: pool.sort((a, b) => b.cost.amountTnd - a.cost.amountTnd).slice(0, limit),
    };
  }
  if (/combien|nombre/.test(n)) {
    const crit = pool.filter((d) => d.severity === "critique").length;
    return {
      text: `${pool.length} défauts actifs${type ? ` de type « ${DEFECT_LABEL[type].toLowerCase()} »` : ""} dans ${args.zone}, dont **${crit} critiques**. Les plus prioritaires sont listés ci-dessous.`,
      calls: [{ name: "compter_defauts", args }],
      defects: pool.sort((a, b) => b.priority.score - a.priority.score).slice(0, limit),
    };
  }
  if (/ecole|hopital|sensible/.test(n)) {
    const near = pool.filter((d) => (d.priority.factors.find((f) => f.key === "sites_sensibles")?.value ?? 0) > 0.6);
    return {
      text: `${near.length} défauts actifs se trouvent à proximité d'une école ou d'un hôpital dans ${args.zone}. Ils sont classés par score de priorité.`,
      calls: [{ name: "rechercher_defauts", args: { ...args, proximite: ["ecole", "hopital"], rayon_m: 150 } }],
      defects: near.sort((a, b) => b.priority.score - a.priority.score).slice(0, limit),
    };
  }
  if (/non couvert|couverture|zone/.test(n) && !/prior/.test(n)) {
    const segs = db.segments.filter((s) => s.condition === "non_couvert");
    const names = [...new Set(segs.map((s) => s.roadName).filter(Boolean))].slice(0, 6);
    return {
      text: `${segs.length} tronçons n'ont pas été parcourus depuis plus de 30 jours et sont affichés en gris sur la carte (jamais présentés comme en bon état). Voies concernées : ${names.join(", ")}…`,
      calls: [{ name: "zones_non_couvertes", args: { depuis_jours: 30 } }],
    };
  }
  // défaut : les plus urgents
  const top = pool.sort((a, b) => b.priority.score - a.priority.score).slice(0, limit);
  return {
    text: top.length
      ? `Voici les ${top.length} ${type ? DEFECT_LABEL[type].toLowerCase() + "s" : "défauts"} les plus prioritaires dans ${args.zone}. Le premier, ${top[0].id} (${top[0].roadName}), a un score de ${top[0].priority.score}/100 — gravité ${SEVERITY_LABEL[top[0].severity].toLowerCase()}.`
      : `Aucun défaut actif ne correspond à cette recherche dans ${args.zone}.`,
    calls: [{ name: "rechercher_defauts", args: { ...args, tri: "priorite_desc", limite: limit } }],
    defects: top,
  };
}

export const mockApi: RoadMapApi = {
  login: (email, password, space) => {
    const u = ACCOUNTS[email.trim().toLowerCase()];
    if (!u || password !== DEMO_PASSWORD) return fail("Adresse e-mail ou mot de passe incorrect");
    if ((space === "citoyen") !== (u.role === "citoyen"))
      return fail(space === "citoyen" ? "Ce compte est un compte agent : utilisez l'espace Ministère" : "Ce compte est un compte citoyen : utilisez l'espace citoyen");
    return wait(session(u), 400);
  },
  registerCitizen: ({ fullName, email }) => {
    if (ACCOUNTS[email.toLowerCase()]) return fail("Un compte existe déjà avec cette adresse");
    const u: User = { id: `u-${Date.now()}`, name: fullName, email, role: "citoyen" };
    ACCOUNTS[email.toLowerCase()] = u;
    return wait(session(u), 500);
  },
  getCurrentUser: () => wait(current, 50),
  switchRole: (role: StaffRole) => {
    current = USERS[role];
    return wait(current, 80);
  },
  getKpis: () => wait(computeKpis(scopedDefects(), db.segments, db.reports)),
  listSegments: () => wait(db.segments),
  listAssets: () => wait(db.assets),
  listDefects: (f = {}) => {
    const q = f.search ? norm(f.search) : "";
    const out = scopedDefects().filter(
      (d) =>
        (!f.types?.length || f.types.includes(d.type)) &&
        (!f.severities?.length || f.severities.includes(d.severity)) &&
        (!f.statuses?.length || f.statuses.includes(d.status)) &&
        (!f.surface || f.surface === "all" || d.surface === f.surface) &&
        (!f.district || d.district === f.district) &&
        (!q || norm(`${d.id} ${d.roadName} ${d.district}`).includes(q)),
    );
    return wait(out);
  },
  getDefect: (id) => wait(db.defects.find((d) => d.id === id && inScope(d))),
  listTeams: () => wait(db.teams),
  updateDefectStatus: (id, status, patch) => {
    const d = db.defects.find((x) => x.id === id) as Defect;
    d.status = status;
    if (patch?.assignedTeam) d.assignedTeam = patch.assignedTeam;
    if (patch?.plannedDate) d.plannedDate = patch.plannedDate;
    return wait(d);
  },
  listReports: () => wait(db.reports),
  reviewReport: (id, decision, defectId) => {
    const r = db.reports.find((x) => x.id === id)!;
    r.state = decision;
    if (defectId) r.matchedDefectId = defectId;
    return wait(r);
  },
  submitReport: ({ photo, lat, lng, description, type }) => {
    const r: CitizenReport = {
      id: `SIG-${300 + db.reports.length}`,
      receivedAt: new Date().toISOString(),
      channel: "photo",
      description,
      imageUrl: URL.createObjectURL(photo),
      photoCheck: { accepted: true, blurScore: 180, roadScore: 0.9, analyzed: false },
      extraction: { type: type ?? null, location: null, severityHint: null, confidence: 0, schemaValid: !!type },
      position: { lat, lng },
      state: "a_valider",
    };
    db.reports.unshift(r);
    myReportIds.add(r.id);
    return wait(r, 900);
  },
  myReports: () => {
    const mine: MyReport[] = db.reports
      .filter((r) => myReportIds.has(r.id))
      .map((r) => ({
        report: r,
        progress: r.state === "a_valider" ? "verification" : r.state === "rejete" ? "non_retenu" : "pris_en_charge",
        progressLabel: r.state === "a_valider" ? "En cours de vérification par les services" : r.state === "rejete" ? "Non retenu" : "Pris en charge",
      }));
    return wait(mine);
  },
  getCaptures: async () => {
    const { captures } = await import("@/mocks/captures");
    return wait(captures);
  },
  getTimeline: () => wait(db.timeline),
  ask: (question) => wait(answer(question), 700),
};
