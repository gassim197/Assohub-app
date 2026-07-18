import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getUserOrganizations } from "@/lib/organizations/queries";
import { OnboardingForm } from "@/components/organizations/onboarding-form";

/**
 * Page de création d'organisation — sert à la fois le tout premier
 * onboarding (inscription) et une création "secondaire" depuis le switcher
 * d'organisations (session 8B). `cancelHref` n'est calculé (et l'échappatoire
 * "Annuler" affichée) que si l'utilisateur a déjà au moins une organisation :
 * un tout nouveau compte n'a nulle part où revenir tant qu'aucune
 * organisation n'existe.
 */
export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const organizations = await getUserOrganizations(session.user.id);

  let cancelHref: string | undefined;
  if (organizations.length > 0) {
    const activeId = session.session.activeOrganizationId;
    const active = activeId ? organizations.find((org) => org.id === activeId) : null;
    const target = active ?? organizations[0]!;
    cancelHref = `/${target.slug}`;
  }

  return <OnboardingForm cancelHref={cancelHref} />;
}
