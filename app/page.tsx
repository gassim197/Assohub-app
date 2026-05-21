import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export default async function RootPage() {
  let target = "/login";

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
    }
  } catch {
    target = "/login";
  }

  redirect(target);
}
