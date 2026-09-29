/**
 * Exporte les données simulées vers le backend Spring Boot :
 *   roadmap_api/src/main/resources/seed/seed.json   (défauts, tronçons, signalements…)
 *   roadmap_api/src/main/resources/static/media/seed/*.svg   (illustrations)
 * Usage : npx tsx scripts/export-seed.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { db } from "../src/mocks/generate";

const API = resolve(import.meta.dirname, "../../roadmap_api/src/main/resources");
const MEDIA = resolve(API, "static/media/seed");
mkdirSync(MEDIA, { recursive: true });
mkdirSync(resolve(API, "seed"), { recursive: true });

let n = 0;
function toFile(uri?: string): string | undefined {
  if (!uri?.startsWith("data:image/svg+xml")) return uri;
  const svg = decodeURIComponent(uri.slice(uri.indexOf(",") + 1));
  const name = `img-${String(++n).padStart(4, "0")}.svg`;
  writeFileSync(resolve(MEDIA, name), svg, "utf-8");
  return `/media/seed/${name}`;
}

const defects = db.defects.map((d) => ({ ...d, observations: d.observations.map((o) => ({ ...o, imageUrl: toFile(o.imageUrl) })) }));
const reports = db.reports.map((r) => ({ ...r, imageUrl: toFile(r.imageUrl) }));

writeFileSync(
  resolve(API, "seed/seed.json"),
  JSON.stringify({ exportedAt: new Date().toISOString(), defects, segments: db.segments, assets: db.assets, reports, teams: db.teams, timeline: db.timeline }),
  "utf-8",
);
console.log(`seed: ${defects.length} défauts, ${db.segments.length} tronçons, ${reports.length} signalements, ${n} images`);
