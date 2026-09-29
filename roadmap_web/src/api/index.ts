import { httpApi } from "./httpApi";
import { mockApi } from "./mockApi";
import type { RoadMapApi } from "./types";

export const API_MODE: "mock" | "http" = import.meta.env.VITE_API_MODE === "http" ? "http" : "mock";

export const api: RoadMapApi = API_MODE === "http" ? httpApi : mockApi;
export type { RoadMapApi };
