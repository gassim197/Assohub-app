/**
 * Seed de démonstration — REFEM + Amicale des Anciens du Lycée de Donka.
 *
 * Peuple la base de DEV avec des données métier réalistes pour les captures
 * d'écran de la landing et de la vidéo. Les deux organisations et le compte
 * propriétaire existent déjà (créés via l'interface) : ce script n'écrit QUE
 * dans les tables métier, jamais dans `user`, `account`, `session`, `member`,
 * `organization` ni `.env.local`.
 *
 * Cohérence avec `scripts/demo-files/` (manifest.json, rapport financier S1,
 * PV) : dates et types des réunions, présences des PV, paiements rattachés aux
 * reçus P01–P05, totaux mensuels encaissés et effectifs redevables du xlsx.
 * Ces contraintes sont vérifiées par des assertions avant toute écriture.
 *
 * Génération paresseuse des cotisations (lib/cotisations/generation.ts) :
 * l'application ne crée que la période courante, pour les membres `actif`
 * avec `joined_at <= period_start`. Le seed insère janvier → septembre 2026
 * selon exactement la même règle (appliquée à l'état du membre au 1er du
 * mois) : l'app n'a donc rien à générer en plus pour septembre (index unique
 * + ON CONFLICT DO NOTHING côté app). Les statuts sont calculés en fin de
 * batch par le même CASE SQL que `recalculateCotisationStatement`.
 *
 * Aléatoire déterministe (mulberry32, graines fixes, date de référence figée
 * au 2026-09-23) : contenu identique à chaque exécution — seuls les
 * identifiants cuid2 diffèrent.
 *
 * Écritures : un seul `db.batch()` par organisation (BEGIN…COMMIT côté Neon
 * HTTP) — reset éventuel + seed, tout ou rien. Jamais `db.transaction()`
 * (non supporté par neon-http, cf. ADR-0002).
 *
 * Usage :
 *   npm run seed:demo              → refuse si l'org contient déjà des données
 *   npm run seed:demo -- --reset   → supprime les données métier des deux orgs puis re-seed
 */
import { config } from "dotenv";

import type { BatchItem } from "drizzle-orm/batch";

import { formatPeriodLabel } from "@/lib/cotisations/period";
import type { CotisationFrequency } from "@/lib/cotisations/constants";
import type { PaymentMethod } from "@/lib/cotisations/payment-constants";
import type { MemberRole, MemberStatus } from "@/lib/members/constants";
import { newId } from "@/lib/db/id";
import type { associationMembers } from "@/lib/db/members-schema";
import type {
  cotisationTypes,
  cotisations,
  paymentReminders,
  payments,
} from "@/lib/db/cotisations-schema";
import type { transactions } from "@/lib/db/transactions-schema";
import type {
  meetingAttendance,
  meetings,
  minutes,
} from "@/lib/db/meetings-schema";

// Charger les variables d'env AVANT tout import qui ouvre la connexion DB
// (lib/db lit process.env.DATABASE_URL à l'évaluation du module) — lecture
// seule, le fichier n'est jamais modifié.
config({ path: ".env.local" });

// ─── Garde-fou base de données ────────────────────────────────────────────────
// Liste blanche stricte : seul l'endpoint Neon de DEV est accepté. Tout autre
// hôte (dont la prod « assohub-production ») est refusé. Le suffixe `-pooler`
// (connexion poolée) désigne le même endpoint.

const DEV_ENDPOINT_ID = "ep-shiny-dust-ap8d92cg";

function assertDevDatabase(): void {
  const refuse = (reason: string): never => {
    console.error(`⛔ Seed refusé : ${reason}`);
    process.exit(1);
  };

  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    refuse("environnement de production détecté (VERCEL_ENV / NODE_ENV).");
  }

  const url = process.env.DATABASE_URL;
  if (!url) refuse("DATABASE_URL absente.");

  let hostname: string;
  try {
    hostname = new URL(url as string).hostname;
  } catch {
    return refuse("DATABASE_URL illisible.");
  }

  const endpointId = (hostname.split(".")[0] ?? "").replace(/-pooler$/, "");
  if (endpointId !== DEV_ENDPOINT_ID) {
    refuse(
      `l'hôte « ${hostname} » n'est pas l'endpoint de DEV autorisé (${DEV_ENDPOINT_ID}).`,
    );
  }
}

assertDevDatabase();

// ─── Constantes ───────────────────────────────────────────────────────────────

const REFEM_ORG_ID = "jJa2koAiDuZYaYSB6CnxvpfUDXLffzXa";
const DONKA_ORG_ID = "0wKRJqQqH6290EhFT14da22WluUnRyCL";

/** Date de référence figée : aucun paiement ni RSVP postérieur. */
const REFERENCE_DATE = "2026-09-23";

const REFEM_SEED = 20260917;
const DONKA_SEED = 20260704;

/** GNF → centimes (schema-design §1.4). */
const gnf = (amount: number) => amount * 100;

type MemberInsert = typeof associationMembers.$inferInsert;
type CotisationTypeInsert = typeof cotisationTypes.$inferInsert;
type CotisationInsert = typeof cotisations.$inferInsert;
type PaymentInsert = typeof payments.$inferInsert;
type TransactionInsert = typeof transactions.$inferInsert;
type ReminderInsert = typeof paymentReminders.$inferInsert;
type MeetingInsert = typeof meetings.$inferInsert;
type AttendanceInsert = typeof meetingAttendance.$inferInsert;
type MinutesInsert = typeof minutes.$inferInsert;

// ─── Aléatoire déterministe ──────────────────────────────────────────────────

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(rng: Rng, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error("pick() sur une liste vide");
  return item;
}

function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = a;
  }
  return copy;
}

function weightedPick<T>(rng: Rng, entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll < 0) return value;
  }
  const last = entries[entries.length - 1];
  if (!last) throw new Error("weightedPick() sur une liste vide");
  return last[0];
}

// ─── Dates ────────────────────────────────────────────────────────────────────

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

function ymd(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Horodatage UTC (= Africa/Conakry, GMT+0 sans DST). */
function at(date: string, hours: number, minutes = 0): Date {
  return new Date(`${date}T${pad(hours)}:${pad(minutes)}:00Z`);
}

interface MonthPeriod {
  index: number;
  label: string; // "2026-03"
  periodStart: string;
  periodEnd: string;
}

function monthPeriod(year: number, month: number, index: number): MonthPeriod {
  return {
    index,
    label: `${year}-${pad(month)}`,
    periodStart: ymd(year, month, 1),
    periodEnd: ymd(year, month, lastDayOfMonth(year, month)),
  };
}

// ─── Moyens de paiement ──────────────────────────────────────────────────────

const METHOD_WEIGHTS: readonly (readonly [PaymentMethod, number])[] = [
  ["orange_money", 45],
  ["especes", 20],
  ["mtn_momo", 20],
  ["paycard", 8],
  ["soutra_money", 4],
  ["virement_bancaire", 3],
];

/**
 * Moyen de paiement habituel de chaque membre, réparti par quotas (et non
 * tiré au hasard) : sur ~40 membres, un tirage libre s'écarte trop de la
 * répartition cible. Chaque paiement garde ensuite 15 % d'aléa.
 */
function methodQuotas(rng: Rng, n: number): PaymentMethod[] {
  const total = METHOD_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);
  const quotas = METHOD_WEIGHTS.map(([method, weight]) => ({
    method,
    count: Math.max(1, Math.round((weight / total) * n)),
  }));
  let diff = n - quotas.reduce((sum, q) => sum + q.count, 0);
  for (let i = 0; diff !== 0; i = (i + 1) % quotas.length) {
    const q = quotas[i];
    if (!q || (diff < 0 && q.count <= 1)) continue;
    q.count += diff > 0 ? 1 : -1;
    diff += diff > 0 ? -1 : 1;
  }
  return shuffle(rng, quotas.flatMap((q) => Array.from({ length: q.count }, () => q.method)));
}

/** Référence plausible, au format des reçus de `scripts/demo-files/`. */
function paymentReference(
  rng: Rng,
  method: PaymentMethod,
  paidAt: string,
  hours: number,
  minutes: number,
): string | null {
  const compact = paidAt.slice(2).replaceAll("-", ""); // 260305
  const letter = String.fromCharCode(65 + randInt(rng, 0, 25));
  const digits = (n: number) => pad(randInt(rng, 0, 10 ** n - 1), n);
  switch (method) {
    case "orange_money":
      return `PP${compact}.${pad(hours)}${pad(minutes)}.${letter}${digits(5)}`;
    case "mtn_momo":
      return `MP${compact}.${pad(hours)}${pad(minutes)}.${letter}${digits(5)}`;
    case "paycard":
      return `PC-${compact}-${digits(6)}`;
    case "soutra_money":
      return `SM${compact}${digits(6)}`;
    case "virement_bancaire":
      return `VIR-${compact}-${digits(4)}`;
    default:
      return null;
  }
}

// ─── Membres ──────────────────────────────────────────────────────────────────

interface MemberSpec {
  key: string;
  fullName: string;
  /** E.164 ; généré si absent. */
  phone?: string;
  role?: MemberRole;
  joinedAt: string;
  status?: MemberStatus;
  leftAt?: string;
  /** Intervalles de suspension [from, until) — `until` absent = en cours. */
  suspensions?: { from: string; until?: string }[];
  profession?: string;
  notes?: string;
  /** Ligne fondatrice existante (liée au compte propriétaire) — mise à jour, pas insérée. */
  founder?: boolean;
}

interface SeededMember extends MemberSpec {
  id: string;
  status: MemberStatus;
  method: PaymentMethod;
}

/** Actif à une date donnée : adhéré, ni sorti, ni suspendu ce jour-là. */
function isActiveOn(member: MemberSpec, date: string): boolean {
  if (member.joinedAt > date) return false;
  if (member.leftAt && member.leftAt <= date) return false;
  for (const s of member.suspensions ?? []) {
    if (s.from <= date && (!s.until || date < s.until)) return false;
  }
  return true;
}

const PHONE_PREFIXES = ["20", "22", "23", "24", "27", "28", "52", "55", "57", "60", "61", "62", "63", "64", "65", "66"];

function generatePhone(rng: Rng): string {
  return `+2246${pick(rng, PHONE_PREFIXES)}${pad(randInt(rng, 0, 999999), 6)}`;
}

function emailFor(fullName: string, used: Set<string>): string {
  const base = fullName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/'/g, "")
    .toLowerCase()
    .split(/\s+/)
    .join(".");
  let email = `${base}@exemple.gn`;
  let n = 2;
  while (used.has(email)) email = `${base}${n++}@exemple.gn`;
  used.add(email);
  return email;
}

function seedMembers(
  rng: Rng,
  organizationId: string,
  founderMemberId: string,
  specs: MemberSpec[],
  professions: readonly string[],
): { members: SeededMember[]; inserts: MemberInsert[] } {
  const usedEmails = new Set<string>();
  const members: SeededMember[] = [];
  const inserts: MemberInsert[] = [];
  const primaryMethods = methodQuotas(rng, specs.length);

  for (const [index, spec] of specs.entries()) {
    const member: SeededMember = {
      ...spec,
      id: spec.founder ? founderMemberId : newId(),
      status: spec.status ?? "actif",
      method: primaryMethods[index] ?? "orange_money",
    };
    members.push(member);

    const phone = spec.phone ?? generatePhone(rng);
    const profession = spec.profession ?? pick(rng, professions);
    const dateOfBirth = ymd(randInt(rng, 1966, 1998), randInt(rng, 1, 12), randInt(rng, 1, 28));
    if (spec.founder) continue;

    inserts.push({
      id: member.id,
      organizationId,
      userId: null,
      fullName: spec.fullName,
      phoneNumber: phone,
      email: emailFor(spec.fullName, usedEmails),
      dateOfBirth,
      profession,
      notes: spec.notes ?? null,
      role: spec.role ?? "membre",
      status: member.status,
      joinedAt: spec.joinedAt,
      leftAt: spec.leftAt ?? null,
      createdAt: at(spec.joinedAt < "2026-03-01" ? "2026-03-02" : spec.joinedAt, 11),
      updatedAt: at(
        spec.leftAt ?? spec.suspensions?.at(-1)?.until ?? spec.suspensions?.at(-1)?.from ?? spec.joinedAt,
        11,
      ),
    });
  }

  return { members, inserts };
}

// ─── Plan d'écriture d'une organisation ──────────────────────────────────────

interface OrgPlan {
  label: string;
  founderUpdate: Partial<MemberInsert>;
  members: MemberInsert[];
  cotisationTypes: CotisationTypeInsert[];
  cotisations: CotisationInsert[];
  payments: PaymentInsert[];
  transactions: TransactionInsert[];
  reminders: ReminderInsert[];
  meetings: MeetingInsert[];
  attendance: AttendanceInsert[];
  minutes: MinutesInsert[];
}

interface OrgContext {
  organizationId: string;
  ownerUserId: string;
  founderMemberId: string;
}

/** Enregistre un paiement + sa transaction `revenue`, au format de `recordPayment`. */
function paymentWithTransaction(
  ctx: OrgContext,
  plan: OrgPlan,
  input: {
    cotisation: CotisationInsert;
    member: SeededMember;
    typeName: string;
    frequency: CotisationFrequency;
    amount: number;
    paidAt: string;
    method: PaymentMethod;
    reference: string | null;
    hours: number;
    minutes: number;
    note?: string;
  },
): void {
  const paymentId = newId();
  const createdAt = at(input.paidAt, input.hours, input.minutes);
  plan.payments.push({
    id: paymentId,
    organizationId: ctx.organizationId,
    cotisationId: input.cotisation.id,
    memberId: input.member.id,
    recordedByUserId: ctx.ownerUserId,
    amount: input.amount,
    paidAt: input.paidAt,
    paymentMethod: input.method,
    paymentReference: input.reference,
    note: input.note ?? null,
    createdAt,
    updatedAt: createdAt,
  });
  const periodLabelFr = formatPeriodLabel(input.cotisation.periodStart, input.frequency, "fr");
  plan.transactions.push({
    id: newId(),
    organizationId: ctx.organizationId,
    recordedByUserId: ctx.ownerUserId,
    type: "revenue",
    category: "cotisations",
    amount: input.amount,
    occurredAt: input.paidAt,
    paymentId,
    description: `Cotisation ${input.typeName} — ${input.member.fullName} — ${periodLabelFr}`,
    createdAt,
    updatedAt: createdAt,
  });
}

function emptyPlan(label: string): OrgPlan {
  return {
    label,
    founderUpdate: {},
    members: [],
    cotisationTypes: [],
    cotisations: [],
    payments: [],
    transactions: [],
    reminders: [],
    meetings: [],
    attendance: [],
    minutes: [],
  };
}

function assertEqual(actual: unknown, expected: unknown, what: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Incohérence (${what}) : attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REFEM — Réseau des Femmes Entrepreneures de Matoto
// ═══════════════════════════════════════════════════════════════════════════════

const REFEM_PROFESSIONS = [
  "Commerçante",
  "Couturière",
  "Restauratrice",
  "Coiffeuse",
  "Transformatrice de produits locaux",
  "Teinturière",
  "Savonnière",
  "Vendeuse de tissus",
  "Gérante de boutique",
  "Mareyeuse",
  "Pâtissière",
  "Vendeuse de produits cosmétiques",
] as const;

/**
 * 46 fiches : 42 actives, 2 suspendues, 2 démissionnaires (plan validé).
 * Les 26 premières reprennent la liste de présence de l'AG du 17/01/2026
 * (fichier 18), téléphones compris. Enchaînement des effectifs redevables
 * au 1er du mois (xlsx, onglet Recouvrement) : 36, 37, 38, 39, 40, 41 puis
 * 42, 42, 41 — vérifié par assertion.
 */
const REFEM_MEMBERS: MemberSpec[] = [
  // ── 2023 (14) ──
  { key: "mariama", fullName: "Mariama Diallo", phone: "+224652609316", role: "president", joinedAt: "2023-03-11", founder: true },
  { key: "kadiatou-sylla", fullName: "Kadiatou Sylla", phone: "+224628641782", role: "secretaire", joinedAt: "2023-03-11", profession: "Gérante de boutique" },
  { key: "binta-bah", fullName: "Fatoumata Binta Bah", phone: "+224661834981", role: "tresorier", joinedAt: "2023-03-11", profession: "Commerçante" },
  { key: "aissatou-camara", fullName: "Aïssatou Camara", phone: "+224629487773", joinedAt: "2023-03-11", profession: "Transformatrice de produits locaux" },
  { key: "hawa-keita", fullName: "Hawa Keïta", phone: "+224655867384", joinedAt: "2023-03-11", profession: "Couturière" },
  { key: "mmah-soumah", fullName: "M'Mah Soumah", phone: "+224661731737", joinedAt: "2023-04-08" },
  { key: "nene-oumou-barry", fullName: "Nènè Oumou Barry", phone: "+224666559758", joinedAt: "2023-05-13" },
  { key: "fatoumata-conde", fullName: "Fatoumata Condé", phone: "+224658578882", joinedAt: "2023-06-10" },
  { key: "mariame-toure", fullName: "Mariame Touré", phone: "+224623663024", joinedAt: "2023-07-08" },
  { key: "oumou-kalsoum-diallo", fullName: "Oumou Kalsoum Diallo", joinedAt: "2023-08-12", status: "démissionné", leftAt: "2025-10-15", notes: "Démission : installation à Kankan." },
  { key: "adama-bangoura", fullName: "Adama Bangoura", phone: "+224651247269", joinedAt: "2023-09-09" },
  { key: "kadiatou-barry", fullName: "Kadiatou Barry", phone: "+224664922199", joinedAt: "2023-10-14" },
  { key: "hadja-aicha-bah", fullName: "Hadja Aïcha Bah", phone: "+224663357673", joinedAt: "2023-11-11" },
  { key: "aminata-kaba", fullName: "Aminata Kaba", phone: "+224627898810", joinedAt: "2023-12-09" },
  // ── 2024 (10) ──
  { key: "ramatoulaye-diallo", fullName: "Ramatoulaye Diallo", phone: "+224622132985", joinedAt: "2024-01-13" },
  { key: "fanta-camara", fullName: "Fanta Camara", phone: "+224624374774", joinedAt: "2024-02-10" },
  { key: "oumou-sangare-traore", fullName: "Oumou Sangaré Traoré", phone: "+224652871029", joinedAt: "2024-03-16" },
  { key: "salematou-sow", fullName: "Salématou Sow", phone: "+224650227467", joinedAt: "2024-04-13" },
  { key: "mabinty-sylla", fullName: "Mabinty Sylla", phone: "+224652632560", joinedAt: "2024-05-11" },
  { key: "nene-kadiatou-balde", fullName: "Néné Kadiatou Baldé", phone: "+224657309538", joinedAt: "2024-06-15" },
  { key: "djenabou-diallo", fullName: "Djénabou Diallo", phone: "+224650595276", joinedAt: "2024-07-13" },
  // Suspendue du 20/01 au 20/03/2026 (arriérés 2025 régularisés) : absente des
  // redevables de février et mars, de nouveau active depuis.
  { key: "tiguidanke-conde", fullName: "Tiguidanké Condé", phone: "+224665214517", joinedAt: "2024-09-14", suspensions: [{ from: "2026-01-20", until: "2026-03-20" }], notes: "Suspendue du 20/01 au 20/03/2026 pour arriérés, réintégrée après régularisation." },
  { key: "sayon-keita", fullName: "Sayon Keïta", phone: "+224622431633", joinedAt: "2024-10-12" },
  { key: "hadja-mariama-sow", fullName: "Hadja Mariama Sow", phone: "+224620748034", joinedAt: "2024-11-09" },
  // ── 2025 (13) — effectif de 24 à 36 (rapport d'activité 2025) ──
  { key: "kadiatou-fofana", fullName: "Kadiatou Fofana", phone: "+224621904265", joinedAt: "2025-01-11" },
  { key: "fatoumata-kouyate", fullName: "Fatoumata Kouyaté", phone: "+224624565280", joinedAt: "2025-01-25" },
  { key: "aissata-doumbouya", fullName: "Aissata Doumbouya", phone: "+224624212861", joinedAt: "2025-02-15" },
  { key: "aminata-soumah", fullName: "Aminata Soumah", joinedAt: "2025-03-08" },
  { key: "kadiatou-toure", fullName: "Kadiatou Touré", joinedAt: "2025-04-12" },
  { key: "fatoumata-diaraye-barry", fullName: "Fatoumata Diaraye Barry", joinedAt: "2025-05-10" },
  { key: "hawa-camara", fullName: "Hawa Camara", joinedAt: "2025-06-14" },
  { key: "mariama-cire-bah", fullName: "Mariama Ciré Bah", joinedAt: "2025-07-12" },
  { key: "aissatou-bangoura", fullName: "Aïssatou Bangoura", joinedAt: "2025-08-09" },
  { key: "djenab-conde", fullName: "Djénab Condé", joinedAt: "2025-09-13" },
  { key: "safiatou-keita", fullName: "Safiatou Keïta", joinedAt: "2025-10-11" },
  { key: "makale-camara", fullName: "Makalé Camara", joinedAt: "2025-11-08" },
  { key: "bintou-sylla", fullName: "Bintou Sylla", joinedAt: "2025-12-13" },
  // ── 2026 (9) — droits d'adhésion : janv. 2, févr. 1, avr. 1, mai 2, juin 1 ──
  { key: "maimouna-toure", fullName: "Maïmouna Touré", joinedAt: "2026-01-10" },
  { key: "hadja-fatou-camara", fullName: "Hadja Fatou Camara", joinedAt: "2026-01-17" },
  { key: "aicha-sow", fullName: "Aïcha Sow", joinedAt: "2026-02-09", status: "démissionné", leftAt: "2026-05-28", notes: "Démission : départ pour Labé." },
  { key: "kadiatou-kourouma", fullName: "Kadiatou Kourouma", joinedAt: "2026-04-11", status: "suspendu", suspensions: [{ from: "2026-07-28" }], notes: "Suspendue le 28/07/2026 : cotisations de juin et juillet impayées malgré relances." },
  { key: "asmaou-barry", fullName: "Asmaou Barry", joinedAt: "2026-05-09", status: "suspendu", suspensions: [{ from: "2026-08-29" }], notes: "Suspendue le 29/08/2026 : cotisations de juillet et août impayées malgré relances." },
  { key: "djenabou-sow", fullName: "Djénabou Sow", joinedAt: "2026-05-20" },
  { key: "rouguiatou-diallo", fullName: "Rouguiatou Diallo", joinedAt: "2026-06-06" },
  { key: "fatoumata-yarie-soumah", fullName: "Fatoumata Yarie Soumah", joinedAt: "2026-07-15" },
  { key: "hadja-saran-conde", fullName: "Hadja Saran Condé", joinedAt: "2026-09-12" },
];

const REFEM_BUREAU = new Set(["mariama", "kadiatou-sylla", "binta-bah"]);

/** Retardataires chroniques : 7 membres en retard de 2 mois ou plus au 13/03 (PV M03). */
const REFEM_CHRONIC = ["kadiatou-barry", "aminata-kaba", "djenabou-diallo", "sayon-keita", "safiatou-keita", "makale-camara"];
/** 7e retardataire de janvier-mars, à jour à partir d'avril. */
const REFEM_LATE_UNTIL_MARCH = "fatoumata-kouyate";

const REFEM_MONTHS = Array.from({ length: 9 }, (_, i) => monthPeriod(2026, i + 1, i));

/** Membres redevables au 1er du mois (xlsx Recouvrement + suite validée). */
const REFEM_EXPECTED_REDEVABLES = [36, 37, 38, 39, 40, 41, 42, 42, 41];
/** Cotisations mensuelles impayées par période (avant rattrapage d'août). */
const REFEM_UNPAID_TARGETS = [9, 7, 7, 9, 8, 9, 10, 9, 11];
/** Totaux encaissés janv.–juin (xlsx « Recettes et dépenses », en GNF). */
const REFEM_XLSX_COTISATIONS = [1_350_000, 1_500_000, 1_550_000, 1_500_000, 1_600_000, 1_600_000];
const REFEM_XLSX_ADHESIONS = [200_000, 100_000, 0, 100_000, 200_000, 100_000];

/** Paiements rattachés aux reçus P01–P05 (manifest.json) — valeurs exactes. */
const REFEM_RECEIPT_PAYMENTS: Record<string, { memberKey: string; paidAt: string; method: PaymentMethod; reference: string; hours: number; minutes: number }> = {
  "2026-03": { memberKey: "aissatou-camara", paidAt: "2026-03-05", method: "orange_money", reference: "PP260305.1422.A48213", hours: 14, minutes: 22 },
  "2026-04": { memberKey: "hawa-keita", paidAt: "2026-04-08", method: "mtn_momo", reference: "MP260408.0917.K20561", hours: 9, minutes: 17 },
  "2026-06": { memberKey: "mmah-soumah", paidAt: "2026-06-06", method: "especes", reference: "RC-2026-061", hours: 11, minutes: 0 },
  "2026-08": { memberKey: "fatoumata-conde", paidAt: "2026-08-07", method: "especes", reference: "RC-2026-084", hours: 10, minutes: 30 },
};

/** Droits d'adhésion (one_time) — P03 pour Djénabou Sow. Absent = impayé. */
const REFEM_FEE_PAYMENTS: Record<string, { paidAt: string; method: PaymentMethod; reference?: string; hours: number; minutes: number }> = {
  "maimouna-toure": { paidAt: "2026-01-10", method: "orange_money", hours: 16, minutes: 5 },
  "hadja-fatou-camara": { paidAt: "2026-01-17", method: "especes", hours: 13, minutes: 30 },
  "aicha-sow": { paidAt: "2026-02-09", method: "mtn_momo", hours: 18, minutes: 12 },
  "kadiatou-kourouma": { paidAt: "2026-04-11", method: "orange_money", hours: 10, minutes: 48 },
  "asmaou-barry": { paidAt: "2026-05-09", method: "especes", hours: 12, minutes: 15 },
  "djenabou-sow": { paidAt: "2026-05-20", method: "orange_money", reference: "PP260520.1803.S77402", hours: 18, minutes: 3 },
  "rouguiatou-diallo": { paidAt: "2026-06-06", method: "orange_money", hours: 15, minutes: 40 },
  "fatoumata-yarie-soumah": { paidAt: "2026-07-18", method: "paycard", hours: 11, minutes: 26 },
};

/** Dépenses S1 — une transaction par cellule non nulle du xlsx (total 3 520 000 GNF). */
const REFEM_EXPENSES: { date: string; amount: number; category: string; description: string; reference?: string }[] = [
  // Location de salle
  { date: "2026-01-17", amount: 750_000, category: "loyer_charges", description: "Location de salle — AG ordinaire du 17 janvier (Espace Kanya Événements)", reference: "Facture location de salle — AG 2026" },
  // Collations et réunions
  { date: "2026-01-17", amount: 450_000, category: "evenements", description: "Collations et rafraîchissements — AG ordinaire du 17 janvier" },
  { date: "2026-02-14", amount: 150_000, category: "evenements", description: "Collations — réunion de bureau du 14 février" },
  { date: "2026-03-14", amount: 150_000, category: "evenements", description: "Collations — réunion de bureau du 14 mars" },
  { date: "2026-04-25", amount: 250_000, category: "evenements", description: "Collations — réunion extraordinaire du 25 avril" },
  { date: "2026-05-16", amount: 150_000, category: "evenements", description: "Collations — réunion de bureau du 16 mai" },
  { date: "2026-06-13", amount: 150_000, category: "evenements", description: "Collations — réunion de bureau du 13 juin" },
  // Formations et activités
  { date: "2026-02-28", amount: 380_000, category: "evenements", description: "Formation « Tenue de caisse et gestion de stock » — formatrice et supports" },
  { date: "2026-05-30", amount: 380_000, category: "evenements", description: "Formation « Éducation financière » — formatrice et supports" },
  // Fournitures
  { date: "2026-01-08", amount: 120_000, category: "fournitures", description: "Fournitures de bureau — registres, cahiers de caisse, reçus" },
  { date: "2026-02-05", amount: 50_000, category: "fournitures", description: "Impression des cartes de membre 2026" },
  { date: "2026-04-10", amount: 80_000, category: "fournitures", description: "Fournitures — papeterie et cartouches d'imprimante" },
  { date: "2026-05-12", amount: 40_000, category: "fournitures", description: "Fournitures — chemises et classeurs d'archives" },
  { date: "2026-06-09", amount: 40_000, category: "fournitures", description: "Fournitures — carnets de reçus de caisse" },
  // Transport et communication
  { date: "2026-01-30", amount: 80_000, category: "transport", description: "Transport et crédits de communication — janvier" },
  { date: "2026-02-27", amount: 60_000, category: "transport", description: "Transport et crédits de communication — février" },
  { date: "2026-03-27", amount: 60_000, category: "transport", description: "Transport et crédits de communication — mars" },
  { date: "2026-04-29", amount: 60_000, category: "transport", description: "Transport et crédits de communication — avril" },
  { date: "2026-05-29", amount: 60_000, category: "transport", description: "Transport et crédits de communication — mai" },
  { date: "2026-06-26", amount: 60_000, category: "transport", description: "Transport et crédits de communication — juin" },
];
const REFEM_XLSX_TOTAL_EXPENSES = 3_520_000;

interface MeetingSpec {
  key: string;
  title: string;
  type: "ag" | "bureau";
  date: string;
  hours: number;
  minutes: number;
  durationMinutes: number;
  location: string;
  status: "tenue" | "annulee" | "planifiee";
  description?: string;
  /** Présentes parmi les membres actuellement actives (compteur affiché par l'app). */
  presentCount?: number;
  minutes_?: { agenda: string; decisions: string; actions: string; body: string };
}

const REFEM_SIEGE = "Siège du REFEM, quartier Dabondy (Matoto)";

const REFEM_MEETINGS: MeetingSpec[] = [
  {
    key: "M01",
    title: "Assemblée générale ordinaire 2026",
    type: "ag",
    date: "2026-01-17",
    hours: 9,
    minutes: 30,
    durationMinutes: 225,
    location: "Espace Kanya Événements, Matoto",
    status: "tenue",
    description: "Assemblée générale ordinaire annuelle : rapports 2025, cotisations 2026, programme d'activités.",
    presentCount: 38,
    minutes_: {
      agenda:
        "1. Rapport moral et rapport d'activité 2025\n2. Rapport financier 2025\n3. Fixation des cotisations 2026\n4. Modification de l'article 7 des statuts\n5. Programme d'activités 2026\n6. Divers",
      decisions:
        "- Rapports d'activité et financier 2025 adoptés à l'unanimité.\n- Droit d'adhésion fixé à 100 000 GNF, cotisation mensuelle à 50 000 GNF payable avant le 10 de chaque mois.\n- Article 7 des statuts modifié (35 voix pour, 3 abstentions).\n- Programme 2026 adopté : numérisation sur AssoHub, étude d'un fonds de crédit rotatif, cycle de formations, partenariat microfinance.",
      actions:
        "- Trésorière : mettre en place le suivi des cotisations 2026 (espèces, Orange Money, MTN MoMo, PayCard, Soutra Money).\n- Secrétaire générale : lancer la numérisation du fichier des membres sur AssoHub.\n- Bureau : préparer une étude sur le fonds de crédit rotatif.",
      body:
        "L'an deux mille vingt-six, le samedi 17 janvier, à 9 h 30, les membres du Réseau des Femmes Entrepreneures de Matoto se sont réunies en assemblée générale ordinaire à l'Espace Kanya Événements, sur convocation de la présidente en date du 2 janvier 2026. Sur 42 membres inscrites, 38 étaient présentes. Le quorum étant atteint, la présidente, Mme Mariama Diallo, a déclaré la séance ouverte.\n\n" +
        "La secrétaire générale a présenté le rapport d'activité 2025, soulignant la progression de l'effectif de 24 à 36 membres et la tenue de six formations. La trésorière, Mme Fatoumata Binta Bah, a présenté le rapport financier : les recettes de l'exercice se sont élevées à 16 420 000 GNF et les dépenses à 11 380 000 GNF, soit un excédent de 5 040 000 GNF. Les deux rapports ont été adoptés à l'unanimité.\n\n" +
        "Après débat, l'assemblée a fixé le droit d'adhésion à 100 000 GNF et la cotisation mensuelle à 50 000 GNF, payable avant le 10 de chaque mois, en espèces auprès de la trésorière ou par Orange Money, MTN MoMo, PayCard ou Soutra Money. L'article 7 des statuts a été modifié en conséquence (35 voix pour, 3 abstentions).\n\n" +
        "L'assemblée a adopté le programme proposé par le bureau : numérisation de la gestion de l'association sur la plateforme AssoHub, étude d'un fonds de crédit rotatif, cycle de formations au dernier trimestre et recherche d'un partenariat avec une institution de microfinance. L'ordre du jour étant épuisé, la séance a été levée à 13 h 15.",
    },
  },
  {
    key: "M02",
    title: "Réunion de bureau — février",
    type: "bureau",
    date: "2026-02-14",
    hours: 10,
    minutes: 0,
    durationMinutes: 120,
    location: REFEM_SIEGE,
    status: "tenue",
    presentCount: 31,
    minutes_: {
      agenda: "1. Point sur les cotisations de janvier\n2. Formation « Tenue de caisse »\n3. Numérisation du fichier des membres\n4. Divers",
      decisions:
        "- Taux de recouvrement de janvier : 75 %. Les retardataires seront relancées individuellement.\n- Formation « Tenue de caisse et gestion de stock » fixée au samedi 28 février, budget de 380 000 GNF.\n- Saisie de l'ensemble des membres sur AssoHub d'ici la mi-mars.",
      actions:
        "- Trésorière : contacter les membres en retard sur janvier.\n- Secrétaire générale : confirmer la formatrice et réserver la salle du siège pour le 28 février.\n- Secrétaire générale : terminer la saisie des fiches membres sur AssoHub.",
      body:
        "Le samedi 14 février 2026, à 10 heures, le bureau exécutif et les membres invitées se sont réunis au siège de l'association, à Dabondy, sous la présidence de Mme Mariama Diallo.\n\n" +
        "La trésorière a présenté l'état des cotisations de janvier : 27 membres sur 36 se sont acquittées de leur cotisation, soit un taux de recouvrement de 75 %. Deux nouvelles membres ont réglé leur droit d'adhésion. Le bureau rappelle que la cotisation est payable avant le 10 de chaque mois.\n\n" +
        "La formation « Tenue de caisse et gestion de stock » annoncée lors de l'assemblée générale se tiendra le samedi 28 février au siège. Le budget, formatrice et supports compris, est arrêté à 380 000 GNF.\n\n" +
        "La secrétaire générale indique que la saisie des fiches membres sur AssoHub est en cours et sera achevée d'ici la mi-mars. La séance a été levée à 12 heures.",
    },
  },
  {
    key: "M03",
    title: "Réunion de bureau — mars",
    type: "bureau",
    date: "2026-03-14",
    hours: 10,
    minutes: 0,
    durationMinutes: 125,
    location: REFEM_SIEGE,
    status: "tenue",
    presentCount: 31,
    minutes_: {
      agenda: "1. Point sur les cotisations\n2. Mise en place d'AssoHub\n3. Préparation de la réunion extraordinaire\n4. Divers",
      decisions:
        "- Taux de recouvrement de février : 81 %. Sept membres présentent un retard de deux mois ou plus : rappel individuel par message.\n- AssoHub devient l'outil de tenue du fichier des membres et de suivi des cotisations.\n- Réunion extraordinaire convoquée le 25 avril 2026 sur le projet de fonds de crédit rotatif.",
      actions:
        "- Trésorière : adresser un rappel individuel aux membres en retard ; situation réexaminée en avril.\n- Secrétaire générale : numériser et archiver les anciens procès-verbaux dans l'espace Documents.\n- Mmes Hawa Keïta et Aïssatou Camara : préparer la note de présentation du fonds de crédit rotatif.",
      body:
        "Le samedi 14 mars 2026, à 10 heures, le bureau exécutif et les membres invitées se sont réunis au siège de l'association, à Dabondy, sous la présidence de Mme Mariama Diallo. Présentes : 31 membres sur 40.\n\n" +
        "La trésorière a présenté l'état des cotisations au 13 mars : le taux de recouvrement de février s'établit à 81 %. Sept membres présentent un retard de deux mois ou plus. Il est décidé que la trésorière adressera un rappel individuel par message, et que la situation sera réexaminée à la réunion d'avril.\n\n" +
        "La secrétaire générale a présenté la plateforme AssoHub, désormais utilisée pour la tenue du fichier des membres et le suivi des cotisations. Les membres pourront consulter l'historique de leurs paiements. Les anciens procès-verbaux seront progressivement numérisés et archivés dans l'espace Documents.\n\n" +
        "Le bureau a décidé de convoquer une réunion extraordinaire le 25 avril 2026 pour examiner le projet de fonds de crédit rotatif. Mmes Hawa Keïta et Aïssatou Camara sont chargées de préparer une note de présentation. Aucun point divers n'ayant été soulevé, la séance a été levée à 12 h 05.",
    },
  },
  {
    key: "M04",
    title: "Réunion extraordinaire — fonds de crédit rotatif",
    type: "ag",
    date: "2026-04-25",
    hours: 9,
    minutes: 30,
    durationMinutes: 190,
    location: REFEM_SIEGE,
    status: "tenue",
    description: "Séance extraordinaire. Ordre du jour unique : création d'un fonds de crédit rotatif.",
    presentCount: 35,
    minutes_: {
      agenda: "Ordre du jour unique : création d'un fonds de crédit rotatif.",
      decisions:
        "- Principe du fonds de crédit rotatif adopté (31 voix pour, 2 contre, 2 abstentions), démarrage prévu en juillet 2026.\n- Contribution volontaire de 20 000 GNF par mois et par membre participante, en plus de la cotisation ordinaire.\n- Prêt sans intérêt à une ou deux membres par mois, par tirage au sort parmi les candidates à jour de leurs cotisations, remboursable en six mensualités.\n- Comité de gestion : Mmes Hawa Keïta, Aïssatou Camara et Fatoumata Condé.",
      actions:
        "- Comité de gestion : rédiger le règlement du fonds (ancienneté minimale de six mois, plafond de 1 500 000 GNF par prêt au démarrage).\n- Secrétaire générale : annexer le règlement du fonds au règlement intérieur.",
      body:
        "Le samedi 25 avril 2026, à 9 h 30, les membres du REFEM se sont réunies en séance extraordinaire au siège de l'association, sur convocation du bureau en date du 14 mars 2026. Présentes : 35 membres sur 41. Ordre du jour unique : création d'un fonds de crédit rotatif.\n\n" +
        "Mme Hawa Keïta a présenté la note préparée avec Mme Aïssatou Camara. Le fonds serait alimenté par une contribution volontaire de 20 000 GNF par mois et par membre participante, en plus de la cotisation ordinaire. Chaque mois, un prêt sans intérêt serait accordé à une ou deux membres, par tirage au sort parmi les candidates à jour de leurs cotisations, remboursable en six mensualités.\n\n" +
        "Plusieurs membres ont souhaité que les critères d'éligibilité soient précisés, notamment l'ancienneté minimale. Il a été proposé de fixer celle-ci à six mois et de plafonner chaque prêt à 1 500 000 GNF au démarrage.\n\n" +
        "Le principe du fonds de crédit rotatif est adopté par 31 voix pour, 2 contre et 2 abstentions. Démarrage prévu en juillet 2026. Un comité de gestion de trois membres est constitué : Mmes Hawa Keïta, Aïssatou Camara et Fatoumata Condé. Le règlement du fonds sera annexé au règlement intérieur. La séance a été levée à 12 h 40.",
    },
  },
  {
    key: "M05",
    title: "Réunion de bureau — mai",
    type: "bureau",
    date: "2026-05-16",
    hours: 10,
    minutes: 0,
    durationMinutes: 115,
    location: REFEM_SIEGE,
    status: "tenue",
    presentCount: 32,
    minutes_: {
      agenda: "1. Point sur les cotisations d'avril\n2. Avancement du règlement du fonds de crédit rotatif\n3. Formation « Éducation financière »\n4. Divers",
      decisions:
        "- Taux de recouvrement d'avril : 77 %. Maintien des rappels individuels.\n- Le comité de gestion présentera le projet de règlement du fonds en juin.\n- Formation « Éducation financière » fixée au samedi 30 mai, budget de 380 000 GNF.",
      actions:
        "- Comité de gestion du fonds : finaliser le projet de règlement pour la réunion de juin.\n- Trésorière : recenser les membres souhaitant contribuer au fonds.\n- Secrétaire générale : diffuser l'invitation à la formation du 30 mai.",
      body:
        "Le samedi 16 mai 2026, à 10 heures, le bureau et les membres invitées se sont réunis au siège de l'association sous la présidence de Mme Mariama Diallo.\n\n" +
        "La trésorière a présenté l'état des cotisations d'avril : 30 membres sur 39 sont à jour, soit un taux de recouvrement de 77 %. Une nouvelle membre a réglé son droit d'adhésion. Les rappels individuels décidés en mars sont maintenus.\n\n" +
        "Le comité de gestion du fonds de crédit rotatif indique que le projet de règlement est en cours de rédaction ; il sera soumis au bureau lors de la réunion de juin. La trésorière recensera d'ici là les membres souhaitant contribuer.\n\n" +
        "La formation « Éducation financière » se tiendra le samedi 30 mai au siège, pour un budget de 380 000 GNF. La séance a été levée à 11 h 55.",
    },
  },
  {
    key: "M06",
    title: "Réunion de bureau — juin",
    type: "bureau",
    date: "2026-06-13",
    hours: 10,
    minutes: 0,
    durationMinutes: 110,
    location: REFEM_SIEGE,
    status: "tenue",
    presentCount: 33,
    minutes_: {
      agenda: "1. Situation financière\n2. Fonds de crédit rotatif\n3. Partenariat microfinance",
      decisions:
        "- Recouvrement des cotisations sur les cinq premiers mois : 79 % (72 % à la même période en 2025). Solde de trésorerie au 31 mai : 9 870 000 GNF.\n- Règlement du fonds de crédit rotatif adopté ; 24 membres engagées à contribuer.\n- Premier tirage au sort lors de la réunion de juillet.",
      actions:
        "- Comité de gestion : organiser le premier tirage au sort en juillet.\n- Secrétaire générale : préparer un projet de lettre de partenariat avec la Mutuelle d'Épargne et de Crédit Solidarité Matoto.",
      body:
        "Le samedi 13 juin 2026, à 10 heures, le bureau et les membres invitées se sont réunis au siège de l'association sous la présidence de Mme Mariama Diallo. Présentes : 33 membres sur 42.\n\n" +
        "La trésorière a présenté la situation au 31 mai. Le taux de recouvrement des cotisations sur les cinq premiers mois atteint 79 %, contre 72 % à la même période en 2025. Le solde de trésorerie s'élève à 9 870 000 GNF.\n\n" +
        "Le comité de gestion indique que 24 membres se sont engagées à contribuer au fonds. Le premier tirage au sort aura lieu lors de la réunion de juillet. Le règlement du fonds est adopté.\n\n" +
        "La présidente rend compte d'une rencontre avec la Mutuelle d'Épargne et de Crédit Solidarité Matoto. Un projet de lettre de partenariat sera préparé par la secrétaire générale. La séance a été levée à 11 h 50.",
    },
  },
  {
    key: "M07",
    title: "Réunion de bureau — juillet",
    type: "bureau",
    date: "2026-07-11",
    hours: 10,
    minutes: 0,
    durationMinutes: 120,
    location: REFEM_SIEGE,
    status: "tenue",
    presentCount: 30,
    minutes_: {
      agenda: "1. Premier tirage du fonds de crédit rotatif\n2. Formations du dernier trimestre\n3. Divers",
      decisions:
        "- Premières bénéficiaires du fonds : Mmes M'Mah Soumah et Nènè Oumou Barry, 1 200 000 GNF chacune, remboursables en six mensualités à compter d'août 2026.\n- Thèmes des formations du dernier trimestre : tenue de caisse, éducation financière, accès au crédit, vente en ligne.\n- La réunion d'août pourra être reportée en raison de la saison des pluies.",
      actions:
        "- Comité de gestion : suivre les remboursements à compter d'août.\n- Secrétaire générale : relancer la mairie de Matoto pour la salle polyvalente.",
      body:
        "Le samedi 11 juillet 2026, à 10 heures, le bureau et les membres invitées se sont réunis au siège de l'association sous la présidence de Mme Mariama Diallo. Présentes : 30 membres sur 42.\n\n" +
        "Le tirage au sort, effectué en présence des membres, a désigné Mmes M'Mah Soumah et Nènè Oumou Barry comme premières bénéficiaires, pour un montant de 1 200 000 GNF chacune, remboursable en six mensualités à compter d'août 2026.\n\n" +
        "Un courrier a été adressé à la mairie de Matoto pour solliciter la salle polyvalente. Les thèmes retenus sont : tenue de caisse, éducation financière, accès au crédit et vente en ligne.\n\n" +
        "En raison de la saison des pluies, il est convenu que la réunion d'août pourra être reportée si les conditions ne permettent pas aux membres de se déplacer. La séance a été levée à 12 heures.",
    },
  },
  {
    key: "M08",
    title: "Réunion de bureau — août",
    type: "bureau",
    date: "2026-08-08",
    hours: 10,
    minutes: 0,
    durationMinutes: 120,
    location: REFEM_SIEGE,
    status: "annulee",
    description: "Annulée en raison des fortes pluies, comme envisagé lors de la réunion du 11 juillet.",
  },
  {
    key: "M09",
    title: "Réunion de bureau — octobre",
    type: "bureau",
    date: "2026-10-10",
    hours: 10,
    minutes: 0,
    durationMinutes: 120,
    location: REFEM_SIEGE,
    status: "planifiee",
    description:
      "Ordre du jour prévisionnel : bilan du premier trimestre du fonds de crédit rotatif, programme des formations du dernier trimestre, point sur les cotisations de septembre.",
  },
];

function buildRefem(ctx: OrgContext): OrgPlan {
  const rng = mulberry32(REFEM_SEED);
  const plan = emptyPlan("REFEM");

  const { members, inserts } = seedMembers(rng, ctx.organizationId, ctx.founderMemberId, REFEM_MEMBERS, REFEM_PROFESSIONS);
  plan.members = inserts;
  const founderSpec = REFEM_MEMBERS.find((m) => m.founder);
  plan.founderUpdate = {
    role: "president",
    phoneNumber: founderSpec?.phone ?? "",
    joinedAt: founderSpec?.joinedAt ?? "2023-03-11",
  };

  const byKey = new Map(members.map((m) => [m.key, m]));
  const member = (key: string): SeededMember => {
    const found = byKey.get(key);
    if (!found) throw new Error(`Membre inconnu : ${key}`);
    return found;
  };

  assertEqual(members.length, 46, "nombre de fiches");
  assertEqual(members.filter((m) => m.status === "actif").length, 42, "fiches actives");

  // ── Types de cotisation ──
  const monthlyType: CotisationTypeInsert = {
    id: newId(),
    organizationId: ctx.organizationId,
    name: "Cotisation mensuelle",
    description: "Cotisation ordinaire payable avant le 10 de chaque mois (AG du 17/01/2026).",
    defaultAmount: gnf(50_000),
    frequency: "monthly",
    createdAt: at("2026-01-02", 10),
    updatedAt: at("2026-01-02", 10),
  };
  const feeType: CotisationTypeInsert = {
    id: newId(),
    organizationId: ctx.organizationId,
    name: "Droit d'adhésion",
    description: "Payé une fois à l'adhésion (AG du 17/01/2026).",
    defaultAmount: gnf(100_000),
    frequency: "one_time",
    createdAt: at("2026-01-02", 10),
    updatedAt: at("2026-01-02", 10),
  };
  plan.cotisationTypes.push(monthlyType, feeType);

  // ── Cotisations mensuelles et paiements ──
  const unpaidByMonth: Set<string>[] = [];
  const monthlyCotisation = new Map<string, CotisationInsert>(); // `${memberKey}|${label}`
  const lastDay = REFERENCE_DATE.slice(0, 7);

  for (const period of REFEM_MONTHS) {
    const redevables = members.filter((m) => isActiveOn(m, period.periodStart));
    assertEqual(redevables.length, REFEM_EXPECTED_REDEVABLES[period.index], `redevables ${period.label}`);

    for (const m of redevables) {
      const cotisation: CotisationInsert = {
        id: newId(),
        organizationId: ctx.organizationId,
        cotisationTypeId: monthlyType.id,
        memberId: m.id,
        dueAmount: gnf(50_000),
        periodLabel: period.label,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        dueDate: period.periodEnd,
        status: "en_attente",
        createdAt: at(period.periodStart, 7),
        updatedAt: at(period.periodStart, 7),
      };
      plan.cotisations.push(cotisation);
      monthlyCotisation.set(`${m.key}|${period.label}`, cotisation);
    }

    // Impayées forcées : retardataires chroniques + suspensions à venir.
    const receipt = REFEM_RECEIPT_PAYMENTS[period.label];
    const forced = redevables.filter((m) => {
      if (REFEM_CHRONIC.includes(m.key)) return period.index <= 2 || rng() < 0.85;
      if (m.key === REFEM_LATE_UNTIL_MARCH) return period.index <= 2;
      if (m.key === "tiguidanke-conde") return period.index === 0;
      if (m.key === "kadiatou-kourouma") return period.index === 5 || period.index === 6;
      if (m.key === "asmaou-barry") return period.index === 6 || period.index === 7;
      return false;
    });
    const target = REFEM_UNPAID_TARGETS[period.index] ?? 0;
    const forcedKept = forced.length > target ? shuffle(rng, forced).slice(0, target) : forced;
    const excluded = new Set([
      ...REFEM_BUREAU,
      ...REFEM_CHRONIC,
      REFEM_LATE_UNTIL_MARCH,
      "tiguidanke-conde",
      "kadiatou-kourouma",
      "asmaou-barry",
      ...(receipt ? [receipt.memberKey] : []),
    ]);
    const occasional = shuffle(
      rng,
      redevables.filter((m) => !excluded.has(m.key)),
    ).slice(0, target - forcedKept.length);
    const unpaid = new Set([...forcedKept, ...occasional].map((m) => m.key));
    unpaidByMonth.push(unpaid);

    // Septembre : une membre a versé un acompte (paiement partiel).
    const partialKey = period.label === lastDay ? occasional[0]?.key : undefined;

    for (const m of redevables) {
      const cotisation = monthlyCotisation.get(`${m.key}|${period.label}`);
      if (!cotisation) continue;

      if (receipt && receipt.memberKey === m.key) {
        paymentWithTransaction(ctx, plan, {
          cotisation, member: m, typeName: monthlyType.name, frequency: "monthly",
          amount: gnf(50_000), paidAt: receipt.paidAt, method: receipt.method,
          reference: receipt.reference, hours: receipt.hours, minutes: receipt.minutes,
        });
        continue;
      }

      const isPartial = m.key === partialKey;
      if (unpaid.has(m.key) && !isPartial) continue;

      const maxDay = period.label === lastDay ? Number(REFERENCE_DATE.slice(8)) - 1 : 28;
      const day = rng() < 0.8 ? randInt(rng, 1, 10) : randInt(rng, 11, maxDay);
      const paidAt = ymd(2026, period.index + 1, day);
      const method = rng() < 0.85 ? m.method : weightedPick(rng, METHOD_WEIGHTS);
      const hours = randInt(rng, 8, 20);
      const minutes = randInt(rng, 0, 59);
      paymentWithTransaction(ctx, plan, {
        cotisation, member: m, typeName: monthlyType.name, frequency: "monthly",
        amount: gnf(isPartial ? 25_000 : 50_000), paidAt, method,
        reference: paymentReference(rng, method, paidAt, hours, minutes), hours, minutes,
        note: isPartial ? "Acompte — solde prévu avant la fin du mois." : undefined,
      });
    }
  }

  // Rattrapage : une retardataire chronique règle sa cotisation de juillet en août.
  const julyUnpaid = unpaidByMonth[6] ?? new Set<string>();
  const catchUpKey = REFEM_CHRONIC.find((key) => julyUnpaid.has(key));
  if (catchUpKey) {
    const m = member(catchUpKey);
    const cotisation = monthlyCotisation.get(`${catchUpKey}|2026-07`);
    if (cotisation) {
      paymentWithTransaction(ctx, plan, {
        cotisation, member: m, typeName: monthlyType.name, frequency: "monthly",
        amount: gnf(50_000), paidAt: "2026-08-20", method: "orange_money",
        reference: paymentReference(rng, "orange_money", "2026-08-20", 17, 34), hours: 17, minutes: 34,
        note: "Régularisation de la cotisation de juillet.",
      });
      julyUnpaid.delete(catchUpKey);
    }
  }

  // ── Droits d'adhésion (convention one_time, schema-design §5.2) ──
  for (const m of members.filter((x) => x.joinedAt >= "2026-01-01")) {
    const cotisation: CotisationInsert = {
      id: newId(),
      organizationId: ctx.organizationId,
      cotisationTypeId: feeType.id,
      memberId: m.id,
      dueAmount: gnf(100_000),
      periodLabel: m.joinedAt,
      periodStart: m.joinedAt,
      periodEnd: m.joinedAt,
      dueDate: addDays(m.joinedAt, 15),
      status: "en_attente",
      createdAt: at(m.joinedAt, 9),
      updatedAt: at(m.joinedAt, 9),
    };
    plan.cotisations.push(cotisation);

    const fee = REFEM_FEE_PAYMENTS[m.key];
    if (!fee) continue;
    paymentWithTransaction(ctx, plan, {
      cotisation, member: m, typeName: feeType.name, frequency: "one_time",
      amount: gnf(100_000), paidAt: fee.paidAt, method: fee.method,
      reference: fee.reference ?? paymentReference(rng, fee.method, fee.paidAt, fee.hours, fee.minutes),
      hours: fee.hours, minutes: fee.minutes,
    });
  }

  // ── Vérifications vs rapport financier S1 (encaissements par mois) ──
  const cashByMonth = (typeId: string) =>
    REFEM_MONTHS.slice(0, 6).map((period) =>
      plan.payments
        .filter((p) => {
          const c = plan.cotisations.find((x) => x.id === p.cotisationId);
          return c?.cotisationTypeId === typeId && (p.paidAt ?? "").startsWith(period.label);
        })
        .reduce((sum, p) => sum + p.amount, 0) / 100,
    );
  assertEqual(cashByMonth(monthlyType.id), REFEM_XLSX_COTISATIONS, "cotisations encaissées S1");
  assertEqual(cashByMonth(feeType.id), REFEM_XLSX_ADHESIONS, "droits d'adhésion encaissés S1");
  for (const p of plan.payments) {
    if ((p.paidAt ?? "") > REFERENCE_DATE) throw new Error(`Paiement postérieur à la date de référence : ${p.paidAt}`);
  }

  // ── Dépenses S1 ──
  for (const expense of REFEM_EXPENSES) {
    const createdAt = at(expense.date, 17);
    plan.transactions.push({
      id: newId(),
      organizationId: ctx.organizationId,
      recordedByUserId: ctx.ownerUserId,
      type: "expense",
      category: expense.category,
      amount: gnf(expense.amount),
      occurredAt: expense.date,
      description: expense.description,
      referenceDocument: expense.reference ?? null,
      createdAt,
      updatedAt: createdAt,
    });
  }
  assertEqual(
    REFEM_EXPENSES.reduce((sum, e) => sum + e.amount, 0),
    REFEM_XLSX_TOTAL_EXPENSES,
    "total des dépenses S1",
  );

  // ── Relances (insertion seule, aucun email envoyé) : cotisations réellement en retard ──
  const reminderBatches: { label: string; sentAt: string; count: number }[] = [
    { label: "2026-02", sentAt: "2026-03-16", count: 7 }, // rappel individuel décidé le 14/03
    { label: "2026-05", sentAt: "2026-06-15", count: 3 },
    { label: "2026-08", sentAt: "2026-09-03", count: 2 },
  ];
  for (const batch of reminderBatches) {
    const periodIndex = Number(batch.label.slice(5)) - 1;
    const unpaid = unpaidByMonth[periodIndex] ?? new Set<string>();
    const candidates = [...REFEM_CHRONIC, REFEM_LATE_UNTIL_MARCH].filter((key) => unpaid.has(key));
    for (const [i, key] of candidates.slice(0, batch.count).entries()) {
      const cotisation = monthlyCotisation.get(`${key}|${batch.label}`);
      if (!cotisation) continue;
      const sentAt = at(batch.sentAt, 9, 5 + i * 3);
      plan.reminders.push({
        id: newId(),
        organizationId: ctx.organizationId,
        cotisationId: cotisation.id,
        memberId: member(key).id,
        sentByUserId: ctx.ownerUserId,
        channel: "email",
        sentAt,
        deliveredAt: new Date(sentAt.getTime() + 60_000),
        createdAt: sentAt,
        updatedAt: sentAt,
      });
    }
  }
  assertEqual(plan.reminders.length, 12, "nombre de relances");

  // ── Réunions, présences, PV ──
  buildMeetings(rng, ctx, plan, members, REFEM_MEETINGS, REFEM_BUREAU);

  return plan;
}

function buildMeetings(
  rng: Rng,
  ctx: OrgContext,
  plan: OrgPlan,
  members: SeededMember[],
  specs: MeetingSpec[],
  bureau: Set<string>,
): void {
  const currentlyActive = members.filter((m) => m.status === "actif");

  for (const spec of specs) {
    const meetingId = newId();
    const scheduledAt = at(spec.date, spec.hours, spec.minutes);
    const createdAt = at(addDays(spec.date, spec.status === "planifiee" ? -21 : -14), 10);
    plan.meetings.push({
      id: meetingId,
      organizationId: ctx.organizationId,
      createdByUserId: ctx.ownerUserId,
      title: spec.title,
      type: spec.type,
      description: spec.description ?? null,
      scheduledAt,
      durationMinutes: spec.durationMinutes,
      location: spec.location,
      status: spec.status,
      createdAt,
      updatedAt: spec.status === "annulee" ? at(addDays(spec.date, -2), 18) : createdAt,
    });

    if (spec.status === "planifiee") {
      // RSVP pour une capture crédible de la réunion à venir.
      for (const m of shuffle(rng, currentlyActive).slice(0, 26)) {
        const roll = rng();
        const rsvpStatus = roll < 0.7 ? "yes" : roll < 0.88 ? "maybe" : "no";
        const rsvpAt = at(addDays(REFERENCE_DATE, -randInt(rng, 0, 3)), randInt(rng, 8, 20), randInt(rng, 0, 59));
        plan.attendance.push({
          id: newId(),
          organizationId: ctx.organizationId,
          meetingId,
          memberId: m.id,
          rsvpStatus,
          rsvpAt,
          createdAt: rsvpAt,
          updatedAt: rsvpAt,
        });
      }
      continue;
    }
    if (spec.status !== "tenue" || spec.presentCount === undefined) continue;

    // Membres convoquées = actives à la date de la réunion. Le compteur de
    // l'app ne compte que les présentes encore actives aujourd'hui : c'est
    // sur elles que porte `presentCount` (valeur des PV).
    const pool = members.filter((m) => isActiveOn(m, spec.date));
    const counted = pool.filter((m) => m.status === "actif");
    if (counted.length < spec.presentCount) {
      throw new Error(`${spec.key} : ${spec.presentCount} présentes demandées pour ${counted.length} possibles`);
    }
    const bureauPresent = counted.filter((m) => bureau.has(m.key));
    const others = shuffle(rng, counted.filter((m) => !bureau.has(m.key)));
    const present = new Set([
      ...bureauPresent,
      ...others.slice(0, spec.presentCount - bureauPresent.length),
    ].map((m) => m.id));
    for (const m of pool) {
      if (m.status !== "actif" && rng() < 0.7) present.add(m.id);
    }

    const recordedAt = at(spec.date, spec.hours + Math.ceil(spec.durationMinutes / 60), 15);
    for (const m of pool) {
      const attended = present.has(m.id);
      const rsvpStatus = attended ? (rng() < 0.9 ? "yes" : "maybe") : rng() < 0.5 ? "no" : "no_response";
      const rsvpAt = rsvpStatus === "no_response" ? null : at(addDays(spec.date, -randInt(rng, 1, 6)), randInt(rng, 8, 21), randInt(rng, 0, 59));
      plan.attendance.push({
        id: newId(),
        organizationId: ctx.organizationId,
        meetingId,
        memberId: m.id,
        rsvpStatus,
        rsvpAt,
        attended,
        attendanceRecordedAt: recordedAt,
        attendanceRecordedByUserId: ctx.ownerUserId,
        createdAt: rsvpAt ?? recordedAt,
        updatedAt: recordedAt,
      });
    }
    const countedPresent = counted.filter((m) => present.has(m.id)).length;
    assertEqual(countedPresent, spec.presentCount, `présentes ${spec.key}`);

    if (spec.minutes_) {
      plan.minutes.push({
        id: newId(),
        organizationId: ctx.organizationId,
        meetingId,
        createdByUserId: ctx.ownerUserId,
        agenda: spec.minutes_.agenda,
        decisionsSummary: spec.minutes_.decisions,
        actionsToFollow: spec.minutes_.actions,
        bodyMarkdown: spec.minutes_.body,
        status: "publie",
        publishedAt: at(addDays(spec.date, 3), 9),
        createdAt: at(addDays(spec.date, 1), 16),
        updatedAt: at(addDays(spec.date, 3), 9),
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Amicale des Anciens du Lycée de Donka — organisation légère
// ═══════════════════════════════════════════════════════════════════════════════

const DONKA_PROFESSIONS = [
  "Ingénieur en génie civil",
  "Enseignant",
  "Médecin",
  "Comptable",
  "Juriste",
  "Pharmacienne",
  "Informaticien",
  "Banquière",
  "Journaliste",
] as const;

const DONKA_MEMBERS: MemberSpec[] = [
  { key: "founder", fullName: "Fondateur", joinedAt: "2025-02-08", founder: true },
  { key: "alpha-oumar-diallo", fullName: "Alpha Oumar Diallo", role: "secretaire", joinedAt: "2025-02-08" },
  { key: "mamadou-saliou-barry", fullName: "Mamadou Saliou Barry", role: "tresorier", joinedAt: "2025-02-08" },
  { key: "ibrahima-sory-camara", fullName: "Ibrahima Sory Camara", role: "vice_president", joinedAt: "2025-02-08" },
  { key: "aboubacar-sylla", fullName: "Aboubacar Sylla", joinedAt: "2025-03-15" },
  { key: "thierno-mamadou-bah", fullName: "Thierno Mamadou Bah", joinedAt: "2025-04-12" },
  { key: "kadiatou-conde", fullName: "Kadiatou Condé", joinedAt: "2025-06-14" },
  { key: "sekouba-keita", fullName: "Sékouba Keïta", joinedAt: "2025-09-20" },
  { key: "fode-bangoura", fullName: "Fodé Bangoura", joinedAt: "2026-01-24" },
  { key: "mariama-soumah", fullName: "Mariama Soumah", joinedAt: "2026-03-21" },
];

const DONKA_MONTHS = [monthPeriod(2026, 7, 6), monthPeriod(2026, 8, 7), monthPeriod(2026, 9, 8)];
const DONKA_UNPAID_TARGETS = [1, 2, 3];
const DONKA_LOCATION = "Lycée de Donka, salle polyvalente (Dixinn)";

const DONKA_MEETINGS: MeetingSpec[] = [
  {
    key: "D1",
    title: "Assemblée générale de relance de l'Amicale",
    type: "ag",
    date: "2026-06-27",
    hours: 10,
    minutes: 0,
    durationMinutes: 180,
    location: DONKA_LOCATION,
    status: "tenue",
    presentCount: 8,
    minutes_: {
      agenda: "1. Bilan de l'Amicale depuis 2025\n2. Fixation de la cotisation\n3. Projet de soutien au lycée",
      decisions:
        "- Cotisation mensuelle fixée à 25 000 GNF à compter de juillet 2026.\n- Adoption d'AssoHub pour le suivi des membres et des cotisations.\n- Projet de dotation de la bibliothèque du lycée à étudier.",
      actions:
        "- Trésorier : ouvrir le suivi des cotisations à partir de juillet.\n- Secrétaire : prendre contact avec le proviseur au sujet de la bibliothèque.",
      body:
        "Le samedi 27 juin 2026, à 10 heures, les membres de l'Amicale des Anciens du Lycée de Donka se sont réunis en assemblée générale dans la salle polyvalente du lycée.\n\n" +
        "Après un bilan des activités depuis la relance de l'Amicale en 2025, l'assemblée a fixé la cotisation mensuelle à 25 000 GNF à compter de juillet 2026 et adopté AssoHub pour la tenue du fichier des membres.\n\n" +
        "Un projet de dotation de la bibliothèque du lycée en manuels scolaires sera étudié par le bureau. La séance a été levée à 13 heures.",
    },
  },
  {
    key: "D2",
    title: "Réunion de bureau — rentrée scolaire",
    type: "bureau",
    date: "2026-08-29",
    hours: 17,
    minutes: 0,
    durationMinutes: 90,
    location: DONKA_LOCATION,
    status: "tenue",
    presentCount: 7,
    minutes_: {
      agenda: "1. Point sur les cotisations\n2. Dotation de la bibliothèque du lycée",
      decisions:
        "- Cotisations de juillet et août majoritairement réglées.\n- Remise de manuels à la bibliothèque prévue en octobre, en présence du proviseur.",
      actions: "- Secrétaire : établir la liste des manuels avec l'équipe pédagogique.",
      body:
        "Le samedi 29 août 2026, à 17 heures, le bureau de l'Amicale s'est réuni au lycée de Donka.\n\n" +
        "Le trésorier a fait le point sur les cotisations : la grande majorité des membres est à jour pour juillet et août. La remise de manuels à la bibliothèque du lycée est prévue en octobre, en présence du proviseur. La séance a été levée à 18 h 30.",
    },
  },
];

function buildDonka(ctx: OrgContext): OrgPlan {
  const rng = mulberry32(DONKA_SEED);
  const plan = emptyPlan("Amicale de Donka");

  const { members, inserts } = seedMembers(rng, ctx.organizationId, ctx.founderMemberId, DONKA_MEMBERS, DONKA_PROFESSIONS);
  plan.members = inserts;
  plan.founderUpdate = { joinedAt: "2025-02-08" };
  assertEqual(members.length, 10, "membres Donka");

  const monthlyType: CotisationTypeInsert = {
    id: newId(),
    organizationId: ctx.organizationId,
    name: "Cotisation mensuelle",
    description: "Fixée par l'AG du 27/06/2026.",
    defaultAmount: gnf(25_000),
    frequency: "monthly",
    createdAt: at("2026-06-29", 10),
    updatedAt: at("2026-06-29", 10),
  };
  plan.cotisationTypes.push(monthlyType);

  for (const [i, period] of DONKA_MONTHS.entries()) {
    const redevables = members.filter((m) => isActiveOn(m, period.periodStart));
    const unpaid = new Set(
      shuffle(rng, redevables.filter((m) => !m.founder)).slice(0, DONKA_UNPAID_TARGETS[i] ?? 0).map((m) => m.key),
    );
    for (const m of redevables) {
      const cotisation: CotisationInsert = {
        id: newId(),
        organizationId: ctx.organizationId,
        cotisationTypeId: monthlyType.id,
        memberId: m.id,
        dueAmount: gnf(25_000),
        periodLabel: period.label,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        dueDate: period.periodEnd,
        status: "en_attente",
        createdAt: at(period.periodStart, 7),
        updatedAt: at(period.periodStart, 7),
      };
      plan.cotisations.push(cotisation);
      if (unpaid.has(m.key)) continue;

      const maxDay = period.label === REFERENCE_DATE.slice(0, 7) ? Number(REFERENCE_DATE.slice(8)) - 1 : 28;
      const day = rng() < 0.8 ? randInt(rng, 1, 10) : randInt(rng, 11, maxDay);
      const paidAt = ymd(2026, period.index + 1, day);
      const method = rng() < 0.85 ? m.method : weightedPick(rng, METHOD_WEIGHTS);
      const hours = randInt(rng, 8, 21);
      const minutes = randInt(rng, 0, 59);
      paymentWithTransaction(ctx, plan, {
        cotisation, member: m, typeName: monthlyType.name, frequency: "monthly",
        amount: gnf(25_000), paidAt, method,
        reference: paymentReference(rng, method, paidAt, hours, minutes), hours, minutes,
      });
    }
  }

  buildMeetings(rng, ctx, plan, members, DONKA_MEETINGS, new Set(["founder", "alpha-oumar-diallo", "mamadou-saliou-barry"]));
  return plan;
}

// ─── Documents ────────────────────────────────────────────────────────────────

/**
 * À compléter dans un prochain commit, à partir de `scripts/demo-files/`
 * (manifest.json) : upload via le wrapper Blob de l'application, rattachement
 * aux réunions M01/M03/M04/M06/M07 et aux paiements P01–P05, mise à jour de
 * `organization_storage_usage`. `uploaded_by_user_id` = compte propriétaire
 * (Mariama) pour tous les documents — le champ `uploaded_by` du manifest est
 * ignoré, aucun compte n'est créé.
 */
async function seedDocuments(): Promise<void> {
  // Volontairement vide.
}

// ─── Exécution ────────────────────────────────────────────────────────────────

/**
 * `--dry-run` : construit les plans et exécute toutes les assertions de
 * cohérence sans jamais ouvrir de connexion (contexte fictif).
 */
function dryRun(): void {
  for (const [label, build] of [["REFEM", buildRefem], ["Amicale de Donka", buildDonka]] as const) {
    const plan = build({ organizationId: "dry-run", ownerUserId: "dry-run", founderMemberId: "dry-run" });
    const monthly = plan.cotisations.filter((c) => c.cotisationTypeId === plan.cotisationTypes[0]?.id);
    const due = monthly.reduce((s, c) => s + c.dueAmount, 0);
    const monthlyIds = new Set(monthly.map((c) => c.id));
    const paid = plan.payments.filter((p) => monthlyIds.has(p.cotisationId)).reduce((s, p) => s + p.amount, 0);
    const methods = new Map<string, number>();
    for (const p of plan.payments) methods.set(p.paymentMethod, (methods.get(p.paymentMethod) ?? 0) + 1);
    console.log(
      `🧪 ${label} — ${plan.members.length} membres, ${plan.cotisations.length} cotisations, ${plan.payments.length} paiements, ` +
        `${plan.transactions.length} transactions, ${plan.reminders.length} relances, ${plan.meetings.length} réunions, ` +
        `${plan.attendance.length} présences, ${plan.minutes.length} PV — recouvrement mensuel ${((paid / due) * 100).toFixed(1)} %`,
    );
    console.log(
      `   moyens : ${[...methods].map(([m, n]) => `${m} ${((n / plan.payments.length) * 100).toFixed(0)} %`).join(", ")}`,
    );
  }
}

async function main() {
  const reset = process.argv.includes("--reset");
  if (process.argv.includes("--dry-run")) return dryRun();

  const { db } = await import("@/lib/db");
  const { and, count, eq, isNull, sql } = await import("drizzle-orm");
  const { member, organization } = await import("@/lib/db/auth-schema");
  const { associationMembers } = await import("@/lib/db/members-schema");
  const cot = await import("@/lib/db/cotisations-schema");
  const { transactions } = await import("@/lib/db/transactions-schema");
  const mtg = await import("@/lib/db/meetings-schema");
  const { documents } = await import("@/lib/db/documents-schema");

  type Query = BatchItem<"pg">;
  const CHUNK = 100;
  const chunked = <T,>(rows: T[], insert: (chunk: T[]) => Query): Query[] => {
    const out: Query[] = [];
    for (let i = 0; i < rows.length; i += CHUNK) out.push(insert(rows.slice(i, i + CHUNK)));
    return out;
  };

  async function resolveContext(organizationId: string): Promise<{ ctx: OrgContext; name: string }> {
    const [org] = await db
      .select({ name: organization.name })
      .from(organization)
      .where(eq(organization.id, organizationId));
    if (!org) throw new Error(`Organisation introuvable : ${organizationId}`);

    // Lecture seule de `member` (Better-Auth) : le propriétaire tient les
    // droits d'administration (canManageDocuments teste `owner` en premier).
    const [owner] = await db
      .select({ userId: member.userId })
      .from(member)
      .where(and(eq(member.organizationId, organizationId), eq(member.role, "owner")))
      .orderBy(member.createdAt)
      .limit(1);
    if (!owner) throw new Error(`${org.name} : aucun membre Better-Auth de rôle owner.`);

    const [founder] = await db
      .select({ id: associationMembers.id })
      .from(associationMembers)
      .where(
        and(
          eq(associationMembers.organizationId, organizationId),
          eq(associationMembers.userId, owner.userId),
          isNull(associationMembers.deletedAt),
        ),
      )
      .limit(1);
    if (!founder) {
      throw new Error(`${org.name} : fiche fondatrice absente — lancer d'abord npm run backfill:founders.`);
    }

    return { ctx: { organizationId, ownerUserId: owner.userId, founderMemberId: founder.id }, name: org.name };
  }

  async function assertCanWrite(organizationId: string, name: string): Promise<void> {
    const [docs] = await db
      .select({ n: count() })
      .from(documents)
      .where(eq(documents.organizationId, organizationId));
    if ((docs?.n ?? 0) > 0) {
      throw new Error(
        `${name} : ${docs?.n} document(s) présent(s). Le reset ne supprime pas les blobs — suppression manuelle requise avant de re-seeder.`,
      );
    }
    if (reset) return;

    const counts = await Promise.all([
      db.select({ n: count() }).from(cot.cotisationTypes).where(eq(cot.cotisationTypes.organizationId, organizationId)),
      db.select({ n: count() }).from(mtg.meetings).where(eq(mtg.meetings.organizationId, organizationId)),
      db.select({ n: count() }).from(transactions).where(eq(transactions.organizationId, organizationId)),
      db
        .select({ n: count() })
        .from(associationMembers)
        .where(and(eq(associationMembers.organizationId, organizationId), isNull(associationMembers.userId))),
    ]);
    if (counts.some(([row]) => (row?.n ?? 0) > 0)) {
      throw new Error(`${name} contient déjà des données métier. Relancer avec --reset (npm run seed:demo -- --reset).`);
    }
  }

  /** Suppression physique des données métier de l'org (dev uniquement), ordre des FK. */
  function resetQueries(organizationId: string): Query[] {
    return [
      db.delete(transactions).where(eq(transactions.organizationId, organizationId)),
      db.delete(cot.paymentReminders).where(eq(cot.paymentReminders.organizationId, organizationId)),
      db.delete(cot.payments).where(eq(cot.payments.organizationId, organizationId)),
      db.delete(cot.cotisations).where(eq(cot.cotisations.organizationId, organizationId)),
      db.delete(cot.cotisationTypes).where(eq(cot.cotisationTypes.organizationId, organizationId)),
      db.delete(mtg.minutes).where(eq(mtg.minutes.organizationId, organizationId)),
      db.delete(mtg.meetingAttendance).where(eq(mtg.meetingAttendance.organizationId, organizationId)),
      db.delete(mtg.meetings).where(eq(mtg.meetings.organizationId, organizationId)),
      // Les fiches liées à un compte (fondatrice comprise) sont conservées.
      db
        .delete(associationMembers)
        .where(and(eq(associationMembers.organizationId, organizationId), isNull(associationMembers.userId))),
    ];
  }

  function writeQueries(ctx: OrgContext, plan: OrgPlan): Query[] {
    return [
      db
        .update(associationMembers)
        .set(plan.founderUpdate)
        .where(and(eq(associationMembers.id, ctx.founderMemberId), eq(associationMembers.organizationId, ctx.organizationId))),
      ...chunked(plan.members, (rows) => db.insert(associationMembers).values(rows)),
      ...chunked(plan.cotisationTypes, (rows) => db.insert(cot.cotisationTypes).values(rows)),
      ...chunked(plan.cotisations, (rows) => db.insert(cot.cotisations).values(rows)),
      ...chunked(plan.payments, (rows) => db.insert(cot.payments).values(rows)),
      ...chunked(plan.transactions, (rows) => db.insert(transactions).values(rows)),
      ...chunked(plan.reminders, (rows) => db.insert(cot.paymentReminders).values(rows)),
      ...chunked(plan.meetings, (rows) => db.insert(mtg.meetings).values(rows)),
      ...chunked(plan.attendance, (rows) => db.insert(mtg.meetingAttendance).values(rows)),
      ...chunked(plan.minutes, (rows) => db.insert(mtg.minutes).values(rows)),
      // Même CASE que recalculateCotisationStatement (lib/cotisations/payment-recalc.ts).
      db.execute(sql`
        UPDATE cotisations c
        SET paid_amount = t.total,
            status = CASE
              WHEN t.total >= c.due_amount THEN 'paye'
              WHEN t.total > 0 THEN 'partiel'
              WHEN c.due_date < CURRENT_DATE THEN 'en_retard'
              ELSE 'en_attente'
            END
        FROM (
          SELECT c2.id, COALESCE(SUM(p.amount), 0) AS total
          FROM cotisations c2
          LEFT JOIN payments p ON p.cotisation_id = c2.id AND p.deleted_at IS NULL
          WHERE c2.organization_id = ${ctx.organizationId}
          GROUP BY c2.id
        ) t
        WHERE c.id = t.id AND c.organization_id = ${ctx.organizationId} AND c.deleted_at IS NULL
      `),
    ];
  }

  const targets = [
    { organizationId: REFEM_ORG_ID, build: buildRefem },
    { organizationId: DONKA_ORG_ID, build: buildDonka },
  ];

  for (const target of targets) {
    const { ctx, name } = await resolveContext(target.organizationId);
    await assertCanWrite(ctx.organizationId, name);
    const plan = target.build(ctx);

    const [first, ...rest] = [...(reset ? resetQueries(ctx.organizationId) : []), ...writeQueries(ctx, plan)];
    if (!first) continue;
    await db.batch([first, ...rest]);

    const revenue = plan.transactions.filter((t) => t.type === "revenue").reduce((s, t) => s + t.amount, 0) / 100;
    const expense = plan.transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0) / 100;
    console.log(
      `✅ ${name}${reset ? " (reset)" : ""} — ${plan.members.length} membres insérés (+ fondatrice mise à jour), ` +
        `${plan.cotisations.length} cotisations, ${plan.payments.length} paiements, ` +
        `${plan.transactions.length} transactions (recettes ${revenue.toLocaleString("fr-FR")} GNF, dépenses ${expense.toLocaleString("fr-FR")} GNF), ` +
        `${plan.reminders.length} relances, ${plan.meetings.length} réunions, ${plan.attendance.length} présences, ${plan.minutes.length} PV`,
    );
  }

  await seedDocuments();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Échec du seed :", err instanceof Error ? err.message : err);
    process.exit(1);
  });
