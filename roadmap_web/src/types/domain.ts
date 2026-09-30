/**
 * Modèle de domaine partagé par toute l'interface.
 * Les noms suivent le contrat (Article 3) et le format DetectionEvent v1 de WP2
 * (wp2_vision/contracts/detection_event.schema.json). L'API WP4 doit renvoyer ces formes.
 */

export type DefectType =
  | "nid_de_poule"
  | "fissure_longitudinale"
  | "fissure_transversale"
  | "faiencage"
  | "affaissement"
  | "plaque_egout_defectueuse"
  | "dalle_cassee"
  | "ressaut"
  | "soulevement_racine"
  | "bordure_cassee";

/** Objets détectés mais jamais comptés comme défauts (WP2 : is_defect = false). */
export type AssetType = "plaque_egout";

export type Surface = "chaussee" | "trottoir";
export type Severity = "faible" | "moyenne" | "elevee" | "critique";
export type Source = "vehicule" | "pieton" | "citoyen_photo" | "citoyen_sms";

/** Cycle de vie F9 : de la détection à la vérification après réparation. */
export type DefectStatus = "detecte" | "valide" | "planifie" | "en_cours" | "repare" | "verifie";

/** "citoyen" : espace citoyen (signalement photo). Les trois autres : espace Ministère. */
export type Role = "citoyen" | "ministere" | "direction_regionale" | "agent_municipal";
export type StaffRole = Exclude<Role, "citoyen">;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Observation {
  id: string;
  date: string; // ISO
  source: Source;
  confidence: number; // 0..1
  depthCm?: number;
  imageUrl?: string;
}

export interface CostEstimate {
  amountTnd: number;
  rangeTnd: [number, number];
  quantity: number;
  unit: "m²" | "ml" | "u";
  /** Ligne du barème citée (F6 : chaque coût est sourcé). */
  priceLine: { code: string; label: string; unitPriceTnd: number; provisional: boolean };
  technicalRef: string;
}

export interface PriorityFactor {
  key: "gravite" | "trafic" | "sites_sensibles" | "anciennete" | "signalements";
  label: string;
  weight: number; // 0..1, somme = 1
  value: number; // 0..1
}

export interface Priority {
  score: number; // 0..100
  rank: number;
  factors: PriorityFactor[];
}

export interface Defect {
  id: string; // ex. BZT-0042
  type: DefectType;
  surface: Surface;
  severity: Severity;
  status: DefectStatus;
  position: LatLng;
  roadId: string;
  roadName: string;
  district: string;
  /** Mesures ; absentes = non mesurées (jamais de valeur inventée). */
  dimensions: { lengthM?: number; widthM?: number; depthCm?: number };
  firstSeen: string;
  lastSeen: string;
  observations: Observation[];
  cost: CostEstimate;
  priority: Priority;
  citizenReports: number;
  assignedTeam?: string;
  plannedDate?: string;
}

export interface Asset {
  id: string;
  type: AssetType;
  position: LatLng;
  roadName: string;
  lastSeen: string;
}

export type SegmentCondition = "bon" | "degrade" | "critique" | "non_couvert";

export interface RoadSegment {
  id: string;
  roadId: string;
  roadName: string | null;
  roadClass: string;
  coords: [number, number][];
  condition: SegmentCondition;
  defectIds: string[];
  lastPass?: string; // dernier passage d'un véhicule de collecte
}

/** Signalement citoyen (F10) : SMS interprété par WP3 ou photo filtrée par WP2. */
export interface CitizenReport {
  id: string;
  receivedAt: string;
  channel: "sms" | "photo";
  rawText?: string;
  description?: string;
  phoneMasked?: string;
  imageUrl?: string;
  extraction?: {
    type: DefectType | null;
    location: string | null;
    severityHint: Severity | null;
    confidence: number;
    schemaValid: boolean;
    /** Estimations WP2 à partir de la photo (profondeur des nids-de-poule, dimensions). */
    depthCm?: number;
    lengthM?: number;
    widthM?: number;
  };
  /** analyzed=false : service vision indisponible au dépôt, photo acceptée sans analyse. */
  photoCheck?: { accepted: boolean; reason?: string; blurScore: number; roadScore: number; analyzed?: boolean };
  position?: LatLng;
  matchedDefectId?: string;
  state: "a_valider" | "valide" | "rejete" | "fusionne";
}

export interface RepairTeam {
  id: string;
  name: string;
  district: string;
}

export interface NetworkKpis {
  networkKm: number;
  coveredKm: number;
  activeDefects: number;
  criticalDefects: number;
  backlogCostTnd: number;
  repairedLast30d: number;
  meanRepairDays: number;
  pendingReports: number;
  conditionIndex: number; // 0..100
}

export interface TimePoint {
  month: string; // "2026-04"
  detected: number;
  repaired: number;
  conditionIndex: number;
  backlogCostTnd: number;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  role: Role;
  /** Périmètre territorial (agents uniquement) : l'utilisateur ne voit que cette zone (cloisonnement). */
  scope?: { level: "national" | "gouvernorat" | "commune"; label: string };
}

export interface AuthSession {
  token: string;
  expiresAt: string;
  user: User;
}

/** Suivi d'un signalement vu par son auteur (espace citoyen). */
export type ReportProgress = "verification" | "pris_en_charge" | "travaux" | "repare" | "non_retenu";

export interface MyReport {
  report: CitizenReport;
  progress: ReportProgress;
  progressLabel: string;
  defectStatus?: DefectStatus;
}

/** Réponse de l'assistant (F11) : appels de fonctions déterministes + résultat. */
export interface AssistantAnswer {
  text: string;
  calls: { name: string; args: Record<string, unknown> }[];
  defects?: Defect[];
}

export interface DefectFilters {
  types?: DefectType[];
  severities?: Severity[];
  statuses?: DefectStatus[];
  surface?: Surface | "all";
  district?: string;
  search?: string;
}

// ---------------------------------------------------------------- collecte par véhicules (WP1)

/** Véhicule public équipé d'une caméra embarquée (bus, benne de collecte des ordures). */
export interface CaptureVehicle {
  id: string; // ex. BUS-12
  kind: "bus" | "benne";
  label: string; // ex. « Ligne 1 — Centre-ville ↔ Zarzouna »
  plateMasked: string;
  camera: string;
  lastSync: string; // ISO
}

export type PipelineStepKey = "reception" | "anonymisation" | "extraction" | "detection" | "regroupement" | "publication";

export interface PipelineStep {
  key: PipelineStepKey;
  label: string;
  status: "termine" | "en_cours" | "en_attente";
  durationSec?: number;
  detail?: string;
}

/** Image extraite d'une vidéo, sur laquelle le modèle a détecté un défaut. */
export interface CaptureDetection {
  id: string;
  defectId: string; // défaut consolidé (même identifiant que la carte)
  type: DefectType;
  severity: Severity;
  confidence: number;
  frameUrl?: string;
  videoTime: string; // position dans la vidéo, « mm:ss »
  position: LatLng;
  roadName: string;
  depthCm?: number;
  isNew: boolean; // première observation de ce défaut
}

/** Un trajet filmé = une vidéo traitée par la chaîne vidéo (hors périmètre WP2 : service de traitement WP1). */
export interface CaptureRun {
  id: string;
  vehicleId: string;
  startedAt: string;
  durationMin: number;
  distanceKm: number;
  videoMinutes: number;
  framesExtracted: number;
  framesAnalyzed: number;
  framesBlurred: number; // images contenant visages / plaques floutés
  track: [number, number][][]; // tracé GPS (une polyligne par tronçon parcouru)
  pipeline: PipelineStep[];
  detections: CaptureDetection[];
  status: "publie" | "en_traitement";
}

export interface CaptureOverview {
  vehicles: CaptureVehicle[];
  runs: CaptureRun[];
  /** true : données de démonstration (service de traitement vidéo non connecté). */
  simulated: boolean;
}
