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

## Documents

- **Race condition upload / `deleteOrganization` — risque accepté pour la V1.**
  `deleteOrganization` (`lib/organizations/actions.ts`) purge les tables métier dans un
  `db.batch`, puis supprime l'organisation via `auth.api.deleteOrganization` : deux étapes
  distinctes. Entre les deux, les lignes `member` existent encore, donc un membre peut
  toujours uploader un document. Cette insertion recrée une ligne `documents` et/ou
  `organization_storage_usage` → la suppression de l'organisation échoue sur la FK
  (`ON DELETE no action`) et l'action renvoie `unknown`. Relancer réussit, mais le blob
  uploadé entre-temps n'est jamais purgé (pathnames relevés avant le batch).
  Fenêtre très courte, risque accepté.
  Correctif envisagé : un verrou `deleting_at` sur `organization`, posé avant le batch et
  vérifié par les actions d'upload (refus si non nul) — ou supprimer les lignes `member`
  en tête du batch.

- **Si une suppression définitive est un jour ajoutée (purge de données, cron de
  nettoyage) : revoir les FK de `documents`.**
  Aujourd'hui paiements, réunions et comptes ne sont jamais supprimés physiquement
  (soft delete / anonymisation), donc les FK `ON DELETE no action` ne bloquent rien.
  Un hard delete serait en revanche refusé tant qu'un document (même soft-deleted) les
  référence. À faire alors :
  - passer `documents.payment_id` et `documents.meeting_id` en `ON DELETE SET NULL`
    (le document reste, seul le rattachement disparaît) ;
  - décider du sort de `documents.uploaded_by_user_id`, qui est `NOT NULL` : le rendre
    nullable + `SET NULL` (affiché « Utilisateur supprimé »), réattribuer à un
    utilisateur système, ou supprimer les documents de l'utilisateur.

- **Barre de progression réelle pendant l'upload (connexions lentes).**
  `components/documents/upload-document-dialog.tsx` affiche une progression *simulée*
  (+10 % toutes les 150 ms, bloquée à 90 %, puis 100 % au résultat) : l'upload passe par
  une Server Action, qui n'expose pas l'avancement. Sur une connexion lente, la barre
  reste à 90 % pendant tout l'envoi. Pistes : upload direct navigateur → Vercel Blob
  (`upload()` de `@vercel/blob/client`, `onUploadProgress`) avec une route de
  validation/enregistrement côté serveur, ou `XMLHttpRequest` vers une route handler
  (`upload.onprogress`).

## Robustesse réseau

- **Appliquer `runAction` aux autres composants qui appellent une Server Action.**
  `lib/errors/request-error.ts` : sans `runAction`, un appel qui échoue (réseau coupé,
  base injoignable) dans un `startTransition` remonte à l'error boundary
  (`app/(dashboard)/[orgSlug]/error.tsx`) : la page est remplacée par l'écran d'erreur
  et la saisie en cours est perdue. Déjà traités : formulaires membre, paiement,
  réunion, PV, upload de document, invitation, inscription d'invité (lien nominatif et
  lien d'organisation). Restent (même recette : `runAction` + `isRequestFailure` +
  `SlowRequestHint` sur les formulaires) :
  - cotisations : `archive-cotisation-type-dialog`, `bulk-reminder-dialog`,
    `cotisation-type-form-dialog`, `delete-payment-dialog`, `send-reminder-dialog` ;
  - documents : `attach-document-dialog`, `delete-document-dialog`,
    `rename-document-dialog` ;
  - invitations : `decline-invitation-dialog`, `generate-invite-link-dialog`,
    `invitation-row-actions`, `invite-link-card`, `join-organization-button`,
    `join-via-link-button` ;
  - réunions : `delete-meeting-dialog`, `meeting-attendance-list`,
    `meeting-attendance-view`, `meeting-minutes-status-dialog`, `meeting-status-dialog` ;
  - membres : `archive-member-dialog`, `join-request-row-actions`,
    `status-change-dialog` ;
  - rapports : `delete-transaction-dialog`, `expense-form-dialog`,
    `manual-revenue-form-dialog` ;
  - paramètres et organisations : `change-password-form`, `delete-account-dialog`,
    `delete-organization-dialog`, `organization-settings-form`,
    `profile-settings-form`, `set-password-form`, `organization-switcher`.
