# ADR-0002 — Auto-création du fondateur comme `association_member`

**Date :** 2026-06-10
**Statut :** Accepté

## Contexte

Le schéma métier (schema-design §3.1 et §10.3) impose qu'à la création d'une
organisation, son fondateur soit automatiquement inscrit dans l'annuaire métier
`association_members` avec `role = 'administrateur'` et `status = 'actif'`. Sans
cette ligne, l'annuaire d'une organisation fraîchement créée est vide, alors que
son créateur en est de fait le premier membre.

Deux constats lors de la validation visuelle du module Membres :

1. L'onboarding (`app/(auth)/onboarding/page.tsx`) appelait directement le client
   Better-Auth (`organization.create`) sans jamais créer la ligne
   `association_members` correspondante. La règle n'était donc **pas implémentée**
   — ni pour les comptes existants, ni pour les futurs.
2. Les comptes créés avant la session 3 (introduction du schéma métier) n'avaient
   de toute façon aucune chance d'avoir cette ligne.

## Décision

### 1. Auto-création via hook Better-Auth

L'insertion du fondateur se fait dans le hook
`organizationHooks.afterCreateOrganization` du plugin `organization`
(`lib/auth/index.ts`), via le helper idempotent `ensureFounderMember`
(`lib/members/founder.ts`).

Ce hook a été préféré à un insert collé dans une Server Action d'onboarding car
il se déclenche **quel que soit le point d'entrée** (onboarding actuel, future
Server Action, flux d'invitation), ce qui est plus robuste.

**Limite d'atomicité assumée :** le hook s'exécute *après* le commit de
l'organisation. Le driver `neon-http` ne supporte pas les transactions
interactives, donc une transaction SQL stricte « org + membre tout ou rien »
n'est pas réalisable sur cette stack. La cohérence repose sur :
- l'idempotence de `ensureFounderMember` (aucun doublon possible) ;
- le script de backfill comme filet de sécurité en cas d'échec ponctuel du hook.

### 2. Backfill des organisations existantes

Le script `scripts/backfill-founder-members.ts`
(`npm run backfill:founders`) parcourt toutes les organisations, identifie le
fondateur (le `member` Better-Auth de rôle `owner`, à défaut le membre le plus
ancien) et crée la ligne `association_members` manquante. Idempotent et rejouable
sans risque : il ne touche jamais une ligne existante (soft delete préservé).

### 3. Valeur de `phone_number`

Le compte Better-Auth (`user`) ne porte pas de téléphone, mais
`association_members.phone_number` est `NOT NULL`. Le fondateur est donc inséré
avec `phone_number = ''` (chaîne vide), à compléter par lui-même depuis le CRUD
Membres. Aucun faux numéro E.164 n'est introduit en base.

## Conséquences

- Toute nouvelle organisation a immédiatement son fondateur dans l'annuaire.
- Les organisations historiques sont réparées par une exécution unique du backfill.
- La logique d'insertion est centralisée dans `ensureFounderMember`, réutilisable
  par d'autres flux (invitations).
- Dépendances ajoutées : `@paralleldrive/cuid2` (génération des PK métier, helper
  `lib/db/id.ts`) et `tsx` (exécution des scripts).
- Aucune modification du schéma DB.
