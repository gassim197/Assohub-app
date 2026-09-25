/**
 * Contenu des grappes de fonctionnalités de la landing : ancres, ordre des
 * sous-fonctionnalités, recadrage affiché pour chacune et bulle de bénéfice.
 * Les textes (titres, descriptions, textes alternatifs, bulles) vivent dans
 * `messages/*.json` sous `landing.clusters.<id>.features.<key>`.
 */

export const CLUSTER_IDS = ["membres", "cotisations", "reunions", "documents", "pilotage"] as const;

export type ClusterId = (typeof CLUSTER_IDS)[number];

export interface FeatureImage {
  src: string;
  width: number;
  height: number;
}

/** Icône emerald de la bulle (résolue côté client, cf. `feature-bubble.tsx`). */
export type BubbleIcon =
  | "users"
  | "calendarCheck"
  | "userPlus"
  | "wallet"
  | "send"
  | "badgeCheck"
  | "calendar"
  | "fileCheck"
  | "userCheck"
  | "filter"
  | "link"
  | "trendingUp"
  | "alertCircle"
  | "building";

/**
 * Coin du visuel où la bulle déborde — choisi pour ne pas masquer le
 * chiffre ou le libellé clé du recadrage.
 */
export type BubblePosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface Feature {
  key: string;
  image: FeatureImage;
  bubble: { icon: BubbleIcon; position: BubblePosition };
}

export interface Cluster {
  id: ClusterId;
  /** Affiche le badge `landing.clusters.<id>.badge` à côté du titre. */
  badge?: boolean;
  features: Feature[];
}

/** Recadrages 4:3 produits par `scripts/landing-images.ts` (dimensions natives). */
const CROP_SIZES: Record<string, [number, number]> = {
  "membres-liste": [1512, 1134],
  "membres-fiche": [1304, 978],
  "membres-ajout": [1016, 762],
  "cotisations-vue": [1148, 861],
  "cotisations-relances": [1288, 966],
  "cotisations-moyens": [1020, 765],
  "reunions-liste": [1172, 879],
  "reunions-pv": [620, 465],
  "reunions-presence": [1036, 777],
  "documents-page": [1316, 987],
  "documents-rattachement": [1064, 798],
  rapports: [1220, 915],
  dashboard: [1188, 891],
  "dashboard-switcher": [876, 657],
};

function crop(name: keyof typeof CROP_SIZES): FeatureImage {
  const [width, height] = CROP_SIZES[name]!;
  return { src: `/landing/crops/${name}.png`, width, height };
}

export const CLUSTERS: Cluster[] = [
  {
    id: "membres",
    features: [
      { key: "liste", image: crop("membres-liste"), bubble: { icon: "users", position: "bottom-right" } },
      { key: "fiche", image: crop("membres-fiche"), bubble: { icon: "calendarCheck", position: "top-right" } },
      { key: "ajout", image: crop("membres-ajout"), bubble: { icon: "userPlus", position: "bottom-right" } },
    ],
  },
  {
    id: "cotisations",
    features: [
      { key: "vue", image: crop("cotisations-vue"), bubble: { icon: "wallet", position: "bottom-right" } },
      { key: "relances", image: crop("cotisations-relances"), bubble: { icon: "send", position: "bottom-left" } },
      { key: "moyens", image: crop("cotisations-moyens"), bubble: { icon: "badgeCheck", position: "bottom-right" } },
    ],
  },
  {
    id: "reunions",
    features: [
      { key: "liste", image: crop("reunions-liste"), bubble: { icon: "calendar", position: "bottom-left" } },
      { key: "pv", image: crop("reunions-pv"), bubble: { icon: "fileCheck", position: "bottom-right" } },
      { key: "presence", image: crop("reunions-presence"), bubble: { icon: "userCheck", position: "bottom-right" } },
    ],
  },
  {
    id: "documents",
    badge: true,
    features: [
      { key: "espace", image: crop("documents-page"), bubble: { icon: "filter", position: "bottom-right" } },
      { key: "justificatifs", image: crop("documents-rattachement"), bubble: { icon: "link", position: "top-right" } },
    ],
  },
  {
    id: "pilotage",
    features: [
      { key: "rapports", image: crop("rapports"), bubble: { icon: "trendingUp", position: "bottom-right" } },
      { key: "tableau", image: crop("dashboard"), bubble: { icon: "alertCircle", position: "bottom-left" } },
      { key: "organisations", image: crop("dashboard-switcher"), bubble: { icon: "building", position: "bottom-right" } },
    ],
  },
];
