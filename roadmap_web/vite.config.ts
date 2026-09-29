import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { fileURLToPath, URL } from "node:url";

// En développement, /api et /media sont relayés vers roadmap_api (Spring Boot) :
// le téléphone n'a besoin d'accéder qu'au port de Vite.
// VITE_HTTPS=1 (npm run dev:phone) : HTTPS auto-signé, nécessaire pour la géolocalisation sur téléphone.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backend = env.API_PROXY_TARGET || "http://localhost:8080";
  return {
    plugins: [react(), ...(env.VITE_HTTPS === "1" ? [basicSsl()] : [])],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    server: {
      port: 5173,
      proxy: {
        "/api": { target: backend, changeOrigin: true },
        "/media": { target: backend, changeOrigin: true },
      },
    },
  };
});
