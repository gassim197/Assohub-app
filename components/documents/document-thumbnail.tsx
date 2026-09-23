import { FileSpreadsheet, FileText, File as FileIcon } from "lucide-react";

/**
 * Aperçu miniature : les images sont proxyées via la route de téléchargement
 * en mode `?preview=1` (le blob est privé, jamais d'URL Blob directe dans le
 * HTML — cf. sécurité §2 du plan). Les PDF et fichiers bureautiques affichent
 * l'icône de leur type, pas de génération de miniature pour eux en V1.
 */
export function DocumentThumbnail({
  orgSlug,
  documentId,
  mimeType,
  displayName,
}: {
  orgSlug: string;
  documentId: string;
  mimeType: string;
  displayName: string;
}) {
  if (mimeType.startsWith("image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- image privée servie par notre route, pas par le CDN next/image
      <img
        src={`/${orgSlug}/documents/${documentId}/download?preview=1`}
        alt={displayName}
        className="size-9 shrink-0 rounded-md border border-border object-cover"
      />
    );
  }

  const Icon =
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ? FileSpreadsheet
      : mimeType === "application/pdf" ||
          mimeType === "application/msword" ||
          mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ? FileText
        : FileIcon;

  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
      <Icon className="size-4" />
    </div>
  );
}
