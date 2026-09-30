/**
 * Collecte par véhicules — DONNÉES SIMULÉES.
 * Représente ce que renverra le service de traitement vidéo (WP1) : trajets filmés par les caméras
 * embarquées, étapes de la chaîne (réception → floutage → extraction d'images → détection WP2 →
 * regroupement → publication) et images où un défaut a été détecté, avec leur position GPS.
 * Les défauts référencés sont ceux de la carte (mêmes identifiants), ce qui illustre le regroupement :
 * un même nid-de-poule filmé à chaque passage reste une seule entité.
 */
import type { CaptureDetection, CaptureOverview, CaptureRun, CaptureVehicle, Defect, PipelineStep } from "@/types/domain";
import { db, districtOf, haversineM, ways, type Way } from "./generate";

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const r = rng(4242);
const between = (a: number, b: number) => a + r() * (b - a);

const NOW = new Date();
const day = (d: number, hour: number) => {
  const t = new Date(NOW);
  t.setDate(t.getDate() - d);
  t.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
  return t;
};

interface Line {
  vehicle: CaptureVehicle;
  districts: string[];
  everyDay: boolean;
  startHour: number;
}

const LINES: Line[] = [
  { vehicle: { id: "BUS-12", kind: "bus", label: "Ligne 1 — Centre-ville ↔ Zarzouna", plateMasked: "TU ••• 4127", camera: "Caméra 4K, 30 i/s", lastSync: "" }, districts: ["Centre-ville", "Zarzouna"], everyDay: true, startHour: 6.5 },
  { vehicle: { id: "BUS-07", kind: "bus", label: "Ligne 4 — Corniche ↔ Bizerte Nord", plateMasked: "TU ••• 3380", camera: "Caméra 4K, 30 i/s", lastSync: "" }, districts: ["Bizerte Nord"], everyDay: true, startHour: 7 },
  { vehicle: { id: "BUS-21", kind: "bus", label: "Ligne 9 — Bizerte Sud ↔ Centre-ville", plateMasked: "TU ••• 5902", camera: "Caméra Full HD, 30 i/s", lastSync: "" }, districts: ["Bizerte Sud", "Centre-ville"], everyDay: true, startHour: 7.5 },
  { vehicle: { id: "BENNE-03", kind: "benne", label: "Tournée de collecte — Bizerte Ouest", plateMasked: "TU ••• 1164", camera: "Caméra Full HD, 30 i/s", lastSync: "" }, districts: ["Bizerte Ouest", "Centre-ville"], everyDay: false, startHour: 5.5 },
];

const lengthKm = (w: Way) => w.coords.slice(1).reduce((a, p, i) => a + haversineM(w.coords[i], p), 0) / 1000;
const coveredRoads = new Set(db.segments.filter((s) => s.condition !== "non_couvert").map((s) => s.roadId));

function lineWays(l: Line): Way[] {
  return ways
    .filter((w) => w.name && coveredRoads.has(w.id) && l.districts.includes(districtOf(w.coords[0][0], w.coords[0][1])))
    .sort((a, b) => lengthKm(b) - lengthKm(a))
    .slice(0, 12);
}

const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

function pipeline(framesAnalyzed: number, detections: number, processing: boolean): PipelineStep[] {
  const steps: PipelineStep[] = [
    { key: "reception", label: "Réception de la vidéo", status: "termine", durationSec: Math.round(between(40, 180)), detail: "Transfert au dépôt (Wi-Fi) à la fin du service" },
    { key: "anonymisation", label: "Floutage visages et plaques", status: "termine", durationSec: Math.round(between(120, 400)), detail: "Avant tout stockage (art. 9.4)" },
    { key: "extraction", label: "Extraction des images + GPS", status: "termine", durationSec: Math.round(between(30, 90)), detail: "2 images par seconde, position de chaque image" },
    { key: "detection", label: "Détection des défauts (IA vision)", status: "termine", durationSec: Math.round(framesAnalyzed / 22), detail: `${framesAnalyzed.toLocaleString("fr-FR")} images analysées` },
    { key: "regroupement", label: "Regroupement des doublons", status: "termine", durationSec: Math.round(between(3, 12)), detail: `${detections} détections rattachées aux défauts connus` },
    { key: "publication", label: "Publication sur la carte", status: "termine", durationSec: 2 },
  ];
  if (processing) {
    steps[3].status = "en_cours";
    steps[3].durationSec = undefined;
    steps[3].detail = "Analyse en cours…";
    steps[4].status = "en_attente";
    steps[4].durationSec = undefined;
    steps[4].detail = undefined;
    steps[5].status = "en_attente";
    steps[5].durationSec = undefined;
  }
  return steps;
}

function detectionsFor(runId: string, roadIds: Set<string>, date: Date, durationSec: number, partial: boolean): CaptureDetection[] {
  const onRoute = db.defects.filter((d: Defect) => roadIds.has(d.roadId) && d.surface === "chaussee" && new Date(d.firstSeen) <= date);
  const out: CaptureDetection[] = [];
  onRoute.forEach((d, i) => {
    const treated = d.status === "repare" || d.status === "verifie";
    if (treated && new Date(d.lastSeen) < date) return; // réparé avant ce passage : plus détecté
    if (r() > (partial ? 0.35 : 0.72)) return; // le modèle ne voit pas tout à chaque passage (angle, trafic, lumière)
    const frame = d.observations.find((o) => o.imageUrl)?.imageUrl;
    out.push({
      id: `${runId}-D${i}`,
      defectId: d.id,
      type: d.type,
      severity: d.severity,
      confidence: Math.round(between(0.52, 0.96) * 100) / 100,
      frameUrl: frame,
      videoTime: "",
      position: d.position,
      roadName: d.roadName,
      depthCm: d.dimensions.depthCm,
      isNew: new Date(d.firstSeen).toDateString() === date.toDateString(),
    });
  });
  // ordre de passage dans la vidéo
  out.forEach((x, i) => (x.videoTime = mmss(((i + 1) / (out.length + 1)) * durationSec)));
  return out;
}

function build(): CaptureOverview {
  const runs: CaptureRun[] = [];
  for (const line of LINES) {
    const lw = lineWays(line);
    const roadIds = new Set(lw.map((w) => w.id));
    const baseKm = lw.reduce((a, w) => a + lengthKm(w), 0);
    for (let d = 13; d >= 0; d--) {
      if (!line.everyDay && d % 2 === 1) continue;
      if (d === 0 && line.vehicle.id !== "BUS-12") continue; // aujourd'hui : seul le premier bus est déjà rentré
      const start = day(d, line.startHour + between(0, 0.4));
      const distanceKm = Math.round(baseKm * between(2.4, 3.1) * 10) / 10; // allers-retours de la journée
      const durationMin = Math.round((distanceKm / between(15, 19)) * 60);
      const framesExtracted = durationMin * 60 * 2;
      const framesAnalyzed = Math.round(framesExtracted * between(0.9, 0.96)); // images trop floues écartées
      const processing = d === 0;
      const id = `${line.vehicle.id}-${start.toISOString().slice(0, 10)}`;
      const detections = detectionsFor(id, roadIds, start, durationMin * 60, processing);
      runs.push({
        id,
        vehicleId: line.vehicle.id,
        startedAt: start.toISOString(),
        durationMin,
        distanceKm,
        videoMinutes: durationMin,
        framesExtracted,
        framesAnalyzed,
        framesBlurred: Math.round(framesExtracted * between(0.04, 0.09)),
        track: lw.map((w) => w.coords),
        pipeline: pipeline(framesAnalyzed, detections.length, processing),
        detections,
        status: processing ? "en_traitement" : "publie",
      });
    }
    const mine = runs.filter((x) => x.vehicleId === line.vehicle.id);
    const last = mine[mine.length - 1];
    line.vehicle.lastSync = last ? new Date(new Date(last.startedAt).getTime() + (last.durationMin + 25) * 60_000).toISOString() : "";
  }
  // « nouveau » = première détection d'un défaut par un véhicule, au plus 14 jours après son apparition
  runs.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const seen = new Set<string>();
  const firstSeen = new Map(db.defects.map((d) => [d.id, new Date(d.firstSeen).getTime()]));
  for (const run of runs) {
    for (const det of run.detections) {
      const age = new Date(run.startedAt).getTime() - (firstSeen.get(det.defectId) ?? 0);
      det.isNew = !seen.has(det.defectId) && age <= 14 * 86_400_000;
      seen.add(det.defectId);
    }
  }
  runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return { vehicles: LINES.map((l) => l.vehicle), runs, simulated: true };
}

export const captures: CaptureOverview = build();
