/**
 * Génère une fois pour toutes les images dérivées de la landing à partir des
 * captures sources de `public/landing/` (résultats commités, aucune
 * conversion à l'exécution) :
 *
 * - `reunions-presence.png` : recadrage 16:10 centré sur le bloc « Présence »
 *   de `reunions-pv.png` (résolution native, sans agrandissement) ;
 * - `og-image.png` : image Open Graph 1200 × 630 tirée de `dashboard.png`.
 *
 * À relancer si une capture source est refaite :
 *   npx tsx scripts/landing-images.ts
 */
import path from "node:path";

import sharp from "sharp";

const DIR = path.join(process.cwd(), "public", "landing");

/**
 * Coordonnées dans `reunions-pv.png` (2880 × 1800). Le bloc « Présence »
 * occupe environ x 495→2038, y 655→929 ; la fenêtre 16:10 (1600 × 1000)
 * est centrée dessus horizontalement, et calée verticalement entre le titre
 * de la réunion et une interligne du procès-verbal (aucun texte coupé).
 */
const PRESENCE_CROP = { left: 467, top: 334, width: 1600, height: 1000 };

async function main() {
  await sharp(path.join(DIR, "reunions-pv.png"))
    .extract(PRESENCE_CROP)
    .png({ compressionLevel: 9 })
    .toFile(path.join(DIR, "reunions-presence.png"));

  await sharp(path.join(DIR, "dashboard.png"))
    .resize(1200, 630, { fit: "cover", position: "top" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(DIR, "og-image.png"));

  console.log("reunions-presence.png et og-image.png générés dans public/landing/");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
