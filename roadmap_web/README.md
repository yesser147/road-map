# Road Map — plateforme web (front-end React)

Interface de la plateforme « Road Map — Cartographie des dégradations routières et de trottoirs ».
Deux espaces dans une même application :

- **Espace citoyen** (`/citoyen`, pensé pour le téléphone) : créer un compte, photographier une dégradation,
  placer le repère sur la carte, envoyer, puis suivre la prise en charge.
- **Espace Ministère** (`/pro`, accès agents) : carte du réseau, priorités, réparations, validation des signalements,
  suivi et assistant.

## Démarrer

```bash
npm install
npm run dev          # http://localhost:5173 — API Spring Boot (roadmap_api) attendue sur :8080
npm run dev:mock     # sans serveur : données simulées dans le navigateur
npm run dev:phone    # HTTPS + accès depuis le réseau local (GPS et caméra sur téléphone)
npm run build        # build de production dans dist/
```

`.env` (copie de `.env.example`) : `VITE_API_MODE=http` utilise l'API ; en développement Vite relaie `/api` et
`/media` vers `API_PROXY_TARGET`, le téléphone n'a donc besoin que du port 5173.
Sur téléphone, la géolocalisation n'est disponible qu'en HTTPS (`dev:phone`, accepter l'avertissement du
certificat auto-signé) ; sinon l'utilisateur place le repère en touchant la carte.

Comptes de démonstration : voir `roadmap_api/README.md` (boutons de remplissage sur les pages de connexion en
développement et en mode démo uniquement).

> En mode démo (`dev:mock`) seule la géométrie des rues provient d'OpenStreetMap ; défauts, coûts, signalements,
> équipes et historiques sont fictifs. Avec l'API, ce sont les mêmes données, chargées en base au premier démarrage.

## Écrans et fonctionnalités du cahier des charges

| Écran | Route | Fonctionnalités |
|---|---|---|
| Accueil public | `/` | choix de l'espace |
| Connexion | `/citoyen/connexion`, `/pro/connexion` | connexion ; inscription côté citoyen uniquement |
| Citoyen — accueil | `/citoyen` | raccourci « Signaler », compteurs, derniers signalements |
| Citoyen — signaler | `/citoyen/signaler` | photo (caméra / galerie, réduite avant envoi) → emplacement (GPS ou carte) → type et commentaire → résultat du contrôle automatique |
| Citoyen — suivi | `/citoyen/mes-signalements` | Vérification → Pris en charge → Travaux → Réparé (ou motif de rejet) |
| Tableau de bord | `/pro` | indicateurs, tendances, répartition par type et par arrondissement |
| Carte du réseau | `/pro/carte` | **F4** tronçons colorés par état, défauts par gravité, plaques d'égout intactes (non-défauts), **zones non couvertes en gris — jamais présentées comme en bon état**, filtres, 3 fonds de carte |
| Fiche de défaut | `?defect=ID` (tiroir ouvert depuis n'importe quel écran) | **F5** mesures, photos, **F6** coût sourcé (ligne de barème + référence technique), **F7** score de priorité décomposé, **F8** historique des passages, **F9** cycle de réparation |
| Priorités | `/pro/priorites` | **F7** classement, filtres, décomposition du score, export CSV |
| Réparations | `/pro/reparations` | **F9** tableau Détecté → Validé → Planifié → En cours → Réparé → Vérifié (glisser-déposer) |
| Signalements citoyens | `/pro/signalements` | **F2b** SMS + extraction structurée, filtre photo WP2, **F10** validation / fusion / rejet |
| Suivi dans le temps | `/pro/suivi` | **F8** évolution du stock, cumul détectés/réparés, aggravation d'un défaut entre passages |
| Assistant | `/pro/assistant` | **F11** questions en langage naturel → appels de fonctions déterministes affichés |
| Barre du haut | — | profil connecté (3 niveaux d'accès, **cloisonnement territorial**), déconnexion, indicateur **F12** en ligne / hors ligne ; sélecteur de profil en mode démo uniquement |

## Architecture

```
src/
├── api/
│   ├── types.ts       ← CONTRAT front ↔ serveur (interface RoadMapApi)
│   ├── mockApi.ts     implémentation simulée (latence, cloisonnement par profil)
│   ├── httpApi.ts     client REST de roadmap_api (jeton JWT, messages d'erreur)
│   ├── token.ts       session conservée dans le navigateur
│   └── index.ts       sélection via VITE_API_MODE
├── types/domain.ts    modèle de domaine (Defect, RoadSegment, CitizenReport…)
├── config/labels.ts   libellés FR, couleurs métier, formats (DT, dates)
├── mocks/             générateur de données fictives + géométrie OSM + illustrations SVG
├── state/             session / profil, hook useApi, état de connexion
├── components/        Layout Ministère, garde d'accès, fiche défaut (tiroir), badges, KPI
├── pages/             écrans Ministère, accueil public, pages de connexion
├── citizen/           espace citoyen : coque mobile, signalement en 3 étapes, suivi
└── styles/            tokens.css (variables de design) + global.css
```

Règle : **les pages n'importent jamais `mocks/`** — uniquement `api` et `types`. Brancher le serveur :

```bash
cp .env.example .env   # VITE_API_MODE=http (défaut) ou mock
```

### Serveur

Les endpoints, la sécurité et les comptes sont documentés dans `roadmap_api/README.md` (Spring Boot).
`src/api/httpApi.ts` en est le client ; `src/api/mockApi.ts` le reproduit pour le mode démo.

### Liens avec les autres work projects
- **WP2 (vision)** : `DetectionEvent` → défauts / observations ; `is_defect=false` → `Asset` ;
  regroupement des passages → un seul `Defect` avec plusieurs `observations` ; filtre photo → `photoCheck`.
- **WP3 (langage & décision)** : extraction SMS → `CitizenReport.extraction` ; coût sourcé → `CostEstimate` ;
  score → `Priority.factors` ; assistant → `AssistantAnswer.calls`.

## À faire en production
- Fond de carte : les tuiles Esri / OpenStreetMap publiques conviennent pour la démo ; prévoir un
  fournisseur sous contrat ou des tuiles auto-hébergées (et le mode hors ligne F12).
- Barème officiel : les lignes actuelles sont marquées « provisoires ».
- Carte ≥ 10 000 défauts en ≤ 3 s : pagination par emprise (`bbox`) côté API, rendu canvas déjà activé.
