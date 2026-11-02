# Road Map — application citoyenne (Flutter, Android)

Signaler une dégradation de la chaussée ou d'un trottoir et suivre sa réparation. L'application parle à la
même API que la plateforme web (`roadmap_api`, Spring Boot) : comptes citoyens, envoi des signalements,
suivi « vérification → pris en charge → travaux → réparé ».

## Ce que fait l'application

| Écran | Contenu |
|---|---|
| Connexion | se connecter / créer un compte citoyen (consentement photos), réglage de l'adresse du serveur |
| Accueil | bouton « Signaler une dégradation », compteurs envoyés / en cours / réparés, conseils de prise de vue |
| Signaler | 1. photo (appareil ou galerie) · 2. position GPS ajustable sur la carte OpenStreetMap · 3. type, posture (debout / accroupi), commentaire |
| Mes signalements | photo, type, adresse, taille estimée (± marge), avancement de la réparation |

Pour mesurer le défaut en centimètres (service de vision WP2), chaque envoi transporte aussi :
la **focale EXIF** lue sur la photo originale avant compression, l'**inclinaison du téléphone** au moment de la
photo (accéléromètre, convertie dans la convention W3C attendue par `roadvision/camera.py`, testée dans
`test/tilt_test.dart`) et la **posture**. Voir `wp2_vision/reports/dimensions_report.md`.

## Installer et tester

Outils installés sur le PC de développement : Flutter 3.47 (`C:\src\flutter`), Android SDK 36
(`%LOCALAPPDATA%\Android\Sdk`), JDK 21. Variables utilisateur : `ANDROID_HOME`, `JAVA_HOME`, `PATH`.

```bash
cd roadmap_mobile
flutter pub get
flutter test                 # 5 tests (inclinaison, écran de connexion)
flutter build apk --release  # -> build/app/outputs/flutter-apk/app-release.apk
```

Sur le téléphone Android : copier `app-release.apk`, l'ouvrir et autoriser l'installation depuis cette source
(« Sources inconnues »). Ou, téléphone branché en USB avec le débogage activé : `flutter install`.

**Connexion au backend en test** : le téléphone et le PC sur le même Wi-Fi ; démarrer `roadmap_api` (port 8080)
et le service de vision WP2 (port 8002) ; dans l'application, Réglages → adresse `http://<IPv4 Wi-Fi du PC>:8080`
(commande `ipconfig`) → « Enregistrer et tester ». Si le serveur est injoignable, autoriser Java (port 8080)
dans le pare-feu Windows pour les réseaux privés.

Le trafic HTTP en clair est autorisé uniquement pour cette phase de test (`res/xml/network_security_config.xml`) ;
en production l'API sera en HTTPS et ce fichier sera resserré. L'APK est signé avec la clé de débogage :
une clé de publication sera nécessaire avant toute diffusion (Play Store).
