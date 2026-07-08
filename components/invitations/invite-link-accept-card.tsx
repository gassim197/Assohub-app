import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Card centrale de `/join/[token]` (volet 4 de la 4B, checkpoint 1) —
 * pendant de `AcceptInvitationCard` pour le lien partageable : pas de
 * `personalMessage` (aucun inviteur nommé), mais une note sur le mode
 * d'acceptation (auto/manuel) à la place. `primaryAction` est optionnel :
 * absent au checkpoint 1 (lecture seule), rempli au checkpoint 2 (rejoindre).
 */
export function InviteLinkAcceptCard({
  organizationName,
  organizationTypeLabel,
  roleLabelText,
  roleLabel,
  modeNote,
  primaryAction,
}: {
  organizationName: string;
  organizationTypeLabel: string | null;
  roleLabelText: string;
  roleLabel: string;
  modeNote: string;
  primaryAction?: ReactNode;
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

        <p className="w-full rounded-md border-l-3 border-primary bg-muted/50 p-4 text-left text-sm text-muted-foreground">
          {modeNote}
        </p>

        {primaryAction && (
          <div className="flex w-full flex-col gap-2">{primaryAction}</div>
        )}
      </CardContent>
    </Card>
  );
}
