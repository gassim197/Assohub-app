import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Card centrale du cas nominal de `/invitations/accept/[token]` (volet 2 de
 * la 4B) : identité de l'organisation, rôle proposé, message personnel
 * éventuel (même traitement visuel que le template email — barre latérale
 * emerald, cf. `lib/email/invitation-email.ts`).
 *
 * `primaryAction`/`secondaryAction` sont des slots (pas un simple
 * `{label,href}`) : la page décide s'il s'agit d'un lien (inscription/
 * connexion) ou d'un bouton d'action (rejoindre, refuser) selon l'état de
 * session détecté (checkpoint 3a/3b).
 */
export function AcceptInvitationCard({
  organizationName,
  organizationTypeLabel,
  roleLabelText,
  roleLabel,
  personalMessage,
  primaryAction,
  secondaryAction,
}: {
  organizationName: string;
  organizationTypeLabel: string | null;
  roleLabelText: string;
  roleLabel: string;
  personalMessage: string | null;
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-6 py-8 text-center">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            {organizationName}
          </h2>
          {organizationTypeLabel && (
            <Badge variant="secondary">{organizationTypeLabel}</Badge>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {roleLabelText}
          </p>
          <Badge>{roleLabel}</Badge>
        </div>

        {personalMessage && (
          <p className="w-full rounded-md border-l-3 border-primary bg-muted/50 p-4 text-left text-sm text-muted-foreground italic">
            {personalMessage}
          </p>
        )}

        <div className="flex w-full flex-col gap-2">
          {primaryAction}
          {secondaryAction}
        </div>
      </CardContent>
    </Card>
  );
}
