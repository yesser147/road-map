import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { API_MODE, api } from "@/api";
import { restoreMockUser } from "@/api/mockApi";
import { loadSession, onSessionChange, saveSession } from "@/api/token";
import type { RegisterInput, Space } from "@/api/types";
import type { AuthSession, StaffRole, User } from "@/types/domain";

interface SessionValue {
  user: User | null;
  /** Incrémenté quand l'utilisateur ou son profil change : les pages rechargent leurs données. */
  version: number;
  login: (email: string, password: string, space: Space) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
  /** Mode démo uniquement (données simulées) : changer de profil agent. */
  switchRole?: (role: StaffRole) => Promise<void>;
  refresh: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const s = loadSession();
    if (s && API_MODE === "mock") restoreMockUser(s.user);
    return s;
  });
  const [version, setVersion] = useState(0);

  // expiration du jeton (401) ou déconnexion depuis un autre composant
  useEffect(() => onSessionChange((s) => {
    setSession(s);
    setVersion((v) => v + 1);
  }), []);

  const login = useCallback(async (email: string, password: string, space: Space) => {
    const s = await api.login(email, password, space);
    saveSession(s);
    return s.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const s = await api.registerCitizen(input);
    saveSession(s);
    return s.user;
  }, []);

  const logout = useCallback(() => saveSession(null), []);

  const switchRole = useCallback(async (role: StaffRole) => {
    if (!api.switchRole || !session) return;
    const user = await api.switchRole(role);
    saveSession({ ...session, user });
  }, [session]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return (
    <SessionContext.Provider
      value={{ user: session?.user ?? null, version, login, register, logout, refresh, switchRole: api.switchRole ? switchRole : undefined }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const v = useContext(SessionContext);
  if (!v) throw new Error("useSession must be used inside <SessionProvider>");
  return v;
}
