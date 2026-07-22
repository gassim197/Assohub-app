import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { db } from "@/lib/db";
import { ensureFounderMember } from "@/lib/members/founder";
import { sendVerificationEmail as sendVerificationEmailViaResend } from "@/lib/email/verification-email";
import { sendResetPasswordEmail } from "@/lib/email/reset-password-email";

const EMAIL_VERIFICATION_EXPIRES_IN_SECONDS = 60 * 60 * 24; // 24h (brief chantier 3)

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  // Dérivé des mêmes variables d'env que baseURL (pas de valeur en dur) :
  // en dev http://localhost:3000, en prod https://assohub-gn.com dès que
  // BETTER_AUTH_URL / NEXT_PUBLIC_BETTER_AUTH_URL y pointent — sans
  // modification de code au déploiement.
  trustedOrigins: [process.env.BETTER_AUTH_URL, process.env.NEXT_PUBLIC_BETTER_AUTH_URL].filter(
    (origin): origin is string => Boolean(origin),
  ),

  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  emailAndPassword: {
    enabled: true,
    // Mode strict (chantier 3) : impossible de se connecter tant que l'email
    // n'est pas vérifié. Les comptes créés via Google sont exemptés
    // nativement (Google atteste déjà l'email, cf. `createOAuthUser`).
    requireEmailVerification: true,
    // Chantier "mot de passe oublié" : envoi du lien de réinitialisation via
    // le même patron d'email que la vérification (`lib/email/reset-password-email.ts`).
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail({ to: user.email, resetUrl: url });
    },
    resetPasswordTokenExpiresIn: 60 * 60, // 1h
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmailViaResend({ to: user.email, verifyUrl: url });
    },
    // `false` (et non `undefined`) : avec `requireEmailVerification: true`,
    // Better-Auth enverrait sinon un email de vérification à CHAQUE
    // `signUpEmail`, y compris les comptes d'invités qu'on marque vérifiés
    // d'office (`lib/invitations/actions.ts::registerAndJoin`) — double
    // vérification absurde pour ces derniers. On déclenche donc l'envoi
    // explicitement nous-mêmes, uniquement là où c'est pertinent (inscription
    // normale, inscription via lien partageable).
    sendOnSignUp: false,
    // Connecte automatiquement l'utilisateur au clic sur le lien de
    // vérification (session posée par Better-Auth avant la redirection vers
    // `callbackURL`) — évite un aller-retour par /login après vérification.
    autoSignInAfterVerification: true,
    expiresIn: EMAIL_VERIFICATION_EXPIRES_IN_SECONDS,
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

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
