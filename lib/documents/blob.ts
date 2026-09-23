import { del, get, put, type GetBlobResult } from "@vercel/blob";

/**
 * Fine mince au-dessus de `@vercel/blob`, isolée pour que le reste du module
 * Documents ne dépende jamais directement du SDK.
 *
 * Sécurité multi-tenant (checkpoint validé) : tous les blobs sont créés en
 * `access: 'private'` — l'URL renvoyée par Vercel Blob n'est PAS servable
 * telle quelle à un navigateur, elle exige une authentification côté SDK à
 * chaque lecture. Le seul point d'accès en lecture de l'application est la
 * route `app/(dashboard)/[orgSlug]/documents/[documentId]/download`, qui
 * vérifie d'abord l'appartenance de l'utilisateur à l'organisation
 * propriétaire du document avant d'appeler `getDocumentBlob`.
 *
 * Authentification du SDK : aucun `token` n'est jamais passé explicitement
 * ici. `@vercel/blob` résout automatiquement, dans cet ordre,
 * `process.env.VERCEL_OIDC_TOKEN` (jeton OIDC fourni nativement par la
 * plateforme Vercel en Production/Preview) puis `process.env.BLOB_READ_WRITE_TOKEN`
 * (nécessaire en local, où l'OIDC n'existe pas) — donc ce fichier fonctionne
 * sans changement dans les deux environnements.
 */

/** Caractères hors [a-zA-Z0-9._-] remplacés par `_`, pour un pathname Blob sûr. */
function sanitizeFileNameForPathname(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export interface UploadedDocumentBlob {
  url: string;
  pathname: string;
}

/**
 * Envoie le contenu d'un document vers Vercel Blob, sous
 * `documents/{organizationId}/{documentId}-{fileName}`. `addRandomSuffix`
 * (comportement par défaut du SDK) évite toute collision de pathname.
 */
export async function uploadDocumentBlob({
  organizationId,
  documentId,
  fileName,
  content,
  mimeType,
}: {
  organizationId: string;
  documentId: string;
  fileName: string;
  content: Buffer;
  mimeType: string;
}): Promise<UploadedDocumentBlob> {
  const pathname = `documents/${organizationId}/${documentId}-${sanitizeFileNameForPathname(fileName)}`;

  const result = await put(pathname, content, {
    access: "private",
    contentType: mimeType,
  });

  return { url: result.url, pathname: result.pathname };
}

/**
 * Récupère le contenu d'un blob privé pour le proxyer côté serveur (route de
 * téléchargement/aperçu). Renvoie `null` si le blob n'existe plus (fichier
 * déjà supprimé côté Blob mais ligne DB non nettoyée, incohérence tolérée).
 */
export async function getDocumentBlob(pathname: string): Promise<GetBlobResult | null> {
  return get(pathname, { access: "private" });
}

/**
 * Supprime un blob. Ne lève jamais — un échec de suppression Blob (réseau,
 * blob déjà absent) est renvoyé comme `{ ok: false }` plutôt que de bloquer
 * la suppression de la ligne `documents` correspondante (règle métier §5 :
 * gérer explicitement l'échec, pas planter dessus).
 */
export async function deleteDocumentBlob(pathname: string): Promise<{ ok: boolean }> {
  try {
    await del(pathname);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

const DELETE_BATCH_SIZE = 500;

/**
 * Supprime plusieurs blobs (purge à la suppression d'une organisation), par
 * lots de {@link DELETE_BATCH_SIZE} — l'API Blob n'est pas garantie d'accepter
 * un nombre illimité de pathnames en une seule requête. Même politique de
 * tolérance aux échecs que `deleteDocumentBlob` : un lot en échec n'empêche
 * pas les suivants.
 */
export async function deleteDocumentBlobs(pathnames: string[]): Promise<{ ok: boolean }> {
  if (pathnames.length === 0) return { ok: true };

  let allOk = true;
  for (let i = 0; i < pathnames.length; i += DELETE_BATCH_SIZE) {
    const batch = pathnames.slice(i, i + DELETE_BATCH_SIZE);
    try {
      await del(batch);
    } catch {
      allOk = false;
    }
  }
  return { ok: allOk };
}
