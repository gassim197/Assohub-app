import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { cotisationTypes, cotisations } from "@/lib/db/cotisations-schema";
import { associationMembers } from "@/lib/db/members-schema";
import { COTISATIONS_PAGE_SIZE } from "./constants";
import { getMonthRange } from "./generation";

export type CotisationTypeRow = typeof cotisationTypes.$inferSelect;

/**
 * Liste des types de cotisations d'une organisation, non archivés.
 * Multi-tenant strict : borné à `organizationId` + `deleted_at IS NULL`.
 */
export async function getCotisationTypes(
  organizationId: string,
): Promise<CotisationTypeRow[]> {
  return db
    .select()
    .from(cotisationTypes)
    .where(
      and(
        eq(cotisationTypes.organizationId, organizationId),
        isNull(cotisationTypes.deletedAt),
      ),
    )
    .orderBy(desc(cotisationTypes.createdAt));
}

/**
 * Récupère un type de cotisation par son id, borné à l'organisation et hors
 * archivés. Un `typeId` d'une autre organisation renvoie `null`.
 */
export async function getCotisationTypeById(
  organizationId: string,
  typeId: string,
): Promise<CotisationTypeRow | null> {
  const [row] = await db
    .select()
    .from(cotisationTypes)
    .where(
      and(
        eq(cotisationTypes.id, typeId),
        eq(cotisationTypes.organizationId, organizationId),
        isNull(cotisationTypes.deletedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}

// ─── Dashboard (checkpoint 3) ────────────────────────────────────────────────

export interface CotisationKpis {
  /** Toujours 0 en 5A : aucun paiement possible avant la 5B. */
  collectedThisMonth: number;
  /** Somme (due_amount - paid_amount) des cotisations en_attente + en_retard. */
  outstanding: number;
  lateCount: number;
  upToDateCount: number;
}

export async function getCotisationKpis(
  organizationId: string,
): Promise<CotisationKpis> {
  const base = and(
    eq(cotisations.organizationId, organizationId),
    isNull(cotisations.deletedAt),
  );

  const [outstandingRow] = await db
    .select({
      outstanding: sql<string>`COALESCE(SUM(${cotisations.dueAmount} - ${cotisations.paidAmount}), 0)`,
      lateCount: sql<string>`COUNT(*) FILTER (WHERE ${cotisations.status} = 'en_retard')`,
    })
    .from(cotisations)
    .where(and(base, inArray(cotisations.status, ["en_attente", "en_retard"])));

  const [paidResult] = await db
    .select({ value: count() })
    .from(cotisations)
    .where(and(base, eq(cotisations.status, "paye")));

  return {
    collectedThisMonth: 0,
    outstanding: Number(outstandingRow?.outstanding ?? 0),
    lateCount: Number(outstandingRow?.lateCount ?? 0),
    upToDateCount: Number(paidResult?.value ?? 0),
  };
}

export interface CotisationWithRelationsRow {
  id: string;
  memberId: string;
  memberFullName: string;
  typeId: string;
  typeName: string;
  frequency: string;
  periodStart: string;
  periodLabel: string;
  dueAmount: number;
  paidAmount: number;
  status: string;
  dueDate: string;
  updatedAt: Date;
}

const cotisationWithRelationsSelection = {
  id: cotisations.id,
  memberId: cotisations.memberId,
  memberFullName: associationMembers.fullName,
  typeId: cotisations.cotisationTypeId,
  typeName: cotisationTypes.name,
  frequency: cotisationTypes.frequency,
  periodStart: cotisations.periodStart,
  periodLabel: cotisations.periodLabel,
  dueAmount: cotisations.dueAmount,
  paidAmount: cotisations.paidAmount,
  status: cotisations.status,
  dueDate: cotisations.dueDate,
  updatedAt: cotisations.updatedAt,
};

/**
 * Les 10 dernières cotisations créées ou modifiées (dashboard, "Cotisations
 * récentes"). Triées par `updated_at` : couvre à la fois création et
 * modification (paiement en 5B, sweep de statut).
 */
export async function listRecentCotisations(
  organizationId: string,
  limit = 10,
): Promise<CotisationWithRelationsRow[]> {
  return db
    .select(cotisationWithRelationsSelection)
    .from(cotisations)
    .innerJoin(associationMembers, eq(cotisations.memberId, associationMembers.id))
    .innerJoin(cotisationTypes, eq(cotisations.cotisationTypeId, cotisationTypes.id))
    .where(
      and(
        eq(cotisations.organizationId, organizationId),
        isNull(cotisations.deletedAt),
      ),
    )
    .orderBy(desc(cotisations.updatedAt))
    .limit(limit);
}

// ─── Onglet "Cotisations dues" (checkpoint 3) ────────────────────────────────

export type DuePeriodFilter = "current" | "last" | "custom";

/** Seuls les deux statuts jamais payés sont sélectionnables dans cet onglet. */
export type DueStatusFilter = "en_attente" | "en_retard" | "all";

export interface ListCotisationsDueParams {
  organizationId: string;
  status?: DueStatusFilter;
  period?: DuePeriodFilter;
  periodFrom?: string;
  periodTo?: string;
  search?: string;
  typeId?: string;
  page?: number;
}

export interface ListCotisationsDueResult {
  rows: CotisationWithRelationsRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Résout un filtre de période en bornes `[from, to]` comparées à `period_start`
 * de la cotisation. "custom" sans bornes valides ne filtre pas (garde-fou).
 */
function resolvePeriodRange(
  period: DuePeriodFilter | undefined,
  periodFrom: string | undefined,
  periodTo: string | undefined,
): { from: string; to: string } | null {
  const today = new Date();

  if (period === "current") return getMonthRange(today, 0);
  if (period === "last") return getMonthRange(today, -1);
  if (period === "custom" && periodFrom && periodTo) {
    return { from: periodFrom, to: periodTo };
  }
  return null;
}

/**
 * Liste paginée des cotisations "dues" (en_attente + en_retard, jamais payé)
 * d'une organisation, avec filtres. Multi-tenant strict.
 */
export async function listCotisationsDue({
  organizationId,
  status = "all",
  period,
  periodFrom,
  periodTo,
  search,
  typeId,
  page = 1,
}: ListCotisationsDueParams): Promise<ListCotisationsDueResult> {
  const conditions = [
    eq(cotisations.organizationId, organizationId),
    isNull(cotisations.deletedAt),
    // L'onglet "dues" n'affiche jamais les cotisations payées/partielles
    // (spec 5A §5) : seuls en_attente et en_retard y apparaissent.
    inArray(cotisations.status, ["en_attente", "en_retard"]),
  ];

  if (status !== "all") {
    conditions.push(eq(cotisations.status, status));
  }

  const range = resolvePeriodRange(period, periodFrom, periodTo);
  if (range) {
    conditions.push(gte(cotisations.periodStart, range.from));
    conditions.push(lte(cotisations.periodStart, range.to));
  }

  if (typeId) {
    conditions.push(eq(cotisations.cotisationTypeId, typeId));
  }

  const term = search?.trim();
  if (term) {
    conditions.push(ilike(associationMembers.fullName, `%${term}%`));
  }

  const where = and(...conditions);
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * COTISATIONS_PAGE_SIZE;

  const [rows, totalResult] = await Promise.all([
    db
      .select(cotisationWithRelationsSelection)
      .from(cotisations)
      .innerJoin(associationMembers, eq(cotisations.memberId, associationMembers.id))
      .innerJoin(cotisationTypes, eq(cotisations.cotisationTypeId, cotisationTypes.id))
      .where(where)
      .orderBy(asc(cotisations.dueDate))
      .limit(COTISATIONS_PAGE_SIZE)
      .offset(offset),
    db
      .select({ value: count() })
      .from(cotisations)
      .innerJoin(associationMembers, eq(cotisations.memberId, associationMembers.id))
      .where(where),
  ]);

  const total = Number(totalResult[0]?.value ?? 0);

  return {
    rows,
    total,
    page: safePage,
    pageSize: COTISATIONS_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / COTISATIONS_PAGE_SIZE)),
  };
}
