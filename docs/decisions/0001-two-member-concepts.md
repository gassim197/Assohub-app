# ADR-0001 — Distinguish `member` from `association_member`

**Date :** 2026-05-19  
**Statut :** Accepté

## Contexte

Le domaine AssoHub contient deux entités dont le nom évoque les "membres d'une organisation", mais qui ont des rôles fondamentalement différents. Les confondre dans le code ou dans les discussions mènerait à des bugs difficiles à tracer et à des décisions d'architecture incohérentes.

## Décision

Ces deux concepts sont **strictement séparés** et ne doivent jamais être fusionnés :

### `member` (table gérée par Better-Auth)

- Représente un **utilisateur AssoHub authentifié** lié à une organisation.
- Toujours associé à un `user` (qui a une adresse email et un mot de passe).
- Contrôle les **droits d'accès au dashboard** AssoHub (rôles : `owner`, `admin`, `member`).
- Créé automatiquement lors de la création d'une organisation ou d'une invitation acceptée.
- **Ne pas modifier ce schéma** — il est géré par Better-Auth.

### `association_member` (table à créer en session 3)

- Représente une **personne dans l'annuaire métier** d'une association.
- Peut n'avoir **aucun compte AssoHub** (ancien membre, contact externe, personne sans email, etc.).
- Géré entièrement par les administrateurs de l'association.
- Contient les données métier : statut de cotisation, date d'adhésion, rôle dans l'asso, etc.
- Peut optionnellement être **lié** à un `user` AssoHub (champ `userId` nullable), mais ce lien n'est pas requis.

## Conséquences

- Ne jamais supposer qu'un `association_member` a un compte AssoHub.
- Ne jamais supposer qu'un `member` (Better-Auth) est dans l'annuaire métier de l'association.
- Les requêtes d'accès au dashboard utilisent la table `member`.
- Les requêtes de l'annuaire et des cotisations utilisent la table `association_member`.
- Si on veut afficher le profil AssoHub d'un membre de l'annuaire, on fait une jointure explicite via `userId` nullable.
