import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { db } from "@/lib/db";

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
    }),
  ],

  // V1.1 : magic link + OAuth Google (non activés)
  // socialProviders: { google: { clientId: "", clientSecret: "" } },
});

export type Session = typeof auth.$Infer.Session;
