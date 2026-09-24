# Fichiers de démonstration REFEM

À placer dans `scripts/demo-files/`. Tous les documents sont fictifs et portent la mention
« Document fictif — données de démonstration AssoHub ».

`manifest.json` décrit chaque fichier : titre, catégorie (libellés exacts des six catégories),
date d'upload, auteur, et objet de rattachement (réunion ou paiement).

## Contraintes pour le seed

Réunions — dates, types et statuts à respecter exactement (voir `meetings`) :
- M01 17/01 AG ordinaire · M02 14/02 · M03 14/03 · M04 25/04 extraordinaire · M05 16/05
  · M06 13/06 · M07 11/07 → terminées ; M08 08/08 annulée ; M09 10/10 planifiée.
- Présences cohérentes avec les PV : M01 38/42, M03 31/40, M04 35/41, M06 33/42, M07 30/42.

Membres qui doivent exister (cités dans les documents) : Mariama Diallo (présidente),
Kadiatou Sylla (secrétaire générale), Fatoumata Binta Bah (trésorière), Aïssatou Camara,
Hawa Keïta, Djénabou Sow (adhésion le 20/05/2026), M'Mah Soumah, Fatoumata Condé,
Nènè Oumou Barry. Les autres noms de la liste de présence peuvent être réutilisés.

Paiements rattachés à un reçu — à créer avec exactement ces valeurs (voir `payments_with_receipt`) :
- P01 Aïssatou Camara — cotisation 03/2026 — 50 000 — Orange Money — 05/03/2026
- P02 Hawa Keïta — cotisation 04/2026 — 50 000 — MTN MoMo — 08/04/2026
- P03 Djénabou Sow — droit d'adhésion — 100 000 — Orange Money — 20/05/2026
- P04 M'Mah Soumah — cotisation 06/2026 — 50 000 — Espèces — 06/06/2026
- P05 Fatoumata Condé — cotisation 08/2026 — 50 000 — Espèces — 07/08/2026

Totaux mensuels perçus (janv.–juin) : voir `cotisations_targets_gnf`, alignés sur le rapport
financier (taux de recouvrement ≈ 79 % sur cinq mois, 81 % en février, comme dans les PV).

Upload : via le wrapper Blob de l'application, puis mise à jour de `organization_storage_usage`
dans le même `db.batch()`. Poids total ≈ 5 Mo.
