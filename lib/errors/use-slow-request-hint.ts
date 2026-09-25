"use client";

import { useEffect, useState } from "react";

/** Délai au-delà duquel une requête est signalée comme lente. */
export const SLOW_REQUEST_DELAY_MS = 4000;

/**
 * Vrai quand `pending` est resté vrai plus de {@link SLOW_REQUEST_DELAY_MS} :
 * le formulaire affiche alors « La connexion est lente, merci de patienter… »
 * sous son bouton, pour qu'une connexion lente ne passe pas pour un blocage.
 */
export function useSlowRequestHint(pending: boolean): boolean {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setSlow(true), SLOW_REQUEST_DELAY_MS);
    // Remise à zéro à la fin de la requête (le nettoyage s'exécute quand
    // `pending` repasse à faux), pour que l'envoi suivant reparte de zéro.
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [pending]);

  return pending && slow;
}
