"use client";

import { RouteError } from "@/components/layout/route-error";

/**
 * Error boundary des pages d'une organisation. Placé dans le segment
 * `[orgSlug]`, il ne remplace que le contenu : le `layout.tsx` du même
 * segment (barre latérale, `DashboardShell`) reste affiché. Une erreur du
 * layout lui-même remonte à `app/error.tsx`.
 */
export default function OrganizationError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <RouteError error={error} retry={unstable_retry} />;
}
