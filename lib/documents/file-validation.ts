import { fileTypeFromBuffer } from "file-type";
import { ACCEPTED_MIME_TYPES, type AcceptedMimeType, isAcceptedMimeType } from "./constants";

/**
 * Détection du type RÉEL d'un fichier par signature d'octets (magic bytes),
 * jamais par extension ou par `File.type` déclaré par le navigateur — décision
 * de sécurité explicite du chantier Documents (renommer un exécutable en
 * `.pdf` ne doit pas suffire à le faire accepter).
 *
 * `file-type` sait distinguer précisément PDF/PNG/JPEG et, en inspectant le
 * contenu du zip, les formats OOXML modernes (`.docx`/`.xlsx`) de tout autre
 * zip. Les anciens formats Office (`.doc`/`.xls`, conteneur OLE CFB) ne
 * portent en revanche aucune signature permettant de distinguer Word d'Excel
 * sans parser les flux internes — `file-type` renvoie alors le type générique
 * `application/x-cfb`. Dans ce seul cas, on complète par l'extension déclarée
 * pour retrouver le type MIME précis : ça ne protège pas contre un `.doc`
 * habilement renommé en `.xls` (les deux sont un CFB valide), mais bloque
 * structurellement tout fichier qui n'est pas un vrai conteneur OLE/zip/PDF/
 * image — l'essentiel de la surface d'attaque visée.
 */
export async function detectAcceptedMimeType(
  buffer: Buffer,
  declaredFileName: string,
): Promise<AcceptedMimeType | null> {
  const detected = await fileTypeFromBuffer(buffer);

  if (detected && isAcceptedMimeType(detected.mime)) {
    return detected.mime;
  }

  if (detected?.mime === "application/x-cfb") {
    const lowerName = declaredFileName.toLowerCase();
    if (lowerName.endsWith(".doc")) return "application/msword";
    if (lowerName.endsWith(".xls")) return "application/vnd.ms-excel";
  }

  return null;
}

export { ACCEPTED_MIME_TYPES };
