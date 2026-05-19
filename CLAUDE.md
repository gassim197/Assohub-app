# CLAUDE.md — AssoHub

> Ce fichier est le contexte permanent du projet pour Claude Code.
> À lire au début de chaque session. À mettre à jour quand une décision structurante change.

---

## 1. Le projet

**AssoHub** est une plateforme SaaS de gestion d'associations et d'ONG, pensée pour le marché ouest-africain francophone (Guinée, Sénégal, Côte d'Ivoire en cibles V1, expansion panafricaine à terme).

**Promesse** : *« L'infrastructure numérique des organisations africaines. »*

**Public cible** : associations étudiantes, ONG locales, organisations communautaires, réseaux et collectifs — toutes tailles, des structures de 5 membres aux ONG nationales.

**Fondateur** : Gassimou Cissé, basé à Conakry (Guinée). Solo développeur, apprend en construisant. Claude est partenaire de travail, pas exécutant aveugle — challenger les choix douteux, expliquer les concepts, ne pas faire à la place.

**Domaine de production cible** : `assohub.gn`
**Domaine de transition (filet de sécurité)** : `asso-hub-gn.com`

---

## 2. Stack technique

| Couche | Choix | Raison |
|---|---|---|
| Framework | Next.js 15 (App Router, Server Components) | Monorepo simple, déploiement unique |
| Language | TypeScript (strict mode) | Type safety end-to-end |
| ORM | Drizzle | Type-safe, proche du SQL, peu de magie |
| Database | PostgreSQL sur Neon | Serverless, branches de DB, free tier généreux |
| Auth | Better-Auth | Pas de vendor lock-in US, multi-tenant natif |
| UI | shadcn/ui + Tailwind CSS | Composants possédés dans le repo |
| Icons | Lucide | Cohérent avec shadcn |
| i18n | next-intl | FR par défaut, EN préparé |
| Forms | react-hook-form + zod | Validation typée |
| Email | Resend | API simple, free tier suffisant |
| Hosting | Vercel | Déploiement git push, CDN global |
| Storage | Vercel Blob | À réévaluer pour documents en V1.1 |

---

## 3. Architecture & décisions structurantes

### Multi-tenant
- Une organisation = un tenant.
- Toutes les requêtes DB filtrent par `organization_id`.
- Un utilisateur peut appartenir à plusieurs organisations avec des rôles différents.
- Une session = une organisation active à la fois (`active_organization_id` dans la session).

### i18n
- Français par défaut (locale `fr-FR`).
- Anglais en placeholder (locale `en`).
- **Toutes** les chaînes UI passent par next-intl dès le premier composant. Aucune string en dur.
- Les fichiers de traduction vivent dans `/messages/[locale].json`.

### Authentification
- V1 : email + mot de passe.
- V1.1 : magic link + OAuth Google.
- Invitations : email nominatif avec token **ET** lien d'invitation au niveau organisation (régénérable, expiration configurable).
- Sessions persistantes, refresh automatique.

### Super-admin
- Flag `is_platform_admin` sur la table `users` (transverse, pas un rôle d'organisation).
- Voit toutes les organisations, peut intervenir pour support et débogage.
- Compte fondateur : Gassimou Cissé.
- Toutes les actions super-admin sont **loggées** (table `admin_audit_log`).

### Monnaie
- Stockage des montants en **centimes** (entier, type `bigint`). Jamais de flottant.
- Affichage formaté selon la locale : `220 000 GNF`.
- V1 : uniquement GNF (Franc guinéen).
- V1.1+ : multidevise (XOF, USD, EUR).

### Téléphones
- Stockage en E.164 (`+22461155...`).
- Affichage formaté selon la locale (`+224 6 11 55 15 20`).
- Validation à la saisie avec `libphonenumber-js`.

### Dates & timezone
- Stockage en UTC.
- Affichage en `Africa/Conakry` par défaut, configurable par organisation.

---

## 4. Modules MVP (V1)

### 4.1. Tableau de bord
- KPIs par organisation : nb membres, taux de cotisation, participation moyenne, prochaine réunion.
- Actions rapides : Nouveau membre, Encaisser cotisation, Planifier réunion, Importer.
- Empty states **engageants** (« Invitez votre premier membre ») jamais négatifs.

### 4.2. Membres
- Annuaire avec recherche, filtre, pagination.
- **Rôles** : liste fixe (Président, Vice-Président, Trésorier, Secrétaire, Chargé de Communication, Membre, Administrateur) **+ champ texte libre** pour rôle personnalisé.
- **Statuts** : Actif, Suspendu, Démissionné.
- Onglet « Invitations en attente » séparé.
- Import/Export XLSX.
- Numéros de téléphone formatés (jamais bruts).

### 4.3. Cotisations
- **Types de cotisations personnalisables par organisation** (table `cotisation_types`).
- Montant dû / montant payé / statut (Payé, En attente, En retard).
- **Méthode de paiement enregistrée** : Espèces, Orange Money, Wave, MTN MoMo, Virement, Autre.
- Référence de transaction pour les paiements mobiles.
- Date de paiement obligatoire.
- Champ `payment_method` et `payment_reference` baked dans le schéma dès V1, même si l'intégration live arrive plus tard.
- Structure de relance automatique préparée (cron en V1.1).

### 4.4. Réunions & PV
- Types de réunions configurables par organisation (Réunion ordinaire, AG, Bureau, Formation, autre…).
- **Filtrage strict** : « Prochaines » = `date >= today`, « Passées » = `date < today`. Bug à ne pas reproduire.
- Procès-verbaux en entité first-class, liés à la réunion, statut **Brouillon / Publié / Validé**.
- Pas de doublons dans les listes (vérifier les jointures).
- Présence : table de liaison `meeting_attendees` pour suivre qui était là.

### 4.5. Rapports
- Financiers : Revenus totaux, Dépenses totales, Solde net.
- Filtres : 30 jours / Année / Personnalisé.
- Export PDF (génération côté serveur, pas client).
- **Sous-écran « Dépenses »** accessible depuis Rapports (pas un module nav distinct).
- Schéma : table `transactions` générique avec `type = 'revenue' | 'expense'` pour évoluer plus tard vers un vrai module Trésorerie sans réécrire.

---

## 5. Hors-scope V1 (anticiper mais ne pas construire)

- **Communications / SMS** : structure prévue dans le schéma, pas d'implémentation. Pas de bouton « Envoyer SMS » fonctionnel.
- **Documents** : table prévue, module désactivé.
- **Assistant IA** : couche d'historique conversationnel prévue dans le schéma (`ai_conversations`), module non implémenté.
- **Intégration mobile money live** : les champs sont là, pas d'API.
- **Notifications push** : non prévues V1.
- **Multi-devises** : V1.1+.
- **Rapports avancés** (présence, croissance) : V1.2.
- **App mobile native** : jamais. Web responsive uniquement.

---

## 6. Schéma DB — principes

- Toutes les tables ont : `id` (cuid2), `created_at`, `updated_at`, `deleted_at` (soft delete).
- Toutes les tables liées à une org ont : `organization_id` (FK + index).
- Pas d'enums Postgres pour les valeurs susceptibles d'évoluer (statut, rôle, type) — préférer des tables de référence ou des champs `text` validés côté app.
- Indexes systématiques sur `organization_id` et toute FK utilisée en filtre.
- Migrations gérées via Drizzle Kit. **Jamais de modification de schéma manuelle en production.**
- Soft delete par défaut sur toutes les entités métier. Hard delete réservé aux super-admins via une action explicite.

### Tables prévues V1 (liste indicative)
- `users`
- `organizations`
- `organization_members` (lien user ↔ org + rôle)
- `invitations`
- `member_roles` (rôles personnalisés par org)
- `members` (annuaire métier, distinct de `users` qui est l'authentification)
- `cotisation_types`
- `cotisations`
- `meeting_types`
- `meetings`
- `meeting_attendees`
- `minutes` (PV)
- `transactions` (revenus + dépenses)
- `admin_audit_log`

### Tables prévues mais non utilisées en V1
- `messages`
- `documents`
- `ai_conversations`

---

## 7. Voix de marque & ton

- **Panafricaine, ambitieuse, structurée.** Pas corporate, pas startup américaine.
- **« Conçu en Afrique, pour l'Afrique »** est l'ADN, pas un slogan affiché partout.
- Langage **clair**, pas de jargon SaaS US (« onboarding », « churn »…).
- **Empty states engageants** (« Invitez votre premier membre ») jamais négatifs (« +0 nouveaux ce mois »).
- **Messages d'erreur humains** (« Cette adresse email est déjà utilisée. Voulez-vous vous connecter ? ») jamais techniques.
- **Boutons CTA** : verbe d'action concret (« Encaisser », « Inviter », « Planifier »). Jamais « Submit » ou « OK ».
- **Pas de « dues »** ni d'autre anglicisme dans l'UI française.

---

## 8. Conventions de code

### Langue
- **Code, variables, fonctions, types, commentaires techniques** : anglais.
- **Strings UI, messages utilisateur** : via next-intl, clés en anglais, valeurs FR par défaut.
- **Documentation projet** (README, CLAUDE.md, ADRs) : français.

### Structure
```
/app                  # Next.js App Router
  /(auth)             # Routes publiques (login, register, accept-invitation)
  /(dashboard)        # Routes authentifiées
    /[orgSlug]        # Routes scopées par organisation
      /members
      /cotisations
      /meetings
      /reports
/components
  /ui                 # shadcn/ui components
  /[feature]          # Components par feature (members/, cotisations/, ...)
/lib
  /db                 # Drizzle schema, queries, migrations
  /auth               # Better-Auth config
  /utils              # Helpers (formatPhone, formatCurrency, ...)
/messages             # next-intl translations
/public
```

### Naming
- Composants React : `PascalCase`.
- Hooks : `camelCase` préfixé `use`.
- Tables DB : `snake_case` pluriel (`organizations`, `members`).
- Colonnes DB : `snake_case` (`created_at`, `phone_number`).
- Routes : `kebab-case` (`/new-member`).
- Fichiers de pages : `kebab-case`. Fichiers de composants : `PascalCase`.

### Imports
- Toujours utiliser le path alias `@/` (ex : `@/lib/db`).
- Ordre des imports : React/Next → externes → internes → relatifs → types.

---

## 9. Design system

### Couleurs (à reprendre de l'app existante)
- Primary navy : `#0F172A` (sidebar, headers)
- Accent bleu (à finaliser depuis les screenshots)
- Success green : `#22C55E`
- Warning orange : `#F59E0B`
- Danger red : `#EF4444`
- Neutrals : palette Tailwind par défaut

### Typographie
- Sans-serif moderne (Inter par défaut, à confirmer après réception du design existant).
- Hiérarchie claire : H1 / H2 / H3 / body / caption.

### Composants
- Toujours passer par les composants shadcn/ui centralisés.
- **Jamais** styliser une `<div>` à la main pour mimer un Card, un Button, un Input.
- Variations via les variants shadcn, pas via du CSS inline.

---

## 10. Workflow Git

- `main` = production.
- `develop` = intégration.
- Branches feature : `feature/[module]-[description]` (ex : `feature/members-bulk-actions`).
- Branches fix : `fix/[description]`.
- **Conventional Commits** : `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Aucun push direct sur `main`.
- Aucune migration DB sans backup préalable en production.
- Pull request avec description claire pour chaque feature, même en solo.

---

## 11. Ce que Claude ne fait jamais sans demander

- Exécuter `rm -rf` ou toute commande destructive.
- Modifier le schéma de base de données en **production**.
- Push direct sur `main`.
- Supprimer ou modifier un fichier `.env` existant.
- Installer une dépendance majeure non listée dans la stack.
- Changer un choix architectural validé dans ce fichier.
- Modifier ce fichier (`CLAUDE.md`) sans demander explicitement à Gassimou.
- Désactiver ou contourner une mesure de sécurité (auth, validation, sanitization).

---

## 12. Comment travailler avec Gassimou

- **Pédagogie d'abord** : Gassimou apprend en construisant. Expliquer le « pourquoi » avant le « comment ».
- **Challenger les choix douteux** : si une demande semble incohérente ou pose un risque, le dire avant d'agir.
- **Pas de surcouche inutile** : préférer la simplicité. Un solo dev avec un MVP n'a pas besoin de microservices, Kubernetes, ou de design patterns complexes.
- **Décisions documentées** : toute décision d'architecture importante est ajoutée à `/docs/decisions/` (ADRs courts).
- **Commits atomiques** : un commit = une idée. Pas de commits fourre-tout.

---

*Dernière mise à jour : 19 mai 2026 — V1 (cadrage initial).*
*Maintenu par : Gassimou Cissé. Co-rédigé avec Claude.*
