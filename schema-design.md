# Schema Design — AssoHub V1

> **Document de référence du schéma de base de données métier**
> Issu de la Phase 1 de la session 3 — conception collaborative.
> À lire avant toute modification de schéma. À mettre à jour quand une décision structurante change.
>
> *Version : 1.0 — Mai 2026*
> *Auteur : Gassimou Cissé. Co-rédigé avec Claude.*

---

## 1. Contexte et principes directeurs

### 1.1. Objectif de ce document

Ce document est la **spécification complète** du schéma de base de données métier d'AssoHub V1. Il est issu de **25 décisions de conception** prises lors de la session 3 (Phase 1), validées une par une avec le fondateur.

Le document précède l'implémentation. Aucune table métier ne doit être créée sans avoir été spécifiée ici. Toute modification du schéma en cours d'implémentation doit être reportée dans ce document.

### 1.2. Périmètre

**Inclus dans ce document :**
- Toutes les tables métier du MVP V1 (Membres, Cotisations, Réunions & PV, Transactions financières).
- Les enums et listes de valeurs fixes.
- Les règles métier qui contraignent le schéma.
- Les anticipations V1.1+ baked dans le schéma V1.

**Exclus de ce document :**
- Les tables d'authentification gérées par Better-Auth (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`). Elles sont mentionnées en référence quand une FK les vise, mais leur structure est fixée par Better-Auth.
- Les tables d'audit transverses (`admin_audit_log`) qui ne concernent pas le métier.
- Les tables prévues mais non utilisées en V1 (`messages`, `documents`, `ai_conversations`).

### 1.3. Distinction fondamentale : `member` vs `association_member`

Toute lecture de ce document suppose comprise la distinction entre les deux concepts :

| Concept | Origine | Définition | Existe sans l'autre ? |
|---|---|---|---|
| `member` (Better-Auth) | Table générée par Better-Auth lors du plugin `organization` | Utilisateur authentifié lié à une organisation. **Une personne qui se connecte à AssoHub.** | Oui — un utilisateur peut exister sans être dans l'annuaire métier. |
| `association_member` | Table métier créée dans ce document | Personne dans l'annuaire d'une association. **Quelqu'un qui paie des cotisations, qui assiste aux réunions.** | Oui — un membre de l'annuaire peut ne jamais avoir de compte AssoHub. |

Les deux sont liés par une FK **optionnelle** `association_members.user_id → user.id` (nullable). Quand elle est remplie, la personne a un compte AssoHub. Sinon, elle existe seulement dans l'annuaire métier.

### 1.4. Principes techniques généraux

**Multi-tenancy**

- Une organisation = un tenant.
- **Toutes** les tables métier ont une FK `organization_id → organization.id` (NOT NULL).
- **Tous** les indexes incluent `organization_id` comme première colonne pour optimiser le filtrage tenant.
- Les requêtes ne doivent jamais traverser les organisations (sauf via le super-admin).

**Soft delete**

- Toutes les tables métier ont un champ `deleted_at TIMESTAMP NULL`.
- Les requêtes par défaut filtrent `WHERE deleted_at IS NULL`.
- Le hard delete est réservé au super-admin via une action explicite (RGPD, nettoyage doublons).

**Naming conventions**

- Tables : `snake_case`, pluriel anglais (`association_members`, `cotisations`, `meetings`).
- Colonnes : `snake_case`, anglais (`created_at`, `phone_number`, `due_amount`).
- Enums et statuts : `snake_case` en text, validés côté app (pas d'enum Postgres pour faciliter l'évolution).
- IDs : `cuid2` (préféré à UUID pour la longueur et le tri).

**Montants monétaires**

- Stockage en **centimes** (entier, type `bigint`).
- Jamais de `float`, jamais de `decimal` pour les montants.
- V1 : uniquement GNF (Franc guinéen). Pas de colonne `currency` en V1 (à ajouter en V1.1+ pour multidevise).
- Affichage formaté côté UI : `220 000 GNF`.

**Dates et timezone**

- Tous les `TIMESTAMP` sont stockés en UTC.
- Toutes les `DATE` (sans timezone) sont gérées au niveau application en `Africa/Conakry` par défaut.
- Configurable par organisation dans une V1.1+.

**Téléphones**

- Stockage en E.164 (`+22461155...`).
- Validation à la saisie avec `libphonenumber-js`.
- Affichage formaté selon la locale (`+224 6 11 55 15 20`).

**Horodatage standard**

Toutes les tables métier ont :
- `id` (cuid2, PK)
- `created_at TIMESTAMP NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMP NOT NULL DEFAULT NOW()` (mis à jour à chaque écriture)
- `deleted_at TIMESTAMP NULL` (soft delete)

---

## 2. Vue d'ensemble — Carte des tables

```
┌────────────────────────────────────────────────────────────────────┐
│                         BETTER-AUTH (existant)                      │
│                                                                     │
│   user ────────── member ────────── organization                    │
│      │              │                    │                          │
│      │              │                    └── invitation             │
│      │              │                                               │
└──────┼──────────────┼───────────────────────────────────────────────┘
       │              │
       │              │                    ┌──── TABLES MÉTIER V1 ────┐
       │              │                    │                          │
       │              └────────────────────┼─→ pending_invitations    │
       │                                   │                          │
       └───────────────────────────────────┼─→ association_members    │
                                           │       │                  │
                                           │       │                  │
                                           │       ├─→ cotisations    │
                                           │       │       │          │
                                           │       │       └─→ payments
                                           │       │                  │
                                           │       └─→ meeting_attendance
                                           │              ▲           │
                                           │              │           │
                                           │       ┌──── meetings     │
                                           │       │       │          │
                                           │       │       └─→ minutes
                                           │       │                  │
                                           │       │                  │
                                           │       └── cotisation_types│
                                           │                          │
                                           │       transactions       │
                                           │       (générique         │
                                           │        revenue|expense)  │
                                           │                          │
                                           └──────────────────────────┘
```

**Tables métier V1 (12 tables au total) :**

1. `pending_invitations` — Invitations envoyées en attente d'acceptation
2. `organization_invite_links` — Liens d'invitation partageables au niveau organisation
3. `association_members` — Annuaire des membres métier d'une organisation
4. `cotisation_types` — Définitions des types de cotisations par organisation
5. `cotisations` — Obligations de paiement individuelles (cotisations dues)
6. `payments` — Versements effectifs liés aux cotisations
7. `meetings` — Réunions planifiées et passées
8. `meeting_attendance` — RSVP et présence effective des membres aux réunions
9. `minutes` — Procès-verbaux des réunions
10. `transactions` — Comptabilité unifiée (revenus + dépenses)
11. `payment_reminders` — Historique des relances envoyées
12. `member_status_history` — Trace des changements de statut d'un membre (optionnel V1, baked si on a le temps)

---

## 3. Module Fondations

### 3.1. Articulation Better-Auth ↔ Métier

**Tables Better-Auth utilisées en référence :**

| Table | Rôle | FK utilisée |
|---|---|---|
| `user` | Compte utilisateur authentifié | `association_members.user_id` |
| `organization` | Organisation (tenant) | `*.organization_id` partout |
| `member` (Better-Auth) | Lien user ↔ organization, avec rôle de connexion | Non référencé directement, parallèle à `association_members` |
| `invitation` (Better-Auth) | Invitations à se connecter | Non référencé directement (on a `pending_invitations` métier en parallèle) |

**Règle métier critique — Auto-création du fondateur :**

Quand un utilisateur crée son compte ET son organisation lors de l'onboarding, il est **automatiquement ajouté comme premier `association_member`** de son organisation, avec :
- `user_id` rempli (lien vers son compte)
- `role` = `'administrateur'` (le rôle le plus élevé de la liste fixe)
- `status` = `'actif'`
- Nom, email, téléphone récupérés du compte utilisateur

Cette création se fait dans la même transaction que la création de l'organisation. Si elle échoue, l'organisation n'est pas créée.

> **Implémentation (juin 2026)** — Réalisée via le hook Better-Auth `organizationHooks.afterCreateOrganization` (`lib/auth/index.ts`) appelant le helper idempotent `ensureFounderMember` (`lib/members/founder.ts`). Le driver `neon-http` ne supportant pas les transactions interactives, l'atomicité SQL stricte n'est pas réalisable : le hook s'exécute après le commit de l'org, l'idempotence évite les doublons et le script `scripts/backfill-founder-members.ts` (`npm run backfill:founders`) répare l'existant et sert de filet. `phone_number` est posé à chaîne vide (le compte n'a pas de téléphone). Détails dans [ADR-0002](docs/decisions/0002-founder-member-autocreation.md).

### 3.2. Multi-organisations

Un même `user` peut appartenir à plusieurs organisations (via la table `member` de Better-Auth), avec des rôles différents dans chacune.

**Concept de "session active organization"** : la session Better-Auth contient un champ `active_organization_id` qui détermine quelle organisation est visible à l'utilisateur à un instant T. L'utilisateur change d'organisation via un menu déroulant dans la sidebar.

**Pas de limite** sur le nombre d'organisations par utilisateur en V1.

---

## 4. Module Membres

### 4.1. Table `association_members`

**Rôle** : Annuaire métier des membres d'une organisation. Distinct des comptes utilisateurs.

```sql
CREATE TABLE association_members (
  id                  TEXT PRIMARY KEY,                    -- cuid2
  organization_id     TEXT NOT NULL REFERENCES organization(id),
  user_id             TEXT NULL REFERENCES "user"(id),     -- nullable : lien optionnel vers compte Better-Auth

  -- Informations personnelles (V1)
  full_name           TEXT NOT NULL,                       -- obligatoire
  phone_number        TEXT NOT NULL,                       -- obligatoire, format E.164
  email               TEXT NULL,                           -- optionnel
  date_of_birth       DATE NULL,                           -- optionnel
  profession          TEXT NULL,                           -- optionnel
  notes               TEXT NULL,                           -- optionnel, champ libre

  -- Statut associatif
  role                TEXT NOT NULL DEFAULT 'membre',      -- enum app, voir 4.2
  custom_role         TEXT NULL,                           -- libellé libre si rôle personnalisé
  status              TEXT NOT NULL DEFAULT 'actif',       -- enum app, voir 4.3

  -- Dates métier
  joined_at           DATE NOT NULL DEFAULT CURRENT_DATE,  -- date d'adhésion
  left_at             DATE NULL,                           -- date de sortie (démission, exclusion, décès)

  -- Standard
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMP NULL
);

CREATE INDEX idx_association_members_org_status
  ON association_members (organization_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_association_members_user
  ON association_members (user_id)
  WHERE user_id IS NOT NULL AND deleted_at IS NULL;
```

**Règles métier importantes :**

- Un même `user_id` ne peut pas être lié à plusieurs `association_members` dans la même organisation (contrainte unique partielle à ajouter si nécessaire).
- Quand `role = 'autre'`, le champ `custom_role` doit être rempli (validation app, pas DB).
- Quand `status` passe à `démissionné`, `exclu`, ou `décédé`, on remplit `left_at`.
- Quand `status` passe à `suspendu`, on ne remplit PAS `left_at` (suspension réversible).

### 4.2. Enum `role` (liste fixe globale)

Valeurs autorisées :

| Valeur | Libellé FR |
|---|---|
| `president` | Président |
| `vice_president` | Vice-Président |
| `tresorier` | Trésorier |
| `secretaire` | Secrétaire |
| `charge_communication` | Chargé de Communication |
| `membre` | Membre |
| `administrateur` | Administrateur |
| `autre` | Autre (utilise `custom_role`) |

**Règle** : Identique pour toutes les organisations. Non personnalisable par org en V1.
**Champ libre** : `custom_role` activé uniquement quand `role = 'autre'`.

### 4.3. Enum `status` (5 statuts)

| Valeur | Libellé FR | Comportement |
|---|---|---|
| `actif` | Actif | Apparaît dans l'annuaire principal. Cotisations attendues. |
| `démissionné` | Démissionné | Apparaît grisé. Pas de cotisations attendues. `left_at` rempli. |
| `exclu` | Exclu | Comme démissionné, sémantiquement différent (sortie non volontaire). |
| `suspendu` | Suspendu | Temporairement inactif. Pas de cotisations attendues pendant la suspension. Réversible. |
| `décédé` | Décédé | Définitivement inactif. Préservé pour l'historique. |

**Filtrage par défaut** : l'annuaire principal affiche `status = 'actif'`. Les autres statuts sont accessibles via un filtre.

### 4.4. Table `pending_invitations`

**Rôle** : Invitations envoyées par email avec données pré-remplies, en attente d'acceptation.

```sql
CREATE TABLE pending_invitations (
  id                  TEXT PRIMARY KEY,
  organization_id     TEXT NOT NULL REFERENCES organization(id),

  -- Pré-remplissage de la fiche métier
  full_name           TEXT NOT NULL,
  phone_number        TEXT NULL,
  email               TEXT NOT NULL,
  intended_role       TEXT NOT NULL DEFAULT 'membre',

  -- Mécanique d'invitation
  token               TEXT NOT NULL UNIQUE,                -- token cryptographique
  invited_by_user_id  TEXT NOT NULL REFERENCES "user"(id),
  expires_at          TIMESTAMP NOT NULL,
  accepted_at         TIMESTAMP NULL,
  declined_at         TIMESTAMP NULL,

  -- Standard
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMP NULL
);

CREATE INDEX idx_pending_invitations_org_status
  ON pending_invitations (organization_id, accepted_at, declined_at)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_pending_invitations_token
  ON pending_invitations (token);
```

**Workflow** :

1. Le président saisit une fiche d'invitation (nom, email, rôle prévu).
2. AssoHub crée une ligne `pending_invitations` avec un `token` unique et un `expires_at` (par défaut J+30).
3. Email envoyé à l'invité avec un lien `/invitations/accept/<token>`.
4. À l'acceptation :
   - Création du compte Better-Auth (user + member).
   - Création de l'`association_member` avec `user_id` rempli et les données pré-remplies.
   - `accepted_at` est rempli sur `pending_invitations`.
5. À l'expiration ou au refus, `pending_invitations` reste pour l'historique mais peut être nettoyé après 90 jours.

**Affichage** : onglet « Invitations en attente » sur le module Membres, filtré sur `accepted_at IS NULL AND declined_at IS NULL AND expires_at > NOW()`.

### 4.5. Table `organization_invite_links`

**Rôle** : Liens d'invitation partageables au niveau organisation (typique WhatsApp).

```sql
CREATE TABLE organization_invite_links (
  id                    TEXT PRIMARY KEY,
  organization_id       TEXT NOT NULL REFERENCES organization(id),

  -- Mécanique
  token                 TEXT NOT NULL UNIQUE,              -- segment URL : /join/<token>
  created_by_user_id    TEXT NOT NULL REFERENCES "user"(id),

  -- Politique d'acceptation (choix au moment de la création)
  acceptance_mode       TEXT NOT NULL DEFAULT 'manual',    -- 'auto' | 'manual'

  -- Configuration
  default_role          TEXT NOT NULL DEFAULT 'membre',
  expires_at            TIMESTAMP NULL,                    -- nullable = pas d'expiration
  max_uses              INTEGER NULL,                      -- nullable = illimité
  uses_count            INTEGER NOT NULL DEFAULT 0,

  -- État
  revoked_at            TIMESTAMP NULL,                    -- révoqué par le président

  -- Standard
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMP NULL
);

CREATE UNIQUE INDEX idx_invite_links_token
  ON organization_invite_links (token);

CREATE INDEX idx_invite_links_org
  ON organization_invite_links (organization_id)
  WHERE revoked_at IS NULL AND deleted_at IS NULL;
```

**Workflow** :

1. Le président clique « Générer un lien d'invitation ».
2. Il choisit le mode (`auto` ou `manual`) et éventuellement une expiration / un nombre max d'utilisations.
3. AssoHub génère un token, l'URL `https://app.assohub.gn/join/<token>`.
4. Le président partage l'URL (WhatsApp, email, etc.).
5. À la visite par un invité :
   - Page d'inscription avec le nom de l'organisation affiché.
   - L'invité crée son compte (user + member Better-Auth).
   - **Si `acceptance_mode = 'auto'`** : `association_member` créé immédiatement avec `status = 'actif'`.
   - **Si `acceptance_mode = 'manual'`** : `association_member` créé avec un statut spécifique `en_attente_validation` (à ajouter à l'enum) ou via la table `pending_invitations`. À valider en implémentation.

**Anticipation V1.1+** : on baker `max_uses` et `uses_count` dès V1, même si en V1 on peut ne pas exposer ces options à l'UI (ou seulement « expiration : oui/non »).

---

## 5. Module Cotisations

### 5.1. Table `cotisation_types`

**Rôle** : Définitions des types de cotisations, personnalisables par organisation.

```sql
CREATE TABLE cotisation_types (
  id                  TEXT PRIMARY KEY,
  organization_id     TEXT NOT NULL REFERENCES organization(id),

  -- Définition
  name                TEXT NOT NULL,                       -- ex: "Cotisation mensuelle"
  description         TEXT NULL,
  default_amount      BIGINT NOT NULL,                     -- en centimes GNF
  frequency           TEXT NOT NULL,                       -- 'one_time' | 'monthly' | 'quarterly' | 'annually'

  -- Génération automatique
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,       -- si false, ne génère plus de cotisations
  auto_generate       BOOLEAN NOT NULL DEFAULT TRUE,       -- défaut on génère auto (V1.1+ : option de désactiver)

  -- Standard
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMP NULL
);

CREATE INDEX idx_cotisation_types_org
  ON cotisation_types (organization_id)
  WHERE deleted_at IS NULL;
```

**Enum `frequency` :**

| Valeur | Libellé FR | Génération |
|---|---|---|
| `one_time` | Ponctuelle | Une seule fois à l'adhésion ou à la demande |
| `monthly` | Mensuelle | Le 1er de chaque mois pour tous les membres actifs |
| `quarterly` | Trimestrielle | Le 1er janv/avril/juil/oct |
| `annually` | Annuelle | Le 1er janvier |

**Règle métier — Génération automatique :**

Un job (cron Vercel ou lazy à la consultation) tourne au début de chaque période. Pour chaque `cotisation_type` actif avec `auto_generate = TRUE`, il crée une ligne `cotisations` pour chaque `association_member` actif de l'organisation, avec `due_amount = default_amount` et `period_label` adapté ("Janvier 2026", "T1 2026", "2026").

### 5.2. Table `cotisations` (obligations de paiement)

**Rôle** : Une cotisation due par un membre pour une période donnée.

```sql
CREATE TABLE cotisations (
  id                  TEXT PRIMARY KEY,
  organization_id     TEXT NOT NULL REFERENCES organization(id),
  cotisation_type_id  TEXT NOT NULL REFERENCES cotisation_types(id),
  member_id           TEXT NOT NULL REFERENCES association_members(id),

  -- Montant et période
  due_amount          BIGINT NOT NULL,                     -- en centimes GNF
  period_label        TEXT NOT NULL,                       -- "Janvier 2026", "2026", etc.
  period_start        DATE NOT NULL,                       -- début de la période concernée
  period_end          DATE NOT NULL,                       -- fin de la période concernée
  due_date            DATE NOT NULL,                       -- date d'échéance

  -- État (calculé depuis les paiements, mais stocké pour les filtres rapides)
  status              TEXT NOT NULL DEFAULT 'en_attente',  -- 'en_attente' | 'partiel' | 'paye' | 'en_retard'
  paid_amount         BIGINT NOT NULL DEFAULT 0,           -- somme des paiements, en centimes

  -- Standard
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMP NULL
);

CREATE INDEX idx_cotisations_org_status
  ON cotisations (organization_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_cotisations_member
  ON cotisations (member_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_cotisations_due_date
  ON cotisations (organization_id, due_date)
  WHERE deleted_at IS NULL;

-- Garde-fou d'idempotence de la génération lazy (session 5A) : le driver
-- neon-http ne supporte pas les transactions interactives, donc pas de verrou
-- applicatif possible contre une course entre deux générations concurrentes.
CREATE UNIQUE INDEX idx_cotisations_type_period_member
  ON cotisations (cotisation_type_id, period_start, member_id)
  WHERE deleted_at IS NULL;
```

> **Implémentation (juillet 2026, session 5A)** — `period_label` stocke une forme
> canonique neutre ("2026-07" mensuel, "2026-Q3" trimestriel, "2026" annuel),
> pas le libellé français des exemples ci-dessus : `NEXT_LOCALE` est un cookie
> par navigateur, pas un réglage par organisation, donc un libellé figé en
> français serait faux pour un lecteur en anglais. L'affichage localisé
> ("Juillet 2026" / "July 2026") est calculé à la lecture par
> `lib/cotisations/generation.ts`.

**Enum `status` (calculé) :**

| Valeur | Condition |
|---|---|
| `en_attente` | `paid_amount = 0` et `due_date >= today` |
| `partiel` | `0 < paid_amount < due_amount` |
| `paye` | `paid_amount >= due_amount` |
| `en_retard` | `paid_amount < due_amount` et `due_date < today` |

**Règle** : `status` est recalculé à chaque modification de `paid_amount` ou changement de date. On stocke le résultat pour ne pas le recalculer à chaque lecture.

### 5.3. Table `payments` (versements)

**Rôle** : Un versement effectif lié à une cotisation. Plusieurs paiements possibles pour une même cotisation (paiements partiels).

```sql
CREATE TABLE payments (
  id                  TEXT PRIMARY KEY,
  organization_id     TEXT NOT NULL REFERENCES organization(id),
  cotisation_id       TEXT NOT NULL REFERENCES cotisations(id),
  member_id           TEXT NOT NULL REFERENCES association_members(id),
  recorded_by_user_id TEXT NOT NULL REFERENCES "user"(id),  -- qui a enregistré le paiement

  -- Montant et date
  amount              BIGINT NOT NULL,                     -- en centimes GNF
  paid_at             DATE NOT NULL DEFAULT CURRENT_DATE,  -- date de paiement (obligatoire)

  -- Méthode de paiement
  payment_method      TEXT NOT NULL,                       -- enum app, voir 5.4
  payment_reference   TEXT NULL,                           -- référence de transaction (obligatoire pour méthodes digitales)

  -- Note libre
  note                TEXT NULL,

  -- Standard
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMP NULL
);

CREATE INDEX idx_payments_cotisation
  ON payments (cotisation_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_payments_org_date
  ON payments (organization_id, paid_at)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_payments_member
  ON payments (member_id)
  WHERE deleted_at IS NULL;
```

**Règles métier :**

- À la création d'un `payment`, on met à jour `cotisations.paid_amount = SUM(payments.amount WHERE cotisation_id = X)` et on recalcule `cotisations.status`.
- À la création d'un `payment`, on crée automatiquement une `transaction` de type `revenue` (voir module Transactions).
- Si `payment_method` est dans la liste des méthodes digitales (voir 5.4), `payment_reference` est obligatoire (validation app).

### 5.4. Enum `payment_method`

| Valeur | Libellé FR | Référence obligatoire ? |
|---|---|---|
| `especes` | Espèces | Non |
| `orange_money` | Orange Money | **Oui** |
| `wave` | Wave | **Oui** |
| `mtn_momo` | MTN Mobile Money | **Oui** |
| `paycard` | Paycard | **Oui** |
| `soutra_money` | SoutraMoney | **Oui** |
| `virement_bancaire` | Virement bancaire | Non (mais recommandé) |
| `cheque` | Chèque | Non (mais recommandé) |
| `autre` | Autre | Non |

### 5.5. Table `payment_reminders` (historique des relances)

**Rôle** : Trace des relances envoyées aux membres en retard.

```sql
CREATE TABLE payment_reminders (
  id                  TEXT PRIMARY KEY,
  organization_id     TEXT NOT NULL REFERENCES organization(id),
  cotisation_id       TEXT NOT NULL REFERENCES cotisations(id),
  member_id           TEXT NOT NULL REFERENCES association_members(id),
  sent_by_user_id     TEXT NOT NULL REFERENCES "user"(id),

  -- Canal et état
  channel             TEXT NOT NULL DEFAULT 'email',       -- 'email' (V1) | 'sms' (V1.1+) | 'whatsapp' (V2)
  sent_at             TIMESTAMP NOT NULL DEFAULT NOW(),
  delivered_at        TIMESTAMP NULL,                      -- confirmé par Resend
  failed_at           TIMESTAMP NULL,
  failure_reason      TEXT NULL,

  -- Standard
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMP NULL
);

CREATE INDEX idx_reminders_cotisation
  ON payment_reminders (cotisation_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_reminders_member
  ON payment_reminders (member_id, sent_at DESC)
  WHERE deleted_at IS NULL;
```

**V1** : seul `email` est implémenté. Les autres canaux (`sms`, `whatsapp`) sont des valeurs prévues mais non utilisées.

**Affichage UI — Colonne "Dernier rappel"** : `SELECT MAX(sent_at) FROM payment_reminders WHERE cotisation_id = X`.

---

## 6. Module Réunions & PV

### 6.1. Table `meetings`

**Rôle** : Une réunion planifiée ou passée.

```sql
CREATE TABLE meetings (
  id                  TEXT PRIMARY KEY,
  organization_id     TEXT NOT NULL REFERENCES organization(id),
  created_by_user_id  TEXT NOT NULL REFERENCES "user"(id),

  -- Identification
  title               TEXT NOT NULL,
  type                TEXT NOT NULL,                       -- enum app, voir 6.2
  description         TEXT NULL,

  -- Date et lieu
  scheduled_at        TIMESTAMP NOT NULL,                  -- date et heure de début
  duration_minutes    INTEGER NULL,                        -- durée prévue, optionnel
  location            TEXT NULL,                           -- lieu en texte libre ("Lambanyi", "Hôtel Kaloum salle B")
  video_link          TEXT NULL,                           -- lien de visioconférence, affiché en bouton "Rejoindre"

  -- État
  status              TEXT NOT NULL DEFAULT 'planifiee',   -- 'planifiee' | 'tenue' | 'annulee' | 'reportee'

  -- Standard
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMP NULL
);

CREATE INDEX idx_meetings_org_scheduled
  ON meetings (organization_id, scheduled_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_meetings_org_status
  ON meetings (organization_id, status)
  WHERE deleted_at IS NULL;
```

**Règle métier critique — Bug à ne PAS reproduire :**

Le filtrage "Prochaines réunions" doit être **strictement** :
```sql
WHERE scheduled_at >= NOW() AND status IN ('planifiee', 'reportee') AND deleted_at IS NULL
```

Le filtrage "Réunions passées" :
```sql
WHERE (scheduled_at < NOW() OR status = 'tenue') AND status != 'annulee' AND deleted_at IS NULL
```

Ne **jamais** afficher une réunion passée dans "Prochaines réunions" — c'était un bug du produit existant.

> **Implémentation (juillet 2026, session 6A)** — Deux ajustements par rapport à
> la spec d'origine, validés avec le fondateur : (1) `video_link` ajouté à la
> table (absent de la conception initiale, décision produit 6A : lien de
> visioconférence optionnel, bouton "Rejoindre" quand présent) ; (2) le filtre
> "Réunions passées" exclut désormais explicitement `status != 'annulee'` — le
> filtre littéral ci-dessus ne l'excluait pas, alors qu'une réunion annulée ne
> doit apparaître dans aucune des deux vues par défaut (seulement via sa page
> détail, lien direct). `nowUtc` est recalculé à chaque requête, jamais mis en
> cache, pour garantir structurellement l'absence du bug historique.

### 6.2. Enum `type` (8 types fixes)

| Valeur | Libellé FR |
|---|---|
| `ag` | Assemblée Générale |
| `bureau` | Bureau |
| `ca` | Conseil d'Administration |
| `commission` | Commission |
| `formation` | Formation |
| `atelier` | Atelier |
| `evenement` | Événement |
| `autre` | Autre |

**Pas de champ libre pour le type de réunion**. Si une asso veut préciser, elle le met dans le `title` ou `description`.

### 6.3. Enum `status` (réunion)

| Valeur | Libellé FR |
|---|---|
| `planifiee` | Planifiée |
| `tenue` | Tenue |
| `annulee` | Annulée |
| `reportee` | Reportée |

### 6.4. Table `meeting_attendance`

**Rôle** : RSVP et présence effective de chaque membre à une réunion.

```sql
CREATE TABLE meeting_attendance (
  id                  TEXT PRIMARY KEY,
  organization_id     TEXT NOT NULL REFERENCES organization(id),
  meeting_id          TEXT NOT NULL REFERENCES meetings(id),
  member_id           TEXT NOT NULL REFERENCES association_members(id),

  -- RSVP (avant la réunion)
  rsvp_status         TEXT NOT NULL DEFAULT 'no_response', -- 'yes' | 'no' | 'maybe' | 'no_response'
  rsvp_at             TIMESTAMP NULL,

  -- Présence effective (après la réunion)
  attended            BOOLEAN NULL,                        -- null = pas encore renseigné
  attendance_recorded_at TIMESTAMP NULL,
  attendance_recorded_by_user_id TEXT NULL REFERENCES "user"(id),

  -- Standard
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMP NULL,

  UNIQUE (meeting_id, member_id, deleted_at)
);

CREATE INDEX idx_attendance_meeting
  ON meeting_attendance (meeting_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_attendance_member
  ON meeting_attendance (member_id, created_at DESC)
  WHERE deleted_at IS NULL;
```

**Règle métier :**

- À la création d'une réunion, on **ne crée pas** automatiquement de lignes `meeting_attendance` pour tous les membres. Elles sont créées à la demande (quand un membre RSVP, ou quand le secrétaire saisit la présence après coup).
- Lors de la saisie de présence post-réunion, l'UI propose **tous les membres actifs** de l'organisation comme cocheables (pas seulement ceux qui avaient RSVP).
- Le quorum (si pertinent) est calculé : `COUNT(*) WHERE attended = TRUE AND meeting_id = X`.

### 6.5. Table `minutes` (procès-verbaux)

**Rôle** : Procès-verbal d'une réunion. Structure hybride : sections fixes + corps Markdown.

```sql
CREATE TABLE minutes (
  id                  TEXT PRIMARY KEY,
  organization_id     TEXT NOT NULL REFERENCES organization(id),
  meeting_id          TEXT NOT NULL REFERENCES meetings(id),
  created_by_user_id  TEXT NOT NULL REFERENCES "user"(id),

  -- Sections fixes (extraites de meetings, ou saisies à la rédaction)
  agenda              TEXT NULL,                           -- ordre du jour en texte structuré
  decisions_summary   TEXT NULL,                           -- résumé des décisions
  actions_to_follow   TEXT NULL,                           -- actions à mener (texte ou JSON pour V1.1+)

  -- Corps principal (Markdown)
  body_markdown       TEXT NOT NULL,                       -- contenu détaillé en Markdown

  -- État
  status              TEXT NOT NULL DEFAULT 'brouillon',   -- 'brouillon' | 'publie' | 'archive'
  published_at        TIMESTAMP NULL,
  archived_at         TIMESTAMP NULL,

  -- Standard
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),    -- mis à jour à chaque édition (trace de modification)
  deleted_at          TIMESTAMP NULL
);

CREATE INDEX idx_minutes_meeting
  ON minutes (meeting_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_minutes_org_status
  ON minutes (organization_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_minutes_org_published
  ON minutes (organization_id, published_at DESC)
  WHERE deleted_at IS NULL AND status = 'publie';
```

**Règle métier — Bug à ne PAS reproduire :**

L'affichage "Derniers PV" doit être :
```sql
SELECT * FROM minutes
WHERE organization_id = X AND status = 'publie' AND deleted_at IS NULL
ORDER BY published_at DESC
LIMIT N
```

**Pas de doublons** — un meeting a au plus UN minute en état non-archivé (contrainte applicative à valider en implémentation).

**Modification après publication** : autorisée, `updated_at` mis à jour à chaque édition. Pas de versioning explicite en V1.

### 6.6. Enum `status` (minutes)

| Valeur | Libellé FR | Comportement |
|---|---|---|
| `brouillon` | Brouillon | En rédaction, non visible aux membres |
| `publie` | Publié | Visible à tous les membres autorisés |
| `archive` | Archivé | Plus visible dans la liste principale, accessible via filtre |

---

## 7. Module Transactions financières

### 7.1. Table `transactions`

**Rôle** : Comptabilité unifiée. Toutes les entrées et sorties d'argent passent ici.

```sql
CREATE TABLE transactions (
  id                  TEXT PRIMARY KEY,
  organization_id     TEXT NOT NULL REFERENCES organization(id),
  recorded_by_user_id TEXT NOT NULL REFERENCES "user"(id),

  -- Type et montant
  type                TEXT NOT NULL,                       -- 'revenue' | 'expense'
  amount              BIGINT NOT NULL,                     -- en centimes GNF, toujours positif
  occurred_at         DATE NOT NULL DEFAULT CURRENT_DATE,  -- date de la transaction

  -- Catégorisation
  category            TEXT NOT NULL,                       -- enum app selon type, voir 7.2 et 7.3
  description         TEXT NOT NULL,                       -- description libre

  -- Origine (pour les revenus auto-générés depuis payments)
  payment_id          TEXT NULL REFERENCES payments(id),   -- nullable, rempli pour les cotisations

  -- Référence de pièce justificative (V1 : texte simple)
  reference_document  TEXT NULL,                           -- numéro de facture, référence reçu, etc.

  -- Workflow de validation (baked pour V1.1+, défaut 'validated' en V1)
  status              TEXT NOT NULL DEFAULT 'validated',   -- 'pending' | 'validated' | 'rejected'
  validated_by_user_id TEXT NULL REFERENCES "user"(id),
  validated_at        TIMESTAMP NULL,

  -- Standard
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMP NULL
);

CREATE INDEX idx_transactions_org_type_date
  ON transactions (organization_id, type, occurred_at DESC)
  WHERE deleted_at IS NULL AND status = 'validated';

CREATE INDEX idx_transactions_org_category
  ON transactions (organization_id, category)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_transactions_payment
  ON transactions (payment_id)
  WHERE payment_id IS NOT NULL AND deleted_at IS NULL;
```

**Règle métier critique — Génération automatique depuis `payments` :**

Quand un `payment` est créé, un `transaction` de type `revenue` est **automatiquement créé** dans la même transaction SQL, avec :
- `type = 'revenue'`
- `category = 'cotisations'`
- `amount = payment.amount`
- `occurred_at = payment.paid_at`
- `payment_id = payment.id`
- `description = "Cotisation [type] - [member name] - [period_label]"`

Quand un `payment` est supprimé (soft delete), le `transaction` correspondant est aussi soft deleted.

**Pas de liens vers d'autres entités** en V1 (`related_meeting_id`, `related_member_id`, etc.). La description libre absorbe la traçabilité.

### 7.2. Enum `category` pour `type = 'revenue'`

| Valeur | Libellé FR | Saisie |
|---|---|---|
| `cotisations` | Cotisations | Auto-généré depuis `payments` |
| `dons` | Dons | Manuelle |
| `subventions` | Subventions | Manuelle |
| `recettes_evenements` | Recettes d'événements | Manuelle |
| `ventes` | Vente de produits/services | Manuelle |
| `partenariats` | Partenariats / Sponsoring | Manuelle |
| `autre_revenu` | Autre | Manuelle |

### 7.3. Enum `category` pour `type = 'expense'`

| Valeur | Libellé FR |
|---|---|
| `loyer_charges` | Loyer et charges |
| `fournitures` | Fournitures et matériel |
| `communication` | Communication |
| `evenements` | Événements |
| `transport` | Transport et déplacements |
| `personnel` | Personnel |
| `frais_bancaires` | Frais bancaires et financiers |
| `dons_verses` | Dons et subventions versés |
| `impots_taxes` | Impôts et taxes |
| `autre_depense` | Autre |

### 7.4. Calculs pour le module Rapports

**Revenus totaux** (sur une période) :
```sql
SELECT SUM(amount) FROM transactions
WHERE organization_id = X
  AND type = 'revenue'
  AND status = 'validated'
  AND occurred_at BETWEEN start AND end
  AND deleted_at IS NULL;
```

**Dépenses totales** (sur une période) : pareil avec `type = 'expense'`.

**Solde net** : `revenus_totaux - depenses_totales`.

**Évolution mensuelle** : `GROUP BY DATE_TRUNC('month', occurred_at)`.

**Répartition par catégorie** : `GROUP BY category` filtré par `type`.

---

## 8. Anticipations V1.1+ baked dans le schéma V1

Récapitulatif des décisions prises pour préparer le terrain sans implémenter en V1 :

| Anticipation | Champ baked | Activation V1.1+ |
|---|---|---|
| Workflow de validation des dépenses | `transactions.status` (`pending`/`validated`/`rejected`), `validated_by_user_id`, `validated_at` | UI de validation à ajouter, change le défaut à `pending` |
| Relances multicanal (SMS, WhatsApp) | `payment_reminders.channel` | Intégration Africa's Talking ou Twilio |
| Toggle "génération auto" par type de cotisation | `cotisation_types.auto_generate` | UI pour gérer ça |
| Upload de pièces justificatives | `transactions.reference_document` (déjà existant), à étendre avec table `transaction_attachments` | Intégration Vercel Blob |
| Multidevise | À ajouter : `currency` sur tables monétaires | Migration Drizzle |
| Permissions fines par rôle | Aucun bake nécessaire — table `permissions` à créer | Nouvelle table + middleware |
| Récurrence des réunions | Aucun bake — table `recurring_meeting_templates` à créer | Nouvelle table + cron |
| Versioning explicite des PV | Aucun bake — table `minute_versions` à créer | Nouvelle table |
| Limite max d'utilisations des liens d'invitation | `organization_invite_links.max_uses` (existe déjà), à exposer UI | UI seulement |

---

## 9. Ordre de création des tables (migration)

L'ordre est dicté par les contraintes de clés étrangères. Création dans cet ordre :

1. (Tables Better-Auth déjà existantes : `user`, `organization`, `member`, `invitation`)
2. `pending_invitations` (dépend de `organization`, `user`)
3. `organization_invite_links` (dépend de `organization`, `user`)
4. `association_members` (dépend de `organization`, `user`)
5. `cotisation_types` (dépend de `organization`)
6. `cotisations` (dépend de `organization`, `cotisation_types`, `association_members`)
7. `payments` (dépend de `organization`, `cotisations`, `association_members`, `user`)
8. `payment_reminders` (dépend de `organization`, `cotisations`, `association_members`, `user`)
9. `meetings` (dépend de `organization`, `user`)
10. `meeting_attendance` (dépend de `organization`, `meetings`, `association_members`, `user`)
11. `minutes` (dépend de `organization`, `meetings`, `user`)
12. `transactions` (dépend de `organization`, `user`, `payments`)

**Recommandation Drizzle** : générer une seule migration `0001_create_business_tables.sql` qui exécute toutes les `CREATE TABLE` dans cet ordre. Plus simple à gérer qu'une migration par table.

---

## 10. Règles métier transverses (résumé)

Liste des règles à enforcer dans le code application :

1. **Multi-tenancy strict** : toute requête sur une table métier filtre par `organization_id`. Aucune exception sauf super-admin.
2. **Soft delete par défaut** : toute lecture filtre `WHERE deleted_at IS NULL`. Hard delete réservé au super-admin.
3. **Auto-création du fondateur** : à l'onboarding, créer `association_members` avec rôle `administrateur` et statut `actif`.
4. **Validation `custom_role`** : si `role = 'autre'`, `custom_role` doit être non-null.
5. **Validation `payment_reference`** : obligatoire si `payment_method` est une méthode digitale (Orange Money, Wave, MTN MoMo, Paycard, SoutraMoney).
6. **Recalcul de `cotisations.status` et `paid_amount`** : à chaque création/modification/suppression de `payment`.
7. **Auto-création de `transaction`** : à chaque création de `payment`, créer une `transaction` de type `revenue` correspondante dans la même transaction SQL.
8. **Filtrage strict "Prochaines réunions"** : `scheduled_at >= NOW() AND status IN ('planifiee', 'reportee')`.
9. **Pas de doublons de PV** : un `meeting` a au plus UN `minutes` en état non-archivé.
10. **Génération automatique des cotisations récurrentes** : job cron au début de chaque période, ou lazy à la consultation.
11. **Téléphones en E.164** : validation à la saisie côté app, stockage sans formatage.
12. **Montants en centimes** : entrée UI en GNF, conversion en centimes avant stockage.

---

## 11. Tables explicitement reportées à V1.1+ (rappel)

Pour mémoire, on ne crée PAS en V1 :
- `messages` (communications internes)
- `documents` (gestion documentaire)
- `ai_conversations` (assistant IA)
- `notifications` (notifications in-app)
- `transaction_attachments` (upload de pièces justificatives)
- `recurring_meeting_templates` (récurrence des réunions)
- `minute_versions` (versioning explicite des PV)
- `permissions` (permissions fines par rôle)

---

## 12. Glossaire

| Terme | Définition |
|---|---|
| **Tenant** | Une organisation. Toutes les données sont isolées par tenant. |
| **Association member** | Membre métier d'une association (annuaire). |
| **User** (Better-Auth) | Compte utilisateur authentifié. |
| **Cotisation** | Obligation de paiement d'un membre pour une période. |
| **Payment** | Versement effectif lié à une cotisation. |
| **Transaction** | Ligne de comptabilité unifiée (revenu ou dépense). |
| **PV** ou **Minutes** | Procès-verbal d'une réunion. |
| **Soft delete** | Suppression logique via `deleted_at`, donnée conservée. |
| **Hard delete** | Suppression physique de la ligne en base. |
| **E.164** | Format international standard des numéros de téléphone (`+22461155...`). |
| **cuid2** | Identifiant unique cryptographiquement sûr, plus court qu'UUID. |

---

*Fin du document.*
*25 décisions de conception. 12 tables métier. Spec prête pour l'implémentation Phase 2.*
