/**
 * Générateur de données SIMULÉES (déterministe, graine fixe) pour la zone pilote de Bizerte.
 * Seule la géométrie des voies vient d'OpenStreetMap ; défauts, coûts, signalements, équipes et
 * historiques sont fictifs. À supprimer quand l'API WP4 est branchée (VITE_API_MODE=http).
 */
import roadsFile from "./data/roads.bizerte.json";
import { defectIllustration } from "./illustrations";
import type {
  Asset,
  CitizenReport,
  CostEstimate,
  Defect,
  DefectStatus,
  DefectType,
  LatLng,
  NetworkKpis,
  Observation,
  PriorityFactor,
  RepairTeam,
  RoadSegment,
  Severity,
  Source,
  Surface,
  TimePoint,
} from "@/types/domain";

export interface Way {
  id: string;
  name: string | null;
  class: string;
  coords: [number, number][];
}

// ---------------------------------------------------------------- utilitaires
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260929);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
const between = (a: number, b: number) => a + rnd() * (b - a);
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

function weighted<T>(items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [v, w] of items) {
    if ((r -= w) <= 0) return v;
  }
  return items[items.length - 1][0];
}

export function haversineM(a: [number, number], b: [number, number]): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const NOW = new Date();
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

// ---------------------------------------------------------------- territoire
export const PILOT_ZONE = { name: "Bizerte (zone pilote)", center: { lat: 37.2745, lng: 9.8655 } as LatLng, zoom: 15 };

export function districtOf(lat: number, lng: number): string {
  if (lng > 9.8705 && lat < 37.2705) return "Zarzouna";
  if (lat > 37.2805) return "Bizerte Nord";
  if (lng < 9.856) return "Bizerte Ouest";
  if (lat < 37.2665) return "Bizerte Sud";
  return "Centre-ville";
}
export const DISTRICTS = ["Centre-ville", "Bizerte Nord", "Bizerte Ouest", "Bizerte Sud", "Zarzouna"];

// ---------------------------------------------------------------- segmentation des voies
export const ways = (roadsFile as unknown as { ways: Way[] }).ways;
const SEGMENT_M = 140;

function splitWay(w: Way): [number, number][][] {
  const out: [number, number][][] = [];
  let cur: [number, number][] = [w.coords[0]];
  let len = 0;
  for (let i = 1; i < w.coords.length; i++) {
    const p = w.coords[i];
    len += haversineM(cur[cur.length - 1], p);
    cur.push(p);
    if (len >= SEGMENT_M && i < w.coords.length - 1) {
      out.push(cur);
      cur = [p];
      len = 0;
    }
  }
  if (cur.length > 1) out.push(cur);
  return out;
}

function pointAlong(coords: [number, number][], t: number): [number, number] {
  const lens = coords.slice(1).map((p, i) => haversineM(coords[i], p));
  const total = lens.reduce((a, b) => a + b, 0);
  let target = t * total;
  for (let i = 0; i < lens.length; i++) {
    if (target <= lens[i]) {
      const f = lens[i] ? target / lens[i] : 0;
      return [coords[i][0] + f * (coords[i + 1][0] - coords[i][0]), coords[i][1] + f * (coords[i + 1][1] - coords[i][1])];
    }
    target -= lens[i];
  }
  return coords[coords.length - 1];
}

// ---------------------------------------------------------------- barème (provisoire)
const PRICE_LINES: Record<DefectType, CostEstimate["priceLine"] & { unit: CostEstimate["unit"] }> = {
  nid_de_poule: { code: "R-12", label: "Reprise localisée en enrobé à chaud", unitPriceTnd: 95, provisional: true, unit: "m²" },
  fissure_longitudinale: { code: "R-21", label: "Pontage de fissures (bitume modifié)", unitPriceTnd: 18, provisional: true, unit: "ml" },
  fissure_transversale: { code: "R-21", label: "Pontage de fissures (bitume modifié)", unitPriceTnd: 18, provisional: true, unit: "ml" },
  faiencage: { code: "R-14", label: "Fraisage et rechargement BB 5 cm", unitPriceTnd: 55, provisional: true, unit: "m²" },
  affaissement: { code: "R-31", label: "Purge et reconstitution de chaussée", unitPriceTnd: 160, provisional: true, unit: "m²" },
  plaque_egout_defectueuse: { code: "A-05", label: "Remplacement tampon fonte D400 + scellement", unitPriceTnd: 1150, provisional: true, unit: "u" },
  dalle_cassee: { code: "T-02", label: "Remplacement de dalles de trottoir", unitPriceTnd: 70, provisional: true, unit: "m²" },
  ressaut: { code: "T-04", label: "Nivellement et reprise de revêtement", unitPriceTnd: 60, provisional: true, unit: "m²" },
  soulevement_racine: { code: "T-09", label: "Traitement racinaire et reprise de trottoir", unitPriceTnd: 130, provisional: true, unit: "m²" },
  bordure_cassee: { code: "T-07", label: "Remplacement de bordure T2", unitPriceTnd: 48, provisional: true, unit: "ml" },
};
const TECH_REF = "Guide technique d'entretien des chaussées urbaines, §4 (référence provisoire — à remplacer par le référentiel du Ministère)";

// ---------------------------------------------------------------- génération des défauts
const TYPE_WEIGHTS: [DefectType, number][] = [
  ["nid_de_poule", 34],
  ["fissure_longitudinale", 12],
  ["fissure_transversale", 9],
  ["faiencage", 8],
  ["affaissement", 6],
  ["plaque_egout_defectueuse", 6],
  ["dalle_cassee", 8],
  ["bordure_cassee", 6],
  ["ressaut", 5],
  ["soulevement_racine", 6],
];
const SIDEWALK_TYPES: DefectType[] = ["dalle_cassee", "bordure_cassee", "ressaut", "soulevement_racine"];
const TEAMS: RepairTeam[] = [
  { id: "EQ-1", name: "Équipe voirie A", district: "Centre-ville" },
  { id: "EQ-2", name: "Équipe voirie B", district: "Bizerte Nord" },
  { id: "EQ-3", name: "Équipe trottoirs", district: "Centre-ville" },
  { id: "EQ-4", name: "Régie Zarzouna", district: "Zarzouna" },
];

function severityFor(type: DefectType, depthCm: number | undefined, areaM2: number): Severity {
  if (depthCm !== undefined) {
    if (depthCm >= 10) return "critique";
    if (depthCm >= 6) return "elevee";
    if (depthCm >= 3) return "moyenne";
    return "faible";
  }
  const s = areaM2 * (type === "affaissement" || type === "faiencage" ? 1.6 : 1) + rnd() * 1.5;
  return s > 5 ? "critique" : s > 3 ? "elevee" : s > 1.5 ? "moyenne" : "faible";
}

function makeObservations(firstSeenDays: number, depthCm: number | undefined, surface: Surface, citizen: number): Observation[] {
  const n = 1 + Math.floor(rnd() * 5);
  const obs: Observation[] = [];
  for (let i = 0; i < n; i++) {
    const d = Math.round(firstSeenDays - (i * firstSeenDays) / Math.max(1, n - 1 || 1));
    const source: Source = surface === "trottoir" ? pick(["pieton", "pieton", "citoyen_photo"] as const) : pick(["vehicule", "vehicule", "vehicule", "citoyen_photo"] as const);
    obs.push({
      id: `OBS-${Math.floor(rnd() * 1e6).toString(36)}`,
      date: daysAgo(Math.max(0, d) + rnd()),
      source,
      confidence: round(between(0.55, 0.97), 2),
      // un nid-de-poule se creuse entre les passages : la dernière mesure vaut depthCm
      depthCm: depthCm !== undefined ? round(depthCm * (0.62 + (0.38 * i) / Math.max(1, n - 1)) * between(0.96, 1.04)) : undefined,
    });
  }
  for (let i = 0; i < Math.min(citizen, 2); i++) {
    obs.push({ id: `OBS-SMS-${i}`, date: daysAgo(between(1, firstSeenDays)), source: "citoyen_sms", confidence: round(between(0.6, 0.9), 2) });
  }
  return obs.sort((a, b) => a.date.localeCompare(b.date));
}

function priorityFactors(sev: Severity, roadClass: string, ageDays: number, citizen: number, nearSensitive: boolean): PriorityFactor[] {
  const sevV = { faible: 0.2, moyenne: 0.45, elevee: 0.75, critique: 1 }[sev];
  const trafic = { trunk: 1, primary: 0.9, secondary: 0.7, tertiary: 0.5, unclassified: 0.3 }[roadClass] ?? 0.4;
  return [
    { key: "gravite", label: "Gravité", weight: 0.4, value: sevV },
    { key: "trafic", label: "Trafic de la voie", weight: 0.25, value: round(Math.min(1, trafic + between(-0.08, 0.08)), 2) },
    { key: "sites_sensibles", label: "Proximité école / hôpital", weight: 0.15, value: nearSensitive ? round(between(0.7, 1), 2) : round(between(0, 0.25), 2) },
    { key: "anciennete", label: "Ancienneté du défaut", weight: 0.1, value: round(Math.min(1, ageDays / 120), 2) },
    { key: "signalements", label: "Signalements citoyens", weight: 0.1, value: round(Math.min(1, citizen / 4), 2) },
  ];
}

export interface MockDatabase {
  defects: Defect[];
  segments: RoadSegment[];
  assets: Asset[];
  reports: CitizenReport[];
  teams: RepairTeam[];
  timeline: TimePoint[];
}

function build(): MockDatabase {
  // 1) segments + couverture (les voies périphériques ouest et quelques rues ne sont pas parcourues)
  const segments: RoadSegment[] = [];
  ways.forEach((w, wi) => {
    const uncoveredWay = w.coords[0][1] < 9.8515 || wi % 11 === 5;
    splitWay(w).forEach((coords, si) => {
      const lastPassDays = uncoveredWay ? between(35, 90) : between(0, 12);
      segments.push({
        id: `${w.id}-${si}`,
        roadId: w.id,
        roadName: w.name,
        roadClass: w.class,
        coords,
        condition: uncoveredWay ? "non_couvert" : "bon",
        defectIds: [],
        lastPass: daysAgo(lastPassDays),
      });
    });
  });
  const covered = segments.filter((s) => s.condition !== "non_couvert");

  // 2) défauts
  const defects: Defect[] = [];
  const N = 148;
  for (let i = 0; i < N; i++) {
    const seg = pick(covered);
    const [lat, lng] = pointAlong(seg.coords, between(0.1, 0.9));
    const type = weighted(TYPE_WEIGHTS);
    const surface: Surface = SIDEWALK_TYPES.includes(type) ? "trottoir" : "chaussee";
    const offset = surface === "trottoir" ? 0.00006 : 0; // décalage visuel vers le trottoir
    const isLinear = type.startsWith("fissure") || type === "bordure_cassee";
    const lengthM = round(isLinear ? between(1.5, 14) : between(0.3, 2.8));
    const widthM = round(isLinear ? between(0.01, 0.05) : between(0.3, 2.2), 2);
    const depthCm = type === "nid_de_poule" ? round(Math.min(18, Math.max(1, -Math.log(1 - rnd()) * 4.5 + 1))) : type === "affaissement" ? round(between(3, 12)) : undefined;
    const area = lengthM * Math.max(widthM, 0.3);
    const severity = type === "plaque_egout_defectueuse" ? weighted<Severity>([["elevee", 2], ["critique", 1], ["moyenne", 1]]) : severityFor(type, depthCm, area);
    const firstSeenDays = Math.round(between(2, 170));
    const citizen = rnd() < 0.3 ? 1 + Math.floor(rnd() * 5) : 0;
    const status: DefectStatus = weighted([["detecte", 26], ["valide", 22], ["planifie", 14], ["en_cours", 8], ["repare", 12], ["verifie", 18]]);
    const line = PRICE_LINES[type];
    const quantity = line.unit === "u" ? 1 : line.unit === "ml" ? round(lengthM * 1.1) : round(area * 1.3);
    const amount = Math.round(quantity * line.unitPriceTnd + (line.unit === "u" ? 150 : 80));
    const factors = priorityFactors(severity, seg.roadClass, firstSeenDays, citizen, rnd() < 0.22);
    const score = Math.round(100 * factors.reduce((s, f) => s + f.weight * f.value, 0));
    const observations = makeObservations(firstSeenDays, depthCm, surface, citizen);
    const id = `BZT-${String(i + 1).padStart(4, "0")}`;
    observations.forEach((o, k) => {
      if (o.source !== "citoyen_sms") o.imageUrl = defectIllustration(type, i * 7 + k);
    });
    const team = ["planifie", "en_cours", "repare", "verifie"].includes(status) ? pick(TEAMS).name : undefined;
    defects.push({
      id,
      type,
      surface,
      severity,
      status,
      position: { lat: lat + offset, lng: lng + offset },
      roadId: seg.roadId,
      roadName: seg.roadName ?? "Voie de desserte",
      district: districtOf(lat, lng),
      dimensions: { lengthM, widthM, depthCm },
      firstSeen: observations[0].date,
      lastSeen: observations[observations.length - 1].date,
      observations,
      cost: {
        amountTnd: amount,
        rangeTnd: [Math.round(amount * 0.8), Math.round(amount * 1.25)],
        quantity,
        unit: line.unit,
        priceLine: { code: line.code, label: line.label, unitPriceTnd: line.unitPriceTnd, provisional: line.provisional },
        technicalRef: TECH_REF,
      },
      priority: { score, rank: 0, factors },
      citizenReports: citizen,
      assignedTeam: team,
      plannedDate: status === "planifie" ? daysAgo(-between(2, 20)) : undefined,
    });
    seg.defectIds.push(id);
  }
  // rang de priorité parmi les défauts non réparés
  defects
    .filter((d) => d.status !== "repare" && d.status !== "verifie")
    .sort((a, b) => b.priority.score - a.priority.score)
    .forEach((d, k) => (d.priority.rank = k + 1));

  // 3) état des segments = pire défaut actif sur la chaussée ou le trottoir
  const byId = new Map(defects.map((d) => [d.id, d]));
  for (const s of covered) {
    const active = s.defectIds.map((id) => byId.get(id)!).filter((d) => d.status !== "repare" && d.status !== "verifie");
    if (active.some((d) => d.severity === "critique" || d.severity === "elevee")) s.condition = "critique";
    else if (active.length) s.condition = "degrade";
  }

  // 4) plaques d'égout intactes (objets détectés, jamais comptés comme défauts)
  const assets: Asset[] = Array.from({ length: 64 }, (_, i) => {
    const seg = pick(covered);
    const [lat, lng] = pointAlong(seg.coords, between(0.05, 0.95));
    return { id: `PE-${String(i + 1).padStart(3, "0")}`, type: "plaque_egout", position: { lat, lng }, roadName: seg.roadName ?? "Voie de desserte", lastSeen: daysAgo(between(0, 10)) };
  });

  // 5) signalements citoyens (textes fictifs, derja / français / arabe)
  const smsSamples: [string, DefectType | null, Severity | null, number][] = [
    ["famma 7ofra kbira barcha 9odem el 7ammam fi nahj ibn rochd, el karhba ta7et fiha", "nid_de_poule", "elevee", 0.91],
    ["Bonjour, trou dangereux devant l'école primaire avenue Habib Bougatfa, merci d'intervenir", "nid_de_poule", "critique", 0.94],
    ["الطريق مكسرة قدام الجامع في شارع حسن النوري", "faiencage", "moyenne", 0.78],
    ["el trottoir mkasser w el dalles ta7t, ommi ta7et el bera7", "dalle_cassee", "elevee", 0.86],
    ["couvercle d'égout qui bouge rue de Russie, bruit à chaque voiture", "plaque_egout_defectueuse", "moyenne", 0.88],
    ["chouf chnowa sar fi tri9 el corniche ba3d el mtar", null, null, 0.31],
    ["merci pour la réparation avenue d'Afrique 👍", null, null, 0.22],
    ["chajra 3amlet el trottoir kollou mdarres 9odem el poste", "soulevement_racine", "moyenne", 0.8],
  ];
  const locs = ["Rue Ibn Rochd", "Avenue Habib Bougatfa", "Avenue Hassan Ennouri", "Rue Moncef Bey", "Rue de Russie", "Route de la Corniche", null, "Avenue Habib Bourguiba"];
  const reports: CitizenReport[] = smsSamples.map(([text, type, sev, conf], i) => {
    const target = type ? defects.find((d) => d.type === type && d.status === "detecte") : undefined;
    return {
      id: `SIG-${String(210 + i)}`,
      receivedAt: daysAgo(between(0, 6)),
      channel: "sms",
      rawText: text,
      phoneMasked: `+216 ${pick(["2", "5", "9"])}${Math.floor(between(1, 9))} ••• ${Math.floor(between(100, 999))}`,
      extraction: { type, location: locs[i], severityHint: sev, confidence: conf, schemaValid: conf > 0.5 },
      position: target?.position,
      matchedDefectId: target && i % 2 === 0 ? target.id : undefined,
      state: i < 5 ? "a_valider" : i === 5 ? "rejete" : i === 6 ? "rejete" : "valide",
    };
  });
  const photoCases: [boolean, string | undefined, DefectType][] = [
    [true, undefined, "nid_de_poule"],
    [true, undefined, "bordure_cassee"],
    [false, "Photo floue", "nid_de_poule"],
    [true, undefined, "affaissement"],
    [false, "Ne montre pas une voie", "fissure_longitudinale"],
    [true, undefined, "dalle_cassee"],
  ];
  photoCases.forEach(([accepted, reason, type], i) => {
    const target = defects.find((d) => d.type === type);
    reports.push({
      id: `SIG-${String(230 + i)}`,
      receivedAt: daysAgo(between(0, 5)),
      channel: "photo",
      imageUrl: defectIllustration(type, 900 + i, !accepted),
      photoCheck: { accepted, reason, blurScore: accepted ? round(between(90, 400), 0) : round(between(12, 55), 0), roadScore: accepted ? round(between(0.7, 0.97), 2) : round(between(0.1, 0.4), 2) },
      extraction: accepted ? { type, location: target?.roadName ?? null, severityHint: target?.severity ?? null, confidence: round(between(0.7, 0.93), 2), schemaValid: true } : undefined,
      position: target?.position,
      matchedDefectId: accepted && i % 2 === 1 ? target?.id : undefined,
      state: accepted ? "a_valider" : "rejete",
    });
  });
  reports.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));

  // 6) séries mensuelles (12 mois)
  const timeline: TimePoint[] = [];
  let ci = 61;
  let backlog = 410_000;
  for (let m = 11; m >= 0; m--) {
    const d = new Date(NOW.getFullYear(), NOW.getMonth() - m, 1);
    const pilotStarted = m <= 5; // la collecte automatisée démarre il y a 6 mois
    const detected = Math.round(pilotStarted ? between(38, 62) : between(8, 16));
    // avant le pilote : détection manuelle, le stock grossit ; après : rattrapage progressif
    const repaired = Math.round(pilotStarted ? detected * (m <= 2 ? between(1.15, 1.4) : between(0.7, 0.95)) : detected * between(0.4, 0.7));
    ci = Math.max(40, Math.min(90, ci + (pilotStarted ? between(0.5, 2.8) : between(-1.8, 0.4))));
    backlog = Math.max(120_000, backlog + (detected - repaired) * 4_000 + between(-4000, 4000));
    timeline.push({ month: d.toISOString().slice(0, 7), detected, repaired, conditionIndex: round(ci, 1), backlogCostTnd: Math.round(backlog) });
  }
  // les séries se terminent exactement sur les indicateurs du jour (cohérence tableau de bord / graphiques)
  const today = computeKpis(defects, segments, reports);
  const ciShift = today.conditionIndex - timeline[timeline.length - 1].conditionIndex;
  const costScale = today.backlogCostTnd / timeline[timeline.length - 1].backlogCostTnd;
  timeline.forEach((t) => {
    t.conditionIndex = round(t.conditionIndex + ciShift, 1);
    t.backlogCostTnd = Math.round(t.backlogCostTnd * costScale);
  });

  return { defects, segments, assets, reports, teams: TEAMS, timeline };
}

export const db: MockDatabase = build();

export function computeKpis(defects: Defect[], segments: RoadSegment[], reports: CitizenReport[]): NetworkKpis {
  const len = (s: RoadSegment) => s.coords.slice(1).reduce((a, p, i) => a + haversineM(s.coords[i], p), 0) / 1000;
  const networkKm = segments.reduce((a, s) => a + len(s), 0);
  const coveredKm = segments.filter((s) => s.condition !== "non_couvert").reduce((a, s) => a + len(s), 0);
  const active = defects.filter((d) => d.status !== "repare" && d.status !== "verifie");
  const repaired = defects.filter((d) => (d.status === "repare" || d.status === "verifie") && Date.now() - new Date(d.lastSeen).getTime() < 30 * 86_400_000);
  const goodKm = segments.filter((s) => s.condition === "bon").reduce((a, s) => a + len(s), 0);
  return {
    networkKm: round(networkKm),
    coveredKm: round(coveredKm),
    activeDefects: active.length,
    criticalDefects: active.filter((d) => d.severity === "critique").length,
    backlogCostTnd: active.reduce((a, d) => a + d.cost.amountTnd, 0),
    repairedLast30d: repaired.length,
    meanRepairDays: 11.4,
    pendingReports: reports.filter((r) => r.state === "a_valider").length,
    conditionIndex: coveredKm ? Math.round((100 * goodKm) / coveredKm) : 0,
  };
}
