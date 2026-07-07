import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * État dédié pour chaque cas d'erreur de `/invitations/accept/[token]`
 * (token invalide, expiré, déjà résolu, organisation introuvable) — jamais un
 * 404 générique (brief volet 2 de la 4B).
 */
export function InvitationErrorState({
  title,
  description,
  cta,
}: {
  title: string;
  description: string;
  cta?: { label: string; href: string };
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <AlertCircle className="size-6" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {cta && (
          <Button render={<Link href={cta.href} />}>{cta.label}</Button>
        )}
      </CardContent>
    </Card>
  );
}
