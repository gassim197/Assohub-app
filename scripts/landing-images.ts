/**
 * Génère une fois pour toutes les images dérivées de la landing à partir des
 * captures sources de `public/landing/` (résultats commités, aucune
 * conversion à l'exécution) :
 *
 * - `crops/*.png` : un recadrage 4:3 par sous-fonctionnalité (visuels des
 *   grappes en accordéon), à la résolution native — jamais agrandi ici,
 *   c'est l'affichage qui zoome sur la zone utile ;
 * - `reunions-presence.png` : recadrage 16:10 centré sur le bloc « Présence »
 *   de `reunions-pv.png` (ancienne mise en page, retiré avec elle) ;
 * - `og-image.png` : image Open Graph 1200 × 630 tirée de `dashboard.png`.
 *
 * À relancer si une capture source est refaite :
 *   npx tsx scripts/landing-images.ts
 */
import { mkdirSync } from "node:fs";
import path from "node:path";

import sharp from "sharp";

const DIR = path.join(process.cwd(), "public", "landing");
const CROPS_DIR = path.join(DIR, "crops");

/**
 * Recadrages 4:3 (coordonnées dans les captures sources, 2880 × 1800).
 *
 * Règles : aucun texte coupé sur un bord ; largeur ≤ ~1 500 px pour que le
 * texte reste lisible (≥ 10 px) une fois le visuel affiché sur ~600 px ;
 * chaque chiffre repris dans une bulle doit être visible dans le recadrage.
 */
const CROPS: { name: string; source: string; left: number; top: number; width: number }[] = [
  // Cartes « Total des membres 46 » / « Membres actifs 42 », colonnes Nom, Téléphone, Rôle.
  { name: "membres-liste", source: "membres-liste", left: 482, top: 425, width: 1512 },
  // En-tête, Coordonnées, Adhésion (« Date d'adhésion 11 mars 2023 »).
  { name: "membres-fiche", source: "membres-fiche", left: 495, top: 230, width: 1304 },
  // Haut du dialog « Nouveau membre », cadré à l'intérieur du dialog (x 930→1949) :
  // le texte flouté de l'arrière-plan serait coupé sur les bords.
  // Commence sous les coins arrondis du haut (y 171) pour n'avoir que du blanc aux bords.
  { name: "membres-ajout", source: "membres-ajout", left: 932, top: 191, width: 1016 },
  // Onglets, cartes « Total collecté ce mois » et « Restant à percevoir ».
  // S'arrête avant la colonne « Période » (x 1630).
  { name: "cotisations-vue", source: "cotisations-vue", left: 475, top: 115, width: 1148 },
  // Bouton « Relancer tous les retardataires (24) » + colonnes Montant → Dernier rappel.
  { name: "cotisations-relances", source: "cotisations-relances", left: 1555, top: 418, width: 1288 },
  // Montant à encaisser + liste des moyens de paiement ouverte.
  // Cadré à l'intérieur du dialog (x 930→1949, y 279→1521), comme membres-ajout.
  { name: "cotisations-moyens", source: "cotisations-moyens", left: 930, top: 740, width: 1020 },
  // Carte « Prochaine réunion » + calendrier.
  { name: "reunions-liste", source: "reunions-liste", left: 1685, top: 320, width: 1172 },
  // Procès-verbal : en-tête, badge « Publié », ordre du jour (avant les décisions).
  { name: "reunions-pv", source: "reunions-pv", left: 475, top: 979, width: 620 },
  // Bloc Présence (« 38 présents sur 42 membres actifs ») puis début du PV.
  { name: "reunions-presence", source: "reunions-pv", left: 475, top: 659, width: 1036 },
  // Jauge de stockage, pastilles de catégorie, premières lignes.
  { name: "documents-page", source: "documents-page", left: 482, top: 144, width: 1316 },
  // Les six reçus, chacun « Lié au paiement du … ».
  { name: "documents-rattachement", source: "documents-rattachement", left: 497, top: 497, width: 1064 },
  // Cartes Revenus / Dépenses + graphique mensuel et sa légende.
  // S'arrête avant « Répartition par catégorie » (x 1690).
  { name: "rapports", source: "rapports", left: 464, top: 533, width: 1220 },
  // Cartes « Membres actifs » et « À percevoir / 24 retardataires », prochaine réunion.
  // Commence sous les actions rapides : le 4e bouton serait coupé à droite.
  { name: "dashboard", source: "dashboard", left: 475, top: 392, width: 1188 },
  // Barre latérale, menu des organisations ouvert. Largeur calée entre la fin de
  // « Bonjour Mariama » (x 868) et le texte du bouton « Enregistrer… » (x 881) ; commence
  // sous le logo (y 112) pour que le menu entier, jusqu'à « Documents », tienne en hauteur.
  { name: "dashboard-switcher", source: "dashboard-switcher", left: 0, top: 112, width: 876 },
];

/**
 * Coordonnées dans `reunions-pv.png` (2880 × 1800). Le bloc « Présence »
 * occupe environ x 495→2038, y 655→929 ; la fenêtre 16:10 (1600 × 1000)
 * est centrée dessus horizontalement, et calée verticalement entre le titre
 * de la réunion et une interligne du procès-verbal (aucun texte coupé).
 */
const PRESENCE_CROP = { left: 467, top: 334, width: 1600, height: 1000 };

async function main() {
  mkdirSync(CROPS_DIR, { recursive: true });
  for (const crop of CROPS) {
    const height = (crop.width * 3) / 4;
    if (!Number.isInteger(height)) throw new Error(`${crop.name} : largeur non multiple de 4 (${crop.width}).`);
    await sharp(path.join(DIR, `${crop.source}.png`))
      .extract({ left: crop.left, top: crop.top, width: crop.width, height })
      .png({ compressionLevel: 9 })
      .toFile(path.join(CROPS_DIR, `${crop.name}.png`));
  }

  await sharp(path.join(DIR, "reunions-pv.png"))
    .extract(PRESENCE_CROP)
    .png({ compressionLevel: 9 })
    .toFile(path.join(DIR, "reunions-presence.png"));

  await sharp(path.join(DIR, "dashboard.png"))
    .resize(1200, 630, { fit: "cover", position: "top" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(DIR, "og-image.png"));

  console.log(`${CROPS.length} recadrages dans public/landing/crops/, reunions-presence.png et og-image.png générés.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
