import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Card centrale du cas nominal de `/invitations/accept/[token]` (volet 2 de
 * la 4B) : identité de l'organisation, rôle proposé, message personnel
 * éventuel (même traitement visuel que le template email — barre latérale
 * emerald, cf. `lib/email/invitation-email.ts`), puis le CTA détecté par la
 * page (inscription ou connexion selon qu'un compte existe déjà).
 */
export function AcceptInvitationCard({
  organizationName,
  organizationTypeLabel,
  roleLabelText,
  roleLabel,
  personalMessage,
  primaryCta,
}: {
  organizationName: string;
  organizationTypeLabel: string | null;
  roleLabelText: string;
  roleLabel: string;
  personalMessage: string | null;
  primaryCta: { label: string; href: string };
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

        <Button className="w-full" render={<Link href={primaryCta.href} />}>
          {primaryCta.label}
        </Button>
      </CardContent>
    </Card>
  );
}
