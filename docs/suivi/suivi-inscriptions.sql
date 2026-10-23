-- ════════════════════════════════════════════════════════════════════════════
-- Suivi des inscriptions AssoHub — requêtes en LECTURE SEULE
-- ════════════════════════════════════════════════════════════════════════════
--
-- Où les lancer : console Neon > projet « ASSOHUB PRODUCTION » > SQL Editor.
--   ⚠ Pas le projet « Assohub » : c'est la base de DEV, même si sa branche
--     s'appelle « production ».
--
-- Comment : copier UNE requête (d'un « -- N. » au suivant), puis Run.
--   Ces requêtes ne font que lire (SELECT). Ne rien modifier depuis la console
--   sur la prod, ni dans l'éditeur SQL, ni dans la vue « Tables ».
--
-- Les dates sont en UTC, qui est aussi l'heure de Conakry.
-- ════════════════════════════════════════════════════════════════════════════


-- 1. Vue d'ensemble : une ligne par organisation, de la plus récente à la plus ancienne
--
--    membres          : fiches de l'annuaire non supprimées (le fondateur compte pour 1)
--    comptes          : personnes ayant un compte AssoHub dans l'organisation
--    paiements        : paiements de cotisation enregistrés
--    ecritures_compta : recettes et dépenses saisies à la main (module Rapports)
--    modules_utilises : sur 5 — membres ajoutés, paiements, réunions, documents, compta
--    derniere_activite: dernière saisie, tous modules confondus
--    derniere_session : dernière session ouverte par un compte de l'organisation (approximatif)
--    etat             : lecture rapide (voir le CASE en bas de la requête)
WITH
proprietaires AS (
  SELECT DISTINCT ON (m.organization_id)
         m.organization_id, u.name AS proprietaire, u.email AS email_proprietaire
  FROM member m
  JOIN "user" u ON u.id = m.user_id
  WHERE m.role = 'owner'
  ORDER BY m.organization_id, m.created_at
),
comptes AS (
  SELECT organization_id, count(*) AS n
  FROM member
  GROUP BY organization_id
),
membres AS (
  SELECT organization_id,
         count(*) AS n,
         count(*) FILTER (WHERE status = 'actif') AS actifs,
         max(created_at) AS derniere
  FROM association_members
  WHERE deleted_at IS NULL
  GROUP BY organization_id
),
types_cotisation AS (
  SELECT organization_id, count(*) AS n, max(created_at) AS derniere
  FROM cotisation_types WHERE deleted_at IS NULL GROUP BY organization_id
),
paiements AS (
  SELECT organization_id, count(*) AS n, max(created_at) AS derniere
  FROM payments WHERE deleted_at IS NULL GROUP BY organization_id
),
reunions AS (
  SELECT organization_id, count(*) AS n, max(created_at) AS derniere
  FROM meetings WHERE deleted_at IS NULL GROUP BY organization_id
),
proces_verbaux AS (
  SELECT organization_id, count(*) AS n, max(created_at) AS derniere
  FROM minutes WHERE deleted_at IS NULL GROUP BY organization_id
),
docs AS (
  SELECT organization_id, count(*) AS n, max(created_at) AS derniere
  FROM documents WHERE deleted_at IS NULL GROUP BY organization_id
),
compta AS (
  -- les paiements de cotisation créent aussi une recette : on ne garde que les saisies manuelles
  SELECT organization_id, count(*) AS n, max(created_at) AS derniere
  FROM transactions WHERE deleted_at IS NULL AND payment_id IS NULL GROUP BY organization_id
),
sessions AS (
  SELECT m.organization_id, max(s.updated_at) AS derniere
  FROM member m
  JOIN session s ON s.user_id = m.user_id
  GROUP BY m.organization_id
),
synthese AS (
  SELECT
    o.name                                         AS organisation,
    o.created_at::date                             AS inscrite_le,
    current_date - o.created_at::date              AS jours_depuis_inscription,
    p.proprietaire,
    p.email_proprietaire,
    coalesce(c.n, 0)                               AS comptes,
    coalesce(mb.n, 0)                              AS membres,
    coalesce(mb.actifs, 0)                         AS membres_actifs,
    coalesce(tc.n, 0)                              AS types_cotisation,
    coalesce(pa.n, 0)                              AS paiements,
    coalesce(r.n, 0)                               AS reunions,
    coalesce(pv.n, 0)                              AS proces_verbaux,
    coalesce(d.n, 0)                               AS documents,
    coalesce(cp.n, 0)                              AS ecritures_compta,
    (coalesce(mb.n, 0) > 1)::int
      + (coalesce(pa.n, 0) > 0)::int
      + (coalesce(r.n, 0) > 0)::int
      + (coalesce(d.n, 0) > 0)::int
      + (coalesce(cp.n, 0) > 0)::int               AS modules_utilises,
    greatest(o.created_at, mb.derniere, tc.derniere, pa.derniere, r.derniere,
             pv.derniere, d.derniere, cp.derniere)  AS derniere_activite,
    s.derniere                                     AS derniere_session
  FROM organization o
  LEFT JOIN proprietaires    p  ON p.organization_id  = o.id
  LEFT JOIN comptes          c  ON c.organization_id  = o.id
  LEFT JOIN membres          mb ON mb.organization_id = o.id
  LEFT JOIN types_cotisation tc ON tc.organization_id = o.id
  LEFT JOIN paiements        pa ON pa.organization_id = o.id
  LEFT JOIN reunions         r  ON r.organization_id  = o.id
  LEFT JOIN proces_verbaux   pv ON pv.organization_id = o.id
  LEFT JOIN docs             d  ON d.organization_id  = o.id
  LEFT JOIN compta           cp ON cp.organization_id = o.id
  LEFT JOIN sessions         s  ON s.organization_id  = o.id
)
SELECT
  organisation, inscrite_le, jours_depuis_inscription, proprietaire, email_proprietaire,
  comptes, membres, membres_actifs, types_cotisation, paiements, reunions,
  proces_verbaux, documents, ecritures_compta,
  modules_utilises || ' / 5'          AS modules_utilises,
  derniere_activite::date             AS derniere_activite,
  derniere_session::date              AS derniere_session,
  CASE
    WHEN membres <= 1 AND jours_depuis_inscription < 3
      THEN 'Nouvelle : vient de s''inscrire'
    WHEN membres <= 1
      THEN 'À relancer : aucun membre ajouté'
    WHEN greatest(derniere_activite, derniere_session) < now() - interval '30 days'
      THEN 'Inactive depuis plus de 30 jours'
    WHEN greatest(derniere_activite, derniere_session) >= now() - interval '7 days'
      THEN 'Active cette semaine'
    ELSE 'Active ce mois-ci'
  END                                 AS etat
FROM synthese
ORDER BY inscrite_le DESC, organisation;


-- 2. Nouvelles organisations par semaine (semaine commençant le lundi), avec le cumul
SELECT
  date_trunc('week', created_at)::date                                AS semaine_du,
  count(*)                                                            AS nouvelles_organisations,
  sum(count(*)) OVER (ORDER BY date_trunc('week', created_at))        AS total_cumule
FROM organization
GROUP BY date_trunc('week', created_at)
ORDER BY semaine_du DESC;


-- 3. Comptes créés sans organisation (inscription commencée, onboarding pas terminé)
--    email_verifie = false : la personne n'a pas cliqué le lien de vérification.
--    Les comptes supprimés (anonymisés) sont exclus.
SELECT
  u.name                AS nom,
  u.email,
  u.created_at::date    AS inscrit_le,
  u.email_verified      AS email_verifie
FROM "user" u
WHERE NOT EXISTS (SELECT 1 FROM member m WHERE m.user_id = u.id)
  AND u.email NOT LIKE '%@anonymized.local'
ORDER BY u.created_at DESC;


-- 4. Chiffres globaux en une ligne
SELECT
  (SELECT count(*) FROM organization)                                           AS organisations,
  (SELECT count(*) FROM organization WHERE created_at >= now() - interval '7 days')  AS organisations_7_jours,
  (SELECT count(*) FROM "user" WHERE email NOT LIKE '%@anonymized.local')       AS comptes,
  (SELECT count(*) FROM association_members WHERE deleted_at IS NULL)           AS fiches_membres,
  (SELECT count(*) FROM payments WHERE deleted_at IS NULL)                      AS paiements,
  (SELECT count(*) FROM meetings WHERE deleted_at IS NULL)                      AS reunions,
  (SELECT count(*) FROM documents WHERE deleted_at IS NULL)                     AS documents;
