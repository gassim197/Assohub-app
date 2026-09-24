/**
 * Contenu des grappes de fonctionnalités de la landing : ancres, ordre des
 * sous-fonctionnalités et captures associées. Les textes (titres,
 * descriptions, textes alternatifs) vivent dans `messages/*.json` sous
 * `landing.clusters.<id>.features.<key>`.
 */

export const CLUSTER_IDS = ["membres", "cotisations", "reunions", "documents", "pilotage"] as const;

export type ClusterId = (typeof CLUSTER_IDS)[number];

export interface FeatureImage {
  src: string;
  width: number;
  height: number;
}

export interface Feature {
  key: string;
  image: FeatureImage;
}

export interface Cluster {
  id: ClusterId;
  /** Affiche le badge `landing.clusters.<id>.badge` à côté du titre. */
  badge?: boolean;
  features: Feature[];
}

/** Capture plein écran de l'application (2880 × 1800, 16:10). */
function screen(name: string): FeatureImage {
  return { src: `/landing/${name}.png`, width: 2880, height: 1800 };
}

export const CLUSTERS: Cluster[] = [
  {
    id: "membres",
    features: [
      { key: "liste", image: screen("membres-liste") },
      { key: "fiche", image: screen("membres-fiche") },
      { key: "ajout", image: screen("membres-ajout") },
    ],
  },
  {
    id: "cotisations",
    features: [
      { key: "vue", image: screen("cotisations-vue") },
      { key: "relances", image: screen("cotisations-relances") },
      { key: "moyens", image: screen("cotisations-moyens") },
    ],
  },
  {
    id: "reunions",
    features: [
      { key: "liste", image: screen("reunions-liste") },
      { key: "pv", image: screen("reunions-pv") },
      // Recadrage 16:10 de reunions-pv.png (scripts/landing-images.ts).
      { key: "presence", image: { src: "/landing/reunions-presence.png", width: 1600, height: 1000 } },
    ],
  },
  {
    id: "documents",
    badge: true,
    features: [
      { key: "espace", image: screen("documents-page") },
      { key: "justificatifs", image: screen("documents-rattachement") },
    ],
  },
  {
    id: "pilotage",
    features: [
      { key: "rapports", image: screen("rapports") },
      { key: "tableau", image: screen("dashboard") },
      { key: "organisations", image: screen("dashboard-switcher") },
    ],
  },
];
