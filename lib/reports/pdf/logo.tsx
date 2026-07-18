import { Circle, Polygon, Svg, Text, View } from "@react-pdf/renderer";

import { PDF_COLORS } from "./colors";

/**
 * Reconstruction vectorielle du logo AssoHub (`components/ui/logo.tsx`,
 * `HubMark`) avec les primitives `Svg`/`Polygon`/`Circle` de
 * `@react-pdf/renderer` — mêmes coordonnées et couleurs que le composant React
 * (schéma `viewBox 0 0 100 100`), rendu 100% vectoriel, sans rasterisation.
 */
export function PdfLogo({ size = 28 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 100 100" width={size} height={size}>
      <Polygon
        points="68,50 59,34.41 41,34.41 32,50 41,65.59 59,65.59"
        fill={PDF_COLORS.navy}
      />
      <Polygon
        points="86,50 68,18.82 32,18.82 14,50 32,81.18 68,81.18"
        stroke={PDF_COLORS.emerald}
        strokeWidth={4}
        fill="none"
      />
      <Circle cx={86} cy={50} r={7.5} fill={PDF_COLORS.emerald} />
      <Circle cx={68} cy={18.82} r={7.5} fill={PDF_COLORS.emerald} />
      <Circle cx={32} cy={18.82} r={7.5} fill={PDF_COLORS.emerald} />
      <Circle cx={14} cy={50} r={7.5} fill={PDF_COLORS.emerald} />
      <Circle cx={32} cy={81.18} r={7.5} fill={PDF_COLORS.emerald} />
      <Circle cx={68} cy={81.18} r={7.5} fill={PDF_COLORS.emerald} />
    </Svg>
  );
}

/** Logo + wordmark "AssoHub", pour l'en-tête du rapport. */
export function PdfBrand({ size = 28 }: { size?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <PdfLogo size={size} />
      <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: PDF_COLORS.navy }}>
        AssoHub
      </Text>
    </View>
  );
}
