import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { canManageDocuments } from "@/lib/documents/permissions";
import { listDocumentsForMeeting, listUnattachedDocuments } from "@/lib/documents/queries";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentThumbnail } from "@/components/documents/document-thumbnail";
import { MeetingDocumentsList } from "./meeting-documents-list";

/**
 * Section « Documents » de la fiche réunion (PV signé ou tout document lié) —
 * Server Component autonome, même patron que `MeetingMinutesSection` : charge
 * ses propres données, une seule `<section>` ajoutée à la page parente,
 * aucune autre page existante n'est alourdie.
 */
export async function MeetingDocumentsSection({
  orgSlug,
  organizationId,
  userId,
  meetingId,
}: {
  orgSlug: string;
  organizationId: string;
  userId: string;
  meetingId: string;
}) {
  const [t, canManage, attached] = await Promise.all([
    getTranslations("documents.meetingSection"),
    canManageDocuments(organizationId, userId),
    listDocumentsForMeeting(organizationId, meetingId),
  ]);

  // Chargée seulement pour construire le sélecteur « existant » ; inutile
  // pour un membre qui ne peut de toute façon pas attacher de document.
  const unattached = canManage ? await listUnattachedDocuments(organizationId) : [];

  if (attached.length === 0 && !canManage) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        {attached.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="space-y-2">
            {attached.map((document) => (
              <li key={document.id} className="flex items-center gap-3">
                <DocumentThumbnail
                  orgSlug={orgSlug}
                  documentId={document.id}
                  mimeType={document.mimeType}
                  displayName={document.displayName}
                />
                <Link
                  href={`/${orgSlug}/documents/${document.id}/download`}
                  className="truncate text-sm font-medium text-foreground underline-offset-2 hover:text-primary hover:underline"
                >
                  {document.displayName}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {canManage ? (
          <MeetingDocumentsList
            orgSlug={orgSlug}
            meetingId={meetingId}
            existingDocuments={unattached}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
