import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import {
  findUserIdByEmail,
  getInvitationByToken,
} from "@/lib/invitations/queries";
import { resolveAcceptPageState } from "@/lib/invitations/constants";
import { RegisterInviteeForm } from "@/components/invitations/register-invitee-form";

/**
 * Formulaire d'inscription d'un nouvel invité (volet 2 de la 4B, checkpoint
 * 2). Toujours re-vérifié côté serveur : si l'invitation n'est plus "pending"
 * (expirée/acceptée/refusée/organisation supprimée/token inconnu) OU qu'un
 * compte existe désormais pour cet email (course avec le CTA affiché sur la
 * page parente), on renvoie vers `/invitations/accept/[token]` qui sait
 * afficher l'état exact — pas de logique d'erreur dupliquée ici.
 */
export default async function RegisterInviteePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const data = await getInvitationByToken(token);
  const state = resolveAcceptPageState(data);

  if (state !== "pending") {
    redirect(`/invitations/accept/${token}`);
  }

  const { invitation, organization } = data!;

  const existingUserId = await findUserIdByEmail(invitation.email);
  if (existingUserId) {
    redirect(`/invitations/accept/${token}`);
  }

  const t = await getTranslations("invitations.accept.register");

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle", { orgName: organization!.name })}
        </p>
      </div>

      <RegisterInviteeForm
        token={token}
        email={invitation.email}
        defaultFullName={invitation.fullName}
      />
    </div>
  );
}
