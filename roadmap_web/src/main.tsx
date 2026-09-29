import { StrictMode, Suspense, lazy, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CitizenLayout } from "@/citizen/CitizenLayout";
import { Layout } from "@/components/Layout";
import { RequireAuth } from "@/components/RequireAuth";
import { CitizenAuthPage, StaffLoginPage } from "@/pages/auth/AuthPages";
import { SessionProvider } from "@/state/session";
import "@/styles/global.css";

// espace Ministère
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const MapPage = lazy(() => import("@/pages/MapPage"));
const PrioritiesPage = lazy(() => import("@/pages/PrioritiesPage"));
const RepairsPage = lazy(() => import("@/pages/RepairsPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const HistoryPage = lazy(() => import("@/pages/HistoryPage"));
const AssistantPage = lazy(() => import("@/pages/AssistantPage"));
// espace citoyen + accueil
const WelcomePage = lazy(() => import("@/pages/WelcomePage"));
const CitizenHome = lazy(() => import("@/citizen/CitizenHome"));
const ReportWizard = lazy(() => import("@/citizen/ReportWizard"));
const MyReportsPage = lazy(() => import("@/citizen/MyReportsPage"));

const Loading = () => <div className="skeleton" style={{ height: 260, margin: 4 }} />;
const page = (el: ReactNode) => <Suspense fallback={<Loading />}>{el}</Suspense>;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route index element={page(<WelcomePage />)} />

          {/* ---- espace citoyen ---- */}
          <Route path="citoyen/connexion" element={<CitizenAuthPage />} />
          <Route path="citoyen" element={<RequireAuth space="citoyen"><CitizenLayout /></RequireAuth>}>
            <Route index element={page(<CitizenHome />)} />
            <Route path="signaler" element={page(<ReportWizard />)} />
            <Route path="mes-signalements" element={page(<MyReportsPage />)} />
          </Route>

          {/* ---- espace Ministère ---- */}
          <Route path="pro/connexion" element={<StaffLoginPage />} />
          <Route path="pro" element={<RequireAuth space="ministere"><Layout /></RequireAuth>}>
            <Route index element={page(<DashboardPage />)} />
            <Route path="carte" element={page(<MapPage />)} />
            <Route path="priorites" element={page(<PrioritiesPage />)} />
            <Route path="reparations" element={page(<RepairsPage />)} />
            <Route path="signalements" element={page(<ReportsPage />)} />
            <Route path="suivi" element={page(<HistoryPage />)} />
            <Route path="assistant" element={page(<AssistantPage />)} />
          </Route>

          {/* anciennes adresses (avant la séparation des espaces) */}
          {["carte", "priorites", "reparations", "signalements", "suivi", "assistant"].map((p) => (
            <Route key={p} path={p} element={<Navigate to={`/pro/${p}`} replace />} />
          ))}
          <Route path="*" element={<div className="empty">Page introuvable.</div>} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  </StrictMode>,
);
