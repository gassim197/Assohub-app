import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { LandingPage } from "@/components/landing/landing-page";

export default async function RootPage() {
  // `null` = pas de session, pas d'erreur → landing publique (pas de
  // redirection). `redirect()` reste appelé HORS du try/catch ci-dessous :
  // il lève une exception interne Next.js (`NEXT_REDIRECT`) qu'un `catch`
  // générique attraperait sinon par erreur, cassant la redirection.
  let target: string | null = "/login";

  try {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });

    if (session) {
      const orgs = await auth.api.listOrganizations({ headers: requestHeaders });

      const [firstOrg] = orgs;
      if (!firstOrg) {
        target = "/onboarding";
      } else {
        const activeId = session.session.activeOrganizationId;
        const active = activeId ? orgs.find((o) => o.id === activeId) : null;
        target = `/${(active ?? firstOrg).slug}`;
      }
    } else {
      target = null;
    }
  } catch {
    target = "/login";
  }

  if (target) {
    redirect(target);
  }

  return <LandingPage />;
}
