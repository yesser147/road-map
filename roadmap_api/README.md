# Road Map — API (Spring Boot)

Serveur de la plateforme : comptes et connexion (citoyens / agents du Ministère), réseau routier, défauts,
réparations, signalements citoyens avec photo, suivi dans le temps et assistant.
Consommé par `roadmap_web` (React). Java 21, Spring Boot 4, Spring Security (JWT), JPA.

## Démarrer

```bash
./mvnw spring-boot:run          # Windows : mvnw.cmd spring-boot:run
```

- API : http://localhost:8080/api/v1 — base H2 dans `./data/` (aucune installation).
- Au premier démarrage, `seed/seed.json` est chargé : **données simulées** de la zone pilote de Bizerte
  (148 défauts, 403 tronçons, signalements) et les comptes de démonstration ci-dessous.
- Console base de données : http://localhost:8080/h2-console (JDBC `jdbc:h2:file:./data/roadmap`, utilisateur `sa`).
- Repartir de zéro : arrêter le serveur et supprimer le dossier `data/`.
- PostgreSQL : `./mvnw spring-boot:run -Dspring-boot.run.profiles=postgres` (variables `DB_URL`, `DB_USER`, `DB_PASSWORD`).

### Comptes de démonstration

Mot de passe commun : valeur de `roadmap.demo-password` dans `application.yml` (surchargeable par `ROADMAP_DEMO_PASSWORD`).

| Compte | Espace | Profil | Périmètre |
|---|---|---|---|
| `ministere@roadmap.tn` | Ministère | ministère | national |
| `direction.bizerte@roadmap.tn` | Ministère | direction régionale | gouvernorat de Bizerte |
| `agent.centre@roadmap.tn` | Ministère | agent municipal | arrondissement Centre-ville uniquement |
| `citoyen@demo.tn` | citoyen | citoyen | ses propres signalements |

Les citoyens peuvent aussi créer leur compte (`POST /auth/register`). Les comptes agents ne sont jamais créés par inscription.
**En production** : `roadmap.seed-demo-data=false`, et définir `ROADMAP_JWT_SECRET` (≥ 32 caractères).

## Sécurité

- Jeton JWT HS256 (12 h) renvoyé par `/auth/login` et `/auth/register`, à envoyer en `Authorization: Bearer …`.
- Un compte ne se connecte que depuis son espace (`space: "citoyen" | "ministere"`).
- `/api/v1/citizen/**` : rôle citoyen uniquement. Le reste de `/api/v1/**` : profils agents uniquement.
- **Cloisonnement territorial côté serveur** : un agent municipal ne voit que les défauts de son arrondissement.
- Mots de passe hachés (BCrypt). Erreurs au format `application/problem+json` avec un message en français (`detail`).

## Endpoints

| Méthode | Chemin | Accès | Rôle |
|---|---|---|---|
| POST | `/auth/login` | public | `{email, password, space}` → `{token, expiresAt, user}` |
| POST | `/auth/register` | public | inscription citoyen `{fullName, email, phone?, password}` |
| GET | `/auth/me` | connecté | utilisateur courant |
| POST | `/citizen/reports` | citoyen | multipart `photo`, `lat`, `lng`, `description?`, `type?` → signalement |
| GET | `/citizen/reports` | citoyen | mes signalements + avancement (`verification`, `pris_en_charge`, `travaux`, `repare`, `non_retenu`) |
| GET | `/kpis` | agent | indicateurs du périmètre |
| GET | `/segments` · `/assets` · `/teams` · `/timeline` | agent | tronçons et leur état, plaques intactes, équipes, séries mensuelles |
| GET | `/defects?type=&severity=&status=&surface=&district=&q=` | agent | défauts du périmètre |
| GET | `/defects/{id}` | agent | fiche |
| PATCH | `/defects/{id}/status` | agent | `{status, assignedTeam?, plannedDate?}` (cycle F9) |
| GET | `/reports` | agent | file des signalements citoyens |
| POST | `/reports/{id}/review` | agent | `{decision: valide\|rejete\|fusionne, defectId?}` — « valide » crée un défaut chiffré et priorisé |
| POST | `/assistant` | agent | `{question}` → réponse + appels de fonctions |
| GET | `/media/**` | public | photos (`/media/uploads/…`) et illustrations de démo (`/media/seed/…`) |

Les formes JSON sont celles de `roadmap_web/src/types/domain.ts` (valeurs en minuscules : `nid_de_poule`, `critique`…).

## Chaîne d'un signalement photo

1. Le citoyen envoie photo + position → fichier stocké dans `data/uploads/`.
2. Si le service vision **WP2** répond (`roadmap.vision-url`, défaut `http://127.0.0.1:8002`) : filtre qualité
   (flou, sombre, « pas une route ») et détection du type → la photo est acceptée ou rejetée avec un motif.
   Si WP2 est arrêté, la photo est acceptée et marquée `analyzed: false`.
3. Recherche d'un défaut actif du même type à moins de 15 m → proposition de fusion (pas de doublon).
4. Un agent valide / fusionne / rejette. « Valide » crée un défaut avec coût sourcé (barème **provisoire**) et score.
5. Le citoyen suit l'avancement dans son espace.

## Organisation du code

```
tn.roadmap.api
├── config/    SecurityConfig (JWT, règles d'accès, CORS), WebConfig (photos)
├── domain/    entités JPA, énumérations du contrat, objets-valeurs (colonnes JSON)
├── repo/      dépôts Spring Data
├── service/   AuthService, NetworkService (cloisonnement, KPI, cycle de vie), ReportService,
│              EstimationService (coût / priorité provisoires — à remplacer par WP3), AssistantService,
│              VisionClient (WP2), SeedService (données de démonstration)
└── web/       contrôleurs REST, DTO, gestion des erreurs
```

## Reste à faire (production)
- Géométrie PostGIS (colonnes `geometry`) et requêtes par emprise pour la carte ≥ 10 000 défauts.
- Remplacer `EstimationService` et `AssistantService` par les services WP3 (barème officiel, modèle de langage).
- Floutage des visages / plaques avant stockage (exigence art. 9.4) : à brancher dans `ReportService.submit`.
- Gestion des comptes agents (création, désactivation) et journal des actions.
