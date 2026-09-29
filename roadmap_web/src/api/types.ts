import type {
  Asset,
  AssistantAnswer,
  AuthSession,
  CitizenReport,
  Defect,
  DefectFilters,
  DefectStatus,
  DefectType,
  MyReport,
  NetworkKpis,
  RepairTeam,
  RoadSegment,
  StaffRole,
  TimePoint,
  User,
} from "@/types/domain";

export type Space = "citoyen" | "ministere";

export interface RegisterInput {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

export interface NewReportInput {
  photo: File;
  lat: number;
  lng: number;
  description?: string;
  type?: DefectType;
}

/**
 * Contrat entre l'interface et le serveur (roadmap_api, Spring Boot).
 * Deux implémentations : mockApi (données simulées) et httpApi (REST). Les pages n'utilisent que
 * cette interface : passer de l'une à l'autre ne modifie aucune page.
 * Le cloisonnement territorial est appliqué côté serveur selon l'utilisateur connecté.
 */
export interface RoadMapApi {
  // authentification (deux espaces : citoyen / Ministère)
  login(email: string, password: string, space: Space): Promise<AuthSession>;
  registerCitizen(input: RegisterInput): Promise<AuthSession>;
  getCurrentUser(): Promise<User>;
  /** Mode démo uniquement : changer de profil agent pour montrer les trois niveaux d'accès. */
  switchRole?(role: StaffRole): Promise<User>;

  // réseau et carte (F3, F4)
  getKpis(): Promise<NetworkKpis>;
  listSegments(): Promise<RoadSegment[]>;
  listAssets(): Promise<Asset[]>;
  listDefects(filters?: DefectFilters): Promise<Defect[]>;
  getDefect(id: string): Promise<Defect | undefined>;

  // réparations (F9)
  listTeams(): Promise<RepairTeam[]>;
  updateDefectStatus(id: string, status: DefectStatus, patch?: { assignedTeam?: string; plannedDate?: string }): Promise<Defect>;

  // signalements citoyens — côté Ministère (F2b, F10)
  listReports(): Promise<CitizenReport[]>;
  reviewReport(id: string, decision: "valide" | "rejete" | "fusionne", defectId?: string): Promise<CitizenReport>;

  // signalements citoyens — côté citoyen
  submitReport(input: NewReportInput): Promise<CitizenReport>;
  myReports(): Promise<MyReport[]>;

  // suivi temporel (F8)
  getTimeline(): Promise<TimePoint[]>;

  // assistant (F11)
  ask(question: string): Promise<AssistantAnswer>;
}
