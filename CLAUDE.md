@AGENTS.md

## Design System

### 9.1 Brand palette

| Token | CSS var | Valeur | Hex |
|---|---|---|---|
| Navy (sidebar) | `--sidebar` | `oklch(0.208 0.042 266)` | `#0F172A` |
| Texte principal | `--foreground` | `oklch(0.145 0.018 266)` | near-black |
| Emerald (accent) | `--primary`, `--brand`, `--ring` | `oklch(0.696 0.17 162.5)` | `#10B981` |
| Emerald subtle | `--brand-subtle` | `oklch(0.979 0.021 166.1)` | emerald-50 |

- **Primary** (emerald) = CTAs, boutons principaux, anneaux de focus, états actifs.
- **Navy** = fond sidebar (`--sidebar`). Le `--foreground` est volontairement plus sombre que la navy pour garantir le contraste du texte sur fond clair.
- Navy et emerald ne doivent pas se confondre visuellement — maintenir la hiérarchie navy/emerald.

### 9.2 Typographie

- **Famille** : Geist Sans via `next/font/google` → variable CSS `--font-geist-sans`
- **Mono** : Geist Mono via `next/font/google` → variable CSS `--font-geist-mono`
- **Mapping Tailwind** : `--font-sans: var(--font-geist-sans), system-ui, ...`
- Chargé dans `app/layout.tsx`, classes injectées sur `<html>`.

### 9.3 Tokens visuels (définis dans `app/globals.css`)

**Radius** — base `--radius: 0.5rem` (8px), scale : sm×0.6, md×0.8, lg×1, xl×1.4, 2xl×1.8

**Shadows**
- `--shadow-sm` : 1px, très subtil (séparateurs)
- `--shadow-card` : 3px (cartes, panneaux)
- `--shadow-dropdown` : 6px (menus déroulants)
- `--shadow-lg` : 15px (modales, overlays)

**Transitions**
- `--transition-fast: 100ms ease`
- `--transition-base: 150ms ease`
- `--transition-slow: 300ms ease`

**Couleurs sémantiques**
- `--success: oklch(0.627 0.194 145)` — vert distinct de l'emerald (plus chaud/jaune)
- `--warning: oklch(0.769 0.188 70.1)` — amber
- `--info: oklch(0.623 0.214 259)` — bleu

### 9.4 Composants customisés

- **Button** : `variant="default"` = emerald (primary CTA). Hover à 90% opacité.
- **Badge** : variantes default, secondary, outline, destructive, success, warning, info.
- **Input** : focus ring emerald (`--ring`), état erreur via `aria-invalid`.
- **Card** : `ring-1 ring-foreground/10`, padding standardisé, footer muted.

### 9.5 Référence visuelle

Page `/style-guide` — affiche tous les tokens, composants, et le logo aux tailles 16→96px.
Accessible en dev sans authentification.

### 9.6 Routage racine

La route `/` est un Server Component pur (`app/page.tsx`) qui exécute une redirection intelligente basée sur l'état d'authentification — pas de landing marketing en V1 :

- Pas de session → `/login`
- Session sans organisation → `/onboarding`
- Session avec organisation → `/<orgSlug>` (organisation active si `session.activeOrganizationId` est défini, sinon la première de la liste retournée par `auth.api.listOrganizations`)

En cas d'erreur lors de la résolution de la session (session corrompue, base indisponible), fallback vers `/login`.
