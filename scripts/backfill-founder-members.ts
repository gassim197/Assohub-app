/**
 * Backfill — Auto-création rétroactive des fondateurs (schema-design §3.1).
 *
 * Contexte : la règle d'auto-création du fondateur n'existait pas quand les
 * premiers comptes/organisations ont été créés (cf. ADR-0002). Ce script répare
 * ces organisations en créant la ligne `association_members` manquante pour leur
 * fondateur. Il sert aussi de filet de sécurité si le hook
 * `afterCreateOrganization` échoue ponctuellement.
 *
 * Identification du fondateur : le `member` Better-Auth de rôle `owner`. À défaut
 * (donnée ancienne sans rôle owner), le membre le plus ancien de l'organisation.
 *
 * Idempotent : s'appuie sur `ensureFounderMember`, qui ne crée rien si une ligne
 * non supprimée existe déjà. Ne touche jamais une ligne existante (soft delete
 * préservé). Rejouable sans risque.
 *
 * Usage : npm run backfill:founders
 */
import { config } from "dotenv";

// Charger les variables d'env AVANT tout import qui ouvre la connexion DB
// (lib/db lit process.env.DATABASE_URL à l'évaluation du module).
config({ path: ".env.local" });

async function main() {
  const { db } = await import("@/lib/db");
  const { member, organization, user } = await import("@/lib/db/auth-schema");
  const { ensureFounderMember } = await import("@/lib/members/founder");
  const { asc, eq } = await import("drizzle-orm");

  const orgs = await db
    .select({ id: organization.id, name: organization.name })
    .from(organization);

  console.log(`Organisations trouvées : ${orgs.length}\n`);

  let created = 0;
  let skipped = 0;
  let noFounder = 0;

  for (const org of orgs) {
    // Membres de l'org, du plus ancien au plus récent, avec leur compte user.
    const members = await db
      .select({
        userId: member.userId,
        role: member.role,
        name: user.name,
        email: user.email,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, org.id))
      .orderBy(asc(member.createdAt));

    const founder = members.find((m) => m.role === "owner") ?? members[0];

    if (!founder) {
      console.log(`⚠️  ${org.name} (${org.id}) — aucun membre, ignorée`);
      noFounder++;
      continue;
    }

    const result = await ensureFounderMember({
      organizationId: org.id,
      user: { id: founder.userId, name: founder.name, email: founder.email },
    });

    if (result === "created") {
      console.log(`✅ ${org.name} — fondateur créé (${founder.email})`);
      created++;
    } else {
      console.log(`➖ ${org.name} — déjà présent (${founder.email})`);
      skipped++;
    }
  }

  console.log(
    `\nTerminé. Créés : ${created} · Déjà présents : ${skipped} · Sans membre : ${noFounder}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Échec du backfill :", err);
    process.exit(1);
  });
