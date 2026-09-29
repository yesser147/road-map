/**
 * Illustrations vectorielles tenant lieu de photos (aucune image réelle dans la maquette).
 * Chaque image montre un revêtement stylisé, le défaut et le cadre de détection WP2.
 */
import type { DefectType } from "@/types/domain";

function rng(seed: number) {
  let s = seed * 9301 + 49297;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

const BOX_COLOR: Partial<Record<DefectType, string>> = {
  nid_de_poule: "#ff4d5e",
  affaissement: "#ff4d5e",
  plaque_egout_defectueuse: "#ff9f43",
};

export function defectIllustration(type: DefectType, seed: number, blurry = false): string {
  const r = rng(seed + 1);
  const W = 640;
  const H = 400;
  const sidewalk = ["dalle_cassee", "bordure_cassee", "ressaut", "soulevement_racine"].includes(type);
  const base = sidewalk ? "#b9b2a6" : "#4b4f55";
  const base2 = sidewalk ? "#a39c90" : "#3d4146";
  let speckles = "";
  for (let i = 0; i < 140; i++) {
    const x = r() * W;
    const y = r() * H;
    const c = r() > 0.5 ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.12)";
    speckles += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(r() * 2.2 + 0.4).toFixed(1)}" fill="${c}"/>`;
  }
  let shape = "";
  let box = [230, 140, 190, 130];
  const cx = 320 + (r() - 0.5) * 80;
  const cy = 215 + (r() - 0.5) * 40;
  switch (type) {
    case "nid_de_poule":
    case "affaissement": {
      const rx = 70 + r() * 40;
      const ry = 38 + r() * 22;
      const pts = Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const k = 0.82 + r() * 0.3;
        return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
      });
      // contour lissé : courbes quadratiques passant par les milieux des côtés
      const mid = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const smooth = (ps: number[][], scale = 1) => {
        const q = ps.map(([x, y]) => [cx + (x - cx) * scale, cy + (y - cy) * scale]);
        let d = `M ${mid(q[q.length - 1], q[0]).map((v) => v.toFixed(0)).join(" ")}`;
        q.forEach((pt, i) => {
          const m = mid(pt, q[(i + 1) % q.length]);
          d += ` Q ${pt[0].toFixed(0)} ${pt[1].toFixed(0)} ${m[0].toFixed(0)} ${m[1].toFixed(0)}`;
        });
        return d + " Z";
      };
      const dark = type === "affaissement" ? "#2e3135" : "#1b1d20";
      shape = `<path d="${smooth(pts, 1.12)}" fill="rgba(0,0,0,.18)"/>
        <path d="${smooth(pts)}" fill="${dark}" stroke="#5a5e64" stroke-width="3"/>
        <path d="${smooth(pts, 0.62)}" fill="${type === "affaissement" ? "#26292c" : "#111214"}"/>
        ${type === "nid_de_poule" ? Array.from({ length: 7 }, () => `<circle cx="${(cx + (r() - 0.5) * rx).toFixed(0)}" cy="${(cy + (r() - 0.5) * ry).toFixed(0)}" r="${(2 + r() * 3).toFixed(1)}" fill="#6b6f75"/>`).join("") : ""}`;
      box = [cx - rx * 1.2, cy - ry * 1.35, rx * 2.4, ry * 2.7];
      break;
    }
    case "fissure_longitudinale":
    case "fissure_transversale": {
      const vertical = type === "fissure_longitudinale";
      let d = vertical ? `M ${cx} 40` : `M 80 ${cy}`;
      for (let i = 1; i <= 12; i++) {
        d += vertical ? ` L ${(cx + (r() - 0.5) * 36).toFixed(0)} ${40 + i * 27}` : ` L ${80 + i * 40} ${(cy + (r() - 0.5) * 30).toFixed(0)}`;
      }
      shape = `<path d="${d}" fill="none" stroke="#151618" stroke-width="5" stroke-linejoin="round"/>`;
      box = vertical ? [cx - 45, 30, 90, 340] : [70, cy - 40, 500, 80];
      break;
    }
    case "faiencage": {
      let d = "";
      for (let i = 0; i < 26; i++) {
        const x = cx - 120 + r() * 240;
        const y = cy - 70 + r() * 140;
        d += `M ${x.toFixed(0)} ${y.toFixed(0)} l ${((r() - 0.5) * 60).toFixed(0)} ${((r() - 0.5) * 50).toFixed(0)} l ${((r() - 0.5) * 50).toFixed(0)} ${((r() - 0.5) * 50).toFixed(0)} `;
      }
      shape = `<path d="${d}" fill="none" stroke="#17181a" stroke-width="3.5" stroke-linecap="round"/>`;
      box = [cx - 140, cy - 90, 280, 180];
      break;
    }
    case "plaque_egout_defectueuse": {
      shape = `<ellipse cx="${cx}" cy="${cy}" rx="70" ry="42" fill="#5c5245" stroke="#2b2620" stroke-width="7" transform="rotate(${(r() * 10 - 5).toFixed(0)} ${cx} ${cy})"/>
        <path d="M ${cx - 50} ${cy} h 100 M ${cx} ${cy - 30} v 60" stroke="#40382f" stroke-width="5"/>
        <path d="M ${cx - 78} ${cy + 20} q 40 30 110 20" stroke="#161719" stroke-width="5" fill="none"/>`;
      box = [cx - 95, cy - 65, 190, 130];
      break;
    }
    default: {
      // trottoir : dalles
      let tiles = "";
      for (let x = 0; x < W; x += 80) for (let y = 0; y < H; y += 80) tiles += `<rect x="${x + 2}" y="${y + 2}" width="76" height="76" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="3"/>`;
      const crack = `<path d="M ${cx - 70} ${cy - 50} L ${cx - 10} ${cy} L ${cx - 30} ${cy + 40} M ${cx - 10} ${cy} L ${cx + 60} ${cy + 20}" stroke="#4a4540" stroke-width="5" fill="none"/>`;
      const lift = type === "soulevement_racine" || type === "ressaut" ? `<rect x="${cx - 70}" y="${cy - 40}" width="150" height="90" fill="rgba(0,0,0,.12)" transform="rotate(-6 ${cx} ${cy})"/>` : "";
      const curb = type === "bordure_cassee" ? `<rect x="0" y="${H - 70}" width="${W}" height="30" fill="#8d877d"/><path d="M ${cx - 40} ${H - 70} l 20 30 l 30 -30" fill="#4b4f55"/>` : "";
      shape = tiles + lift + crack + curb;
      box = [cx - 90, cy - 70, 180, type === "bordure_cassee" ? 250 : 140];
    }
  }
  const col = BOX_COLOR[type] ?? "#ffc53d";
  const [bx, by, bw, bh] = box.map((v) => Math.round(v));
  const blur = blurry ? `<filter id="b"><feGaussianBlur stdDeviation="9"/></filter>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${base2}"/><stop offset="1" stop-color="${base}"/></linearGradient>${blur}</defs>
    <g ${blurry ? 'filter="url(#b)"' : ""}>
      <rect width="${W}" height="${H}" fill="url(#g)"/>${speckles}${shape}
      ${!sidewalk && !type.startsWith("fissure_long") ? `<path d="M 40 ${H - 30} L ${W - 40} ${H - 30}" stroke="rgba(255,255,255,.55)" stroke-width="8" stroke-dasharray="46 30"/>` : ""}
    </g>
    ${blurry ? "" : `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="none" stroke="${col}" stroke-width="4" rx="4"/>`}
    <text x="${W - 12}" y="${H - 12}" text-anchor="end" font-family="Inter,Arial" font-size="15" fill="rgba(255,255,255,.75)">illustration — maquette</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
