/**
 * Réinitialisation manuelle du mot de passe d'un compte, en environnement de
 * développement local uniquement.
 *
 * Contexte : outil de secours si le flux "mot de passe oublié" n'est pas
 * disponible (V1, pas encore implémenté) et qu'un compte de dev est bloqué.
 * Écrit directement le hash dans `account.password` (provider "credential"),
 * via le même hachage que Better-Auth (`better-auth/crypto`).
 *
 * Usage : npx tsx scripts/reset-dev-password.ts <email> <nouveauMotDePasse>
 *
 * À exécuter dans TON PROPRE terminal (pas via un assistant) pour que le
 * mot de passe en clair ne transite par aucun autre canal.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const [email, newPassword] = process.argv.slice(2);

  if (!email || !newPassword) {
    console.error("Usage : npx tsx scripts/reset-dev-password.ts <email> <nouveauMotDePasse>");
    process.exit(1);
  }
  if (newPassword.length < 8) {
    console.error("Le mot de passe doit comporter au moins 8 caractères.");
    process.exit(1);
  }

  const { db } = await import("@/lib/db");
  const { account, user } = await import("@/lib/db/auth-schema");
  const { hashPassword } = await import("better-auth/crypto");
  const { eq, and } = await import("drizzle-orm");

  const [existingUser] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (!existingUser) {
    console.error(`Aucun compte trouvé pour ${email}`);
    process.exit(1);
  }

  const hash = await hashPassword(newPassword);

  const updated = await db
    .update(account)
    .set({ password: hash })
    .where(
      and(eq(account.userId, existingUser.id), eq(account.providerId, "credential")),
    )
    .returning({ id: account.id });

  if (updated.length === 0) {
    console.error(
      `Aucun compte "credential" (email/mot de passe) trouvé pour ${email}. ` +
        "Le compte utilise peut-être un autre provider.",
    );
    process.exit(1);
  }

  console.log(`✅ Mot de passe réinitialisé pour ${email}.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Échec de la réinitialisation :", err);
    process.exit(1);
  });
