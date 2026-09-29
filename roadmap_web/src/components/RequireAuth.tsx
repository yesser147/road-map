import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/state/session";

/** Protège un espace : redirige vers la bonne page de connexion si l'utilisateur n'y a pas accès. */
export function RequireAuth({ space, children }: { space: "citoyen" | "ministere"; children: ReactNode }) {
  const { user } = useSession();
  const location = useLocation();
  const loginPath = space === "citoyen" ? "/citoyen/connexion" : "/pro/connexion";
  const allowed = user && (space === "citoyen" ? user.role === "citoyen" : user.role !== "citoyen");
  if (!allowed) return <Navigate to={loginPath} replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}
