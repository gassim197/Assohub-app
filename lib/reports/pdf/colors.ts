/**
 * Équivalents hexadécimaux des tokens `oklch()` de `app/globals.css` (thème
 * clair uniquement — un PDF imprimé n'a pas de mode sombre). `@react-pdf/renderer`
 * ne supporte pas `oklch()`/variables CSS, seulement des couleurs statiques :
 * approximations visuelles fidèles, pas une conversion mathématique exacte.
 */
export const PDF_COLORS = {
  navy: "#0F172A",
  emerald: "#10B981",
  emeraldLight: "#34D399",
  foreground: "#111827",
  mutedForeground: "#64748B",
  success: "#16A34A",
  destructive: "#DC2626",
  warning: "#F59E0B",
  info: "#3B82F6",
  border: "#E5E7EB",
  muted: "#F1F5F9",
} as const;

/** Palette cyclique pour les barres de catégorie — même esprit que `CATEGORY_CHART_COLORS` (checkpoint 2). */
export const PDF_CATEGORY_COLORS = [
  PDF_COLORS.emerald,
  PDF_COLORS.navy,
  PDF_COLORS.emeraldLight,
  PDF_COLORS.info,
  PDF_COLORS.warning,
  PDF_COLORS.success,
  PDF_COLORS.destructive,
  PDF_COLORS.mutedForeground,
];
