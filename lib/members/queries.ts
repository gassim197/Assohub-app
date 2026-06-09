import { and, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { associationMembers } from "@/lib/db/members-schema";
import { MEMBERS_PAGE_SIZE, type MemberStatus } from "./constants";

export type MemberRow = typeof associationMembers.$inferSelect;

export interface ListMembersParams {
  organizationId: string;
  /** Statut métier, ou "all" pour ne pas filtrer. Défaut : "actif". */
  status?: MemberStatus | "all";
  search?: string;
  page?: number;
}

export interface ListMembersResult {
  rows: MemberRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Liste paginée des membres d'une organisation.
 * Multi-tenant strict : filtre toujours par `organizationId` + `deleted_at IS NULL`.
 */
export async function listMembers({
  organizationId,
  status = "actif",
  search,
  page = 1,
}: ListMembersParams): Promise<ListMembersResult> {
  const conditions = [
    eq(associationMembers.organizationId, organizationId),
    isNull(associationMembers.deletedAt),
  ];

  if (status !== "all") {
    conditions.push(eq(associationMembers.status, status));
  }

  const term = search?.trim();
  if (term) {
    const pattern = `%${term}%`;
    conditions.push(
      or(
        ilike(associationMembers.fullName, pattern),
        ilike(associationMembers.phoneNumber, pattern),
        ilike(associationMembers.email, pattern),
      )!,
    );
  }

  const where = and(...conditions);
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * MEMBERS_PAGE_SIZE;

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(associationMembers)
      .where(where)
      .orderBy(desc(associationMembers.createdAt))
      .limit(MEMBERS_PAGE_SIZE)
      .offset(offset),
    db.select({ value: count() }).from(associationMembers).where(where),
  ]);

  const total = Number(totalResult[0]?.value ?? 0);

  return {
    rows,
    total,
    page: safePage,
    pageSize: MEMBERS_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / MEMBERS_PAGE_SIZE)),
  };
}

export interface MemberKpis {
  /** Membres avec status = 'actif'. */
  activeTotal: number;
  /** Membres actifs ayant rejoint dans les 30 derniers jours. */
  new30d: number;
}

export async function getMemberKpis(
  organizationId: string,
): Promise<MemberKpis> {
  const base = and(
    eq(associationMembers.organizationId, organizationId),
    isNull(associationMembers.deletedAt),
    eq(associationMembers.status, "actif"),
  );

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since = thirtyDaysAgo.toISOString().slice(0, 10); // YYYY-MM-DD

  const [activeResult, recentResult] = await Promise.all([
    db.select({ value: count() }).from(associationMembers).where(base),
    db
      .select({ value: count() })
      .from(associationMembers)
      .where(and(base, sql`${associationMembers.joinedAt} >= ${since}`)),
  ]);

  return {
    activeTotal: Number(activeResult[0]?.value ?? 0),
    new30d: Number(recentResult[0]?.value ?? 0),
  };
}
