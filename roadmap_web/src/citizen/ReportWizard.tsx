import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Camera, CheckCircle2, ChevronLeft, Crosshair, ImagePlus, Loader2, MapPin, RotateCcw, Send, ShieldAlert } from "lucide-react";
import { api } from "@/api";
import { DEFECT_LABEL } from "@/config/labels";
import { PILOT_ZONE } from "@/mocks/generate";
import type { CitizenReport, DefectType } from "@/types/domain";
import { currentTilt, readExifFocal, startTiltTracking, type CameraMeta } from "./cameraMeta";

type Step = "photo" | "position" | "details" | "sending" | "done";

const TYPE_CHOICES: { type: DefectType; label: string }[] = [
  { type: "nid_de_poule", label: "Nid-de-poule" },
  { type: "fissure_longitudinale", label: "Fissure" },
  { type: "affaissement", label: "Affaissement" },
  { type: "plaque_egout_defectueuse", label: "Plaque d'égout" },
  { type: "dalle_cassee", label: "Trottoir cassé" },
  { type: "bordure_cassee", label: "Bordure cassée" },
  { type: "soulevement_racine", label: "Racine d'arbre" },
];

const pin = L.divIcon({
  className: "",
  html: `<svg width="34" height="44" viewBox="0 0 34 44"><path d="M17 43s15-15.6 15-26A15 15 0 0 0 2 17c0 10.4 15 26 15 26z" fill="#c62f3c" stroke="#fff" stroke-width="2.5"/><circle cx="17" cy="17" r="5.5" fill="#fff"/></svg>`,
  iconSize: [34, 44],
  iconAnchor: [17, 43],
});

const MAX_SIDE = 1920;
/** Taille maximale envoyée (le serveur refuse au-delà de 20 Mo). */
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Décode l'image : createImageBitmap d'abord, sinon via <img> (plus de formats, ex. HEIC sur iPhone). */
async function decode(file: File): Promise<{ src: CanvasImageSource; w: number; h: number; close?: () => void }> {
  try {
    const bmp = await createImageBitmap(file);
    return { src: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { src: img, w: img.naturalWidth, h: img.naturalHeight };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/**
 * Réduit la photo (≤ 1920 px, JPEG 85 %) avant l'envoi : les photos de téléphone font 5 à 20 Mo,
 * trop lourdes pour le réseau mobile et inutiles pour l'analyse. Échoue proprement si impossible.
 */
async function shrink(file: File): Promise<File> {
  let decoded;
  try {
    decoded = await decode(file);
  } catch {
    if (file.size <= MAX_UPLOAD_BYTES) return file; // format non décodable mais taille acceptable : envoi tel quel
    throw new Error("Cette photo ne peut pas être préparée pour l'envoi. Réessayez avec l'appareil photo (format JPEG).");
  }
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(decoded.w, decoded.h));
    if (scale === 1 && file.size < 1.5e6 && file.type === "image/jpeg") return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(decoded.w * scale);
    canvas.height = Math.round(decoded.h * scale);
    canvas.getContext("2d")!.drawImage(decoded.src, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob) throw new Error("toBlob");
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    if (file.size <= MAX_UPLOAD_BYTES) return file;
    throw new Error("Photo trop volumineuse pour être envoyée. Réduisez la résolution de l'appareil photo et réessayez.");
  } finally {
    decoded.close?.();
  }
}

function ClickToMove({ onMove }: { onMove: (p: L.LatLng) => void }) {
  useMapEvents({ click: (e) => onMove(e.latlng) });
  return null;
}

function Recenter({ at }: { at: L.LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    map.setView(at, Math.max(map.getZoom(), 17));
  }, [at, map]);
  return null;
}

export default function ReportWizard() {
  const [step, setStep] = useState<Step>("photo");
  const [photo, setPhoto] = useState<File | null>(null);
  const [camera, setCamera] = useState<CameraMeta>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [gps, setGps] = useState<{ state: "idle" | "locating" | "ok" | "unavailable"; accuracy?: number }>({ state: "idle" });
  const [type, setType] = useState<DefectType | undefined>();
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<CitizenReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function onFile(picked: File | undefined, capture: "camera" | "gallery") {
    if (!picked) return;
    setError(null);
    // Copie immédiate en mémoire : sur Android, un fichier de la galerie n'est parfois lisible qu'une fois
    // (autorisation temporaire). Sans cette copie, l'envoi échoue plus tard avec une erreur réseau trompeuse.
    let f: File;
    try {
      f = new File([await picked.arrayBuffer()], picked.name || "photo.jpg", { type: picked.type || "image/jpeg" });
    } catch {
      setError("Impossible de lire cette photo. Choisissez-la à nouveau dans la galerie ou prenez une nouvelle photo.");
      return;
    }
    // focale lue AVANT la réduction (qui efface l'EXIF) ; inclinaison seulement pour une photo prise à l'instant
    const exif = readExifFocal(await f.arrayBuffer());
    setCamera({ ...exif, ...(capture === "camera" ? currentTilt() : {}), capture });
    let small: File;
    try {
      small = await shrink(f);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    setPhoto(small);
    setPreview(URL.createObjectURL(small));
    setStep("position");
    locate();
  }

  function locate() {
    // la géolocalisation exige HTTPS (ou localhost) ; sinon l'utilisateur place le repère sur la carte
    if (!("geolocation" in navigator) || !window.isSecureContext) {
      setGps({ state: "unavailable" });
      return;
    }
    setGps({ state: "locating" });
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGps({ state: "ok", accuracy: Math.round(p.coords.accuracy) });
      },
      () => setGps({ state: "unavailable" }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  }

  async function send() {
    if (!photo || !pos) return;
    setStep("sending");
    setError(null);
    try {
      setResult(await api.submitReport({ photo, lat: pos.lat, lng: pos.lng, type, description: description.trim() || undefined, camera }));
      setStep("done");
    } catch (e) {
      setError((e as Error).message);
      setStep("details");
    }
  }

  function restart() {
    setStep("photo");
    setPhoto(null);
    setPreview(null);
    setPos(null);
    setType(undefined);
    setDescription("");
    setResult(null);
    setGps({ state: "idle" });
  }

  const stepIndex = { photo: 0, position: 1, details: 2, sending: 2, done: 3 }[step];

  return (
    <div className="cz-page">
      {step !== "done" && (
        <div className="cz-progress">
          {["Photo", "Emplacement", "Détails"].map((l, i) => (
            <div key={l} className={i <= stepIndex ? "on" : ""}><span>{i + 1}</span>{l}</div>
          ))}
        </div>
      )}

      {/* ---------------------------------------------------------------- 1. photo */}
      {step === "photo" && (
        <section className="stack" style={{ gap: 14 }}>
          <h2 className="cz-h2">Photographiez la dégradation</h2>
          <p className="muted" style={{ margin: 0 }}>Cadrez le défaut en entier, de jour si possible. Évitez de photographier des personnes.</p>
          <button className="cz-shot" onClick={() => { void startTiltTracking(); cameraRef.current?.click(); }}>
            <Camera size={40} />
            <b>Prendre une photo</b>
            <span className="small">Ouvre l'appareil photo</span>
          </button>
          <button className="btn lg" onClick={() => galleryRef.current?.click()}><ImagePlus size={18} /> Choisir dans la galerie</button>
          {error && <div className="form-error">{error}</div>}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onFile(e.target.files?.[0], "camera"); e.target.value = ""; }} />
          <input ref={galleryRef} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0], "gallery"); e.target.value = ""; }} />
        </section>
      )}

      {/* ---------------------------------------------------------------- 2. emplacement */}
      {step === "position" && (
        <section className="stack" style={{ gap: 12 }}>
          <div className="row">
            <button className="btn ghost sm" onClick={() => setStep("photo")}><ChevronLeft size={16} /> Photo</button>
            {preview && <img src={preview} alt="" className="cz-thumb" />}
          </div>
          <h2 className="cz-h2">Où se trouve-t-elle ?</h2>
          <div className="small" style={{ color: gps.state === "ok" ? "var(--ok)" : "var(--ink-2)" }}>
            {gps.state === "locating" && <span className="row" style={{ gap: 6 }}><Loader2 size={14} className="spin" /> Recherche de votre position…</span>}
            {gps.state === "ok" && <span className="row" style={{ gap: 6 }}><Crosshair size={14} /> Position GPS trouvée (± {gps.accuracy} m). Déplacez le repère si besoin.</span>}
            {gps.state === "unavailable" && <span className="row" style={{ gap: 6 }}><MapPin size={14} /> Touchez la carte pour placer le repère à l'endroit exact.</span>}
          </div>
          <div className="cz-map">
            <MapContainer center={pos ? [pos.lat, pos.lng] : [PILOT_ZONE.center.lat, PILOT_ZONE.center.lng]} zoom={pos ? 17 : 15} zoomControl={false}>
              <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" maxZoom={19} />
              <ClickToMove onMove={(p) => setPos({ lat: p.lat, lng: p.lng })} />
              {pos && (
                <>
                  <Recenter at={[pos.lat, pos.lng]} />
                  <Marker position={[pos.lat, pos.lng]} icon={pin} draggable
                    eventHandlers={{ dragend: (e) => { const p = (e.target as L.Marker).getLatLng(); setPos({ lat: p.lat, lng: p.lng }); } }} />
                </>
              )}
            </MapContainer>
          </div>
          <button className="btn primary lg" disabled={!pos} onClick={() => setStep("details")}>Continuer</button>
        </section>
      )}

      {/* ---------------------------------------------------------------- 3. détails */}
      {(step === "details" || step === "sending") && (
        <section className="stack" style={{ gap: 14 }}>
          <div className="row">
            <button className="btn ghost sm" onClick={() => setStep("position")} disabled={step === "sending"}><ChevronLeft size={16} /> Emplacement</button>
            {preview && <img src={preview} alt="" className="cz-thumb" />}
          </div>
          <h2 className="cz-h2">De quoi s'agit-il ?</h2>
          <div className="small muted" style={{ marginTop: -8 }}>Facultatif — la photo est aussi analysée automatiquement.</div>
          <div className="cz-types">
            {TYPE_CHOICES.map((c) => (
              <button key={c.type} type="button" className={type === c.type ? "on" : ""} onClick={() => setType(type === c.type ? undefined : c.type)}>{c.label}</button>
            ))}
          </div>
          {camera.capture === "camera" && (
            <div className="field">Photo prise
              <div className="cz-types" role="radiogroup" aria-label="Position lors de la photo">
                {([["standing", "Debout"], ["crouching", "Accroupi(e)"]] as const).map(([k, label]) => (
                  <button key={k} type="button" role="radio" aria-checked={(camera.posture ?? "standing") === k}
                    className={(camera.posture ?? "standing") === k ? "on" : ""} onClick={() => setCamera({ ...camera, posture: k })}>{label}</button>
                ))}
              </div>
              <span className="small muted">Sert à estimer la taille du défaut.</span>
            </div>
          )}
          <label className="field">Commentaire <span className="muted">(facultatif)</span>
            <textarea className="input" rows={3} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex. : devant l'école, dangereux pour les deux-roues" />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button className="btn primary lg" onClick={send} disabled={step === "sending"}>
            {step === "sending" ? <><Loader2 size={18} className="spin" /> Envoi et vérification…</> : <><Send size={18} /> Envoyer le signalement</>}
          </button>
        </section>
      )}

      {/* ---------------------------------------------------------------- 4. résultat */}
      {step === "done" && result && (
        <section className="stack" style={{ gap: 16, textAlign: "center", alignItems: "center", paddingTop: 12 }}>
          {result.photoCheck?.accepted !== false ? (
            <>
              <div className="cz-ok"><CheckCircle2 size={44} /></div>
              <h2 className="cz-h2">Merci, signalement reçu</h2>
              <p className="muted" style={{ margin: 0 }}>
                Référence <b className="num">{result.id}</b>. Les services vont le vérifier ; vous pouvez suivre son avancement.
              </p>
              {result.extraction?.type && (
                <div className="card" style={{ padding: "10px 14px", boxShadow: "none", textAlign: "left", width: "100%" }}>
                  <div className="small muted">Détecté sur la photo</div>
                  <b>{DEFECT_LABEL[result.extraction.type]}</b>
                  {result.extraction.location && <div className="small muted">{result.extraction.location}</div>}
                  {result.extraction.depthCm != null && (
                    <div className="small muted">Profondeur estimée : {result.extraction.depthCm} cm</div>
                  )}
                </div>
              )}
              {result.matchedDefectId && <div className="small muted">Ce problème était déjà connu des services : votre signalement renforce sa priorité.</div>}
            </>
          ) : (
            <>
              <div className="cz-ok bad"><ShieldAlert size={44} /></div>
              <h2 className="cz-h2">Photo non exploitable</h2>
              <p className="muted" style={{ margin: 0 }}>{result.photoCheck?.reason}. Reprenez une photo plus nette, de plus près, en cadrant la chaussée ou le trottoir.</p>
            </>
          )}
          <div className="stack" style={{ width: "100%", gap: 10 }}>
            <Link to="/citoyen/mes-signalements" className="btn primary lg">Suivre mes signalements</Link>
            <button className="btn lg" onClick={restart}><RotateCcw size={16} /> Nouveau signalement</button>
          </div>
        </section>
      )}
    </div>
  );
}
