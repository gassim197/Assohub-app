import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { db } from "@/lib/db";
import { ensureFounderMember } from "@/lib/members/founder";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,

  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // V1 : pas de vérification email obligatoire
  },

  plugins: [
    organization({
      // Un utilisateur peut créer des organisations librement en V1
      allowUserToCreateOrganization: true,

      organizationHooks: {
        // Auto-création du fondateur (schema-design §3.1 / §10.3).
        // Se déclenche quel que soit le point d'entrée (onboarding, future
        // Server Action, flux d'invitation). Le hook s'exécute après le commit
        // de l'organisation : ce n'est donc pas une transaction SQL stricte
        // (neon-http ne supporte pas les transactions interactives), mais
        // l'insert est idempotent et le script de backfill sert de filet.
        afterCreateOrganization: async ({ organization, user }) => {
          await ensureFounderMember({
            organizationId: organization.id,
            user: { id: user.id, name: user.name, email: user.email },
          });
        },
      },
    }),
    // Doit rester le DERNIER plugin : transfère automatiquement le
    // Set-Cookie de session vers `next/headers` cookies() quand un
    // `auth.api.*` (ex. `signUpEmail`) est appelé depuis une Server Action —
    // condition de la connexion automatique après inscription (volet 2, 4B).
    nextCookies(),
  ],

  // V1.1 : magic link + OAuth Google (non activés)
  // socialProviders: { google: { clientId: "", clientSecret: "" } },
});

export type Session = typeof auth.$Infer.Session;
