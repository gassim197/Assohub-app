import type { NextRequest } from "next/server";

import { requireOrgAccess } from "@/lib/auth/org";
import { getDocumentBlob } from "@/lib/documents/blob";
import { getDocumentById } from "@/lib/documents/queries";

// Le SDK Blob et le flux de lecture ont besoin des API Node — jamais exécutable
// sur l'Edge runtime.
export const runtime = "nodejs";

/** Extension du nom de fichier ORIGINAL (`file_name`), pas de `display_name` (éditable, peut ne plus en avoir une). */
function extractExtension(fileName: string): string {
  const match = /\.[a-zA-Z0-9]+$/.exec(fileName);
  return match ? match[0] : "";
}

/**
 * Unique point d'accès en lecture aux fichiers Documents (checkpoint sécurité
 * validé). Les blobs sont privés : cette route est le seul endroit qui
 * appelle `getDocumentBlob`, après avoir vérifié que l'utilisateur courant
 * appartient bien à l'organisation propriétaire du document — un lien deviné
 * vers le document d'une autre organisation renvoie 404, jamais le fichier.
 *
 * `?preview=1` : sert le fichier en `inline` (miniatures d'images sur la page
 * Documents) avec cache navigateur privé de courte durée. Sans ce paramètre :
 * téléchargement (`attachment`), utilisé par le bouton « Télécharger ».
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; documentId: string }> },
) {
  const { orgSlug, documentId } = await params;
  const { organizationId } = await requireOrgAccess(orgSlug);

  const document = await getDocumentById(organizationId, documentId);
  if (!document) {
    return new Response("Not found", { status: 404 });
  }

  const blob = await getDocumentBlob(document.blobPathname);
  if (!blob || blob.statusCode !== 200) {
    return new Response("Not found", { status: 404 });
  }

  const isPreview = request.nextUrl.searchParams.get("preview") === "1";
  const extension = extractExtension(document.fileName);
  const downloadFileName = `${document.displayName}${extension}`.replace(/"/g, "");

  return new Response(blob.stream, {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `${isPreview ? "inline" : "attachment"}; filename="${downloadFileName}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
