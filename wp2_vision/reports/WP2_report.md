# WP2 — Vision : rapport d'évaluation (v0.1.0)

Responsable : Yasser Saidani · Date : 28/09/2026 · Modèle livré : `models/roadvision_best.pt`
(+ `models/export/roadvision_int8.onnx`, `roadvision_fp32.onnx`, `model_card.json`)

## 1. Démarche

1. **Survey des modèles existants** : un YOLOv8s déjà entraîné sur RDD2022 (38 k images, 6 pays,
   `dronefreak/rdd2022-yolov8s`, mAP50 = 61,5 % sur RDD2022) a été retenu comme point de départ plutôt
   qu'un entraînement de zéro. Aucun modèle public ne détecte les plaques d'égout.
2. **Données publiques fusionnées** en une taxonomie à 5 classes (`configs/classes.yaml`) :
   RDD2022 (sous-ensemble 4 600 img., sans drone), Kaggle road-damage (potholes/cracks/manholes, 2 009 img.),
   Mendeley Kent (713 nids-de-poule, dont remplis d'eau). Train 5 189 · val 870 · **test 1 263**.
3. **Affinage** : v1 (toutes couches, lr 1e-3, 40 époques) puis **v2 livrée** (10 premières couches gelées,
   lr 3e-4, 25 époques) — v2 corrige l'oubli catastrophique observé en v1 sur RDD2022.
4. **Quantification** : export ONNX FP32 et INT8 dynamique (11,5 Mo, perte < 0,5 pt de mAP).

## 2. Résultats sur le jeu de test (seuil de confiance 0,25)

| Classe | AP50 | Précision | Rappel |
|---|---:|---:|---:|
| fissure longitudinale | 43,9 | 58,6 | 42,0 |
| fissure transversale | 39,2 | 56,4 | 37,7 |
| faïençage | 61,8 | 64,1 | 59,7 |
| **nid-de-poule** | **63,6** | 68,4 | 60,2 |
| plaque d'égout (non-défaut) | 64,9 | 68,2 | 67,8 |
| **défauts, global** | **52,1** (mAP50) | 63,3 | 51,0 |
| fissures fusionnées (tout type) | 51,5 | 62,3 | 47,6 |

Par condition : jour+sec 50,1 mAP50 · mouillé 61,4 · nuit 61,2 (**9 images seulement — non significatif**).
Par source (mAP50 défauts) : RDD2022 57,3 · Kaggle 24,5 · Kent 37,8.

Gain de l'affinage (nid-de-poule AP50, référence → livré) : RDD2022 73,0 → 72,0 · Kaggle 1,0 → 27,3 ·
Kent 0,4 → 37,8. Voir `ablation.md` pour le détail des 6 variantes.

## 3. Critères d'acceptation du Cahier des charges

| Critère | Cible | Mesure | Statut |
|---|---|---|---|
| Précision de détection, jour + sec | ≥ 85 % | 62,0 % à conf 0,25 · **84,8 % à conf 0,6** (rappel 25 %) · 89,9 % à 0,7 | ⚠️ atteint seulement à seuil élevé, au prix du rappel |
| Fausses alertes sur plaques d'égout intactes | ≤ 10 % | **7,2 %** (conf 0,25) · 1,9 % (conf 0,4) | ✅ |
| Fausses alertes sur ralentisseurs | ≤ 10 % | non mesurable : aucun ralentisseur annoté dans les données publiques | ⏳ données WP1 |
| Un défaut réel = une entité après passages répétés | 1 entité | test automatique `tests/test_contract.py` (3 passages, bruit GPS ~3 m → 1 entité) | ✅ (à confirmer sur traces WP1) |
| Erreur de profondeur | ≤ 3 cm | méthode implémentée (Depth Anything V2 + calibration par hauteur caméra), **pas de vérité terrain disponible** | ⏳ `scripts/evaluate_depth.py` prêt pour les 40 mesures WP1 |
| Modèle quantifié exécutable sur mobile | oui | ONNX INT8 11,5 Mo, sortie 1×9×8400 ; TFLite INT8 exportable (`export.py --tflite`) | ✅ |

**Seuil opérationnel recommandé** : 0,4 pour la carte (précision 72,5 %, rappel 37,9 %, fausses alertes
plaques 1,9 %) ; 0,6 lorsqu'une précision ≥ 85 % est exigée (rapports officiels).

## 4. Analyse de l'écart et plan (obligation de moyens renforcée, art. 8.1)

- **Bruit d'étiquetage** : les fissures Kaggle n'ont pas de sous-type ; il a été déduit automatiquement.
  La précision est donc sous-estimée pour les fissures (sur RDD2022 seul, précision 64,6 %).
- **Écart de domaine** : aucune image tunisienne. L'affinage sur les données WP1 (J7) est le levier
  principal attendu — le gain Kaggle/Kent ci-dessus (+26 à +37 pts sur une source nouvelle avec quelques
  centaines d'images) donne l'ordre de grandeur.
- **Rejeu RDD2022 limité** (4 600 / 38 400 images, contrainte de bande passante) : ajouter des shards de
  rejeu est l'amélioration suivante la moins coûteuse.
- **Nuit** : 9 images de test seulement ; la campagne WP1 doit inclure des captures de nuit.
- **Classes du contrat sans données publiques** (affaissement, dalle cassée, bordure cassée, ressaut,
  soulèvement par racine, plaque défectueuse) : ids 5+ à ajouter avec les annotations WP1.

## 5. Latence

GPU RTX 4060 (PyTorch) : ~8–18 ms/image. CPU portable 4 threads (`benchmark_cpu.md`) : PyTorch 640 px
673 ms, 480 px 506 ms. L'INT8 dynamique ONNX est plus lent que le FP32 sur CPU x86 (noyaux ConvInteger
non optimisés) : il sert à réduire la taille (×4) ; sur téléphone, utiliser l'export TFLite INT8
(NNAPI/GPU delegate).

## 6. Autres modules livrés

- **Regroupement** (`clustering.py`, `POST /v1/cluster`) : rayon GPS 8 m + similarité d'apparence ≥ 0,80.
- **Filtre photos citoyennes** (`photo_filter.py`) : flou, sombre, trop petite, « pas une route » (CLIP).
- **Profondeur** (`depth.py`) : Depth Anything V2 métrique, plan de route RANSAC, recalage d'échelle par
  hauteur caméra connue (1,3 m véhicule / 1,5 m à main levée).
- **Sévérité** (`severity.py`) : règles déterministes (profondeur 3/6 cm, surface, type) pour WP3.
