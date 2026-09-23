# TODO / Backlog

## Réunions

- **Taux de présence : figer l'effectif attendu à la date de la réunion.**
  Aujourd'hui, le résumé de présence (`components/meetings/meeting-attendance-view.tsx`)
  divise par le nombre de membres **actifs actuellement** : l'effectif d'une réunion
  passée change à chaque adhésion, suspension ou démission ultérieure. Le dénominateur
  doit être l'effectif attendu au moment de la réunion (membres actifs à la date
  `scheduled_at`, ou valeur figée à la saisie des présences).
  Constaté avec le seed de démo : les réunions du 14/03 et du 25/04 affichent 31/42 et
  35/42 au lieu de 31/40 et 35/41 (PV).
