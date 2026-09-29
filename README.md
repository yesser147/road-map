# Road Map — Cartographie des dégradations routières et de trottoirs

| Dossier | Contenu | Techno | Port |
|---|---|---|---|
| `roadmap_web/` | Plateforme web : espace citoyen (mobile) + espace Ministère | React + TypeScript (Vite) | 5173 |
| `roadmap_api/` | API : comptes, défauts, réparations, signalements, assistant | Spring Boot 4 (Java 21) | 8080 |
| `wp2_vision/` | IA vision (WP2) : détection, profondeur, filtre photo, regroupement | Python, YOLOv8, FastAPI | 8002 |

```
téléphone / navigateur ──► roadmap_web ──/api──► roadmap_api ──► base (H2 / PostgreSQL)
                                                     │
                                                     └──/v1/detect──► wp2_vision (photos citoyennes)
```

## Tout lancer (3 terminaux)

```bash
cd roadmap_api && ./mvnw spring-boot:run
```
```bash
cd wp2_vision && .venv/Scripts/uvicorn roadvision.api:app --app-dir src --port 8002
```
```bash
cd roadmap_web && npm run dev
```

Puis ouvrir http://localhost:5173. WP2 est facultatif : sans lui, les photos sont acceptées sans analyse.
Sans l'API, `npm run dev:mock` montre toute l'interface avec des données simulées.
Comptes de démonstration : `roadmap_api/README.md`.
