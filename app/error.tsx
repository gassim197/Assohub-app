"use client";

import { RouteError } from "@/components/layout/route-error";

/**
 * Error boundary de toutes les pages hors organisation (connexion,
 * inscription, onboarding, invitations, landing) et filet de sécurité quand
 * le layout d'une organisation échoue lui-même (session ou liste des
 * organisations injoignable). Rendu dans le layout racine : polices,
 * styles et traductions restent disponibles.
 */
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <RouteError error={error} retry={unstable_retry} showHomeLink className="min-h-dvh" />;
}
