/**
 * Ce que le téléphone sait de la prise de vue, envoyé avec la photo pour mesurer le défaut en centimètres :
 *  - la focale (EXIF), lue sur le fichier ORIGINAL : la réduction de la photo avant envoi efface les métadonnées ;
 *  - l'inclinaison du téléphone au moment de la photo (capteurs d'orientation).
 * Tout est facultatif : sans ces données, le service de vision estime la focale à partir de l'image.
 */

export interface CameraMeta {
  focal35?: number;   // focale équivalente 24x36 (mm)
  focalMm?: number;   // focale réelle (mm), si l'équivalent 24x36 manque
  tiltBeta?: number;  // inclinaison avant/arrière (degrés, 90 = téléphone vertical)
  tiltGamma?: number; // inclinaison gauche/droite (degrés)
  capture?: "camera" | "gallery";
  posture?: "standing" | "crouching"; // hauteur du téléphone au-dessus de la route (~1,40 m / ~0,75 m)
}

/** Focale lue dans l'en-tête EXIF d'un JPEG (tags 0xA405 FocalLengthIn35mmFilm et 0x920A FocalLength). */
export function readExifFocal(buf: ArrayBuffer): Pick<CameraMeta, "focal35" | "focalMm"> {
  const v = new DataView(buf);
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return {};
  let off = 2;
  while (off + 4 < v.byteLength) {
    const marker = v.getUint16(off);
    const size = v.getUint16(off + 2);
    if (marker === 0xffe1 && v.getUint32(off + 4) === 0x45786966) return parseTiff(v, off + 10); // "Exif"
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) break; // début de l'image : plus d'en-tête
    off += 2 + size;
  }
  return {};
}

function parseTiff(v: DataView, t: number): Pick<CameraMeta, "focal35" | "focalMm"> {
  const le = v.getUint16(t) === 0x4949;
  const u16 = (o: number) => v.getUint16(t + o, le);
  const u32 = (o: number) => v.getUint32(t + o, le);
  const entries = (ifd: number) => {
    const n = u16(ifd);
    return Array.from({ length: n }, (_, i) => ifd + 2 + i * 12);
  };
  try {
    const exifPtr = entries(u32(4)).find((e) => u16(e) === 0x8769);
    if (exifPtr === undefined) return {};
    const out: Pick<CameraMeta, "focal35" | "focalMm"> = {};
    for (const e of entries(u32(exifPtr + 8))) {
      const tag = u16(e);
      if (tag === 0xa405) out.focal35 = u16(e + 8) || undefined;
      if (tag === 0x920a) {
        const p = u32(e + 8);
        const type = u16(e + 2);
        if (type === 5) { // RATIONAL (format écrit par les téléphones)
          const den = u32(p + 4);
          if (den) out.focalMm = Math.round((u32(p) / den) * 100) / 100;
        } else if (type === 12) { // DOUBLE (certains logiciels)
          out.focalMm = Math.round(v.getFloat64(t + p, le) * 100) / 100;
        }
      }
    }
    return out;
  } catch {
    return {}; // EXIF tronqué ou non standard : on s'en passe
  }
}

/** Dernière orientation connue du téléphone, mise à jour tant que l'écran de prise de vue est ouvert. */
let lastTilt: { beta?: number; gamma?: number } = {};
let listening = false;

function onOrientation(e: DeviceOrientationEvent) {
  if (e.beta !== null && e.gamma !== null) lastTilt = { beta: e.beta, gamma: e.gamma };
}

/** À appeler sur un geste de l'utilisateur (iOS exige une autorisation demandée depuis un clic). */
export async function startTiltTracking(): Promise<void> {
  if (listening || typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return;
  const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
  try {
    if (typeof DOE.requestPermission === "function" && (await DOE.requestPermission()) !== "granted") return;
  } catch {
    return;
  }
  window.addEventListener("deviceorientation", onOrientation);
  listening = true;
}

export function currentTilt(): Pick<CameraMeta, "tiltBeta" | "tiltGamma"> {
  return lastTilt.beta === undefined ? {} : { tiltBeta: Math.round(lastTilt.beta * 10) / 10, tiltGamma: Math.round((lastTilt.gamma ?? 0) * 10) / 10 };
}
