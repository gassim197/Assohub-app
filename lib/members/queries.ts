import { and, count, desc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { associationMembers } from "@/lib/db/members-schema";
import {
  MEMBERS_PAGE_SIZE,
  PENDING_VALIDATION_STATUS,
  type MemberStatus,
} from "./constants";

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
  } else {
    // "Tous" reste un filtre du CRUD manuel : les demandes d'adhésion en
    // attente de validation (volet 4 de la 4B) ont leur propre onglet dédié,
    // elles ne doivent pas se mélanger au répertoire.
    conditions.push(ne(associationMembers.status, PENDING_VALIDATION_STATUS));
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

/**
 * Récupère un membre par son id, borné à l'organisation et hors archivés.
 * Multi-tenant strict : un `memberId` d'une autre organisation renvoie `null`.
 */
export async function getMemberById(
  organizationId: string,
  memberId: string,
): Promise<MemberRow | null> {
  const [row] = await db
    .select()
    .from(associationMembers)
    .where(
      and(
        eq(associationMembers.id, memberId),
        eq(associationMembers.organizationId, organizationId),
        isNull(associationMembers.deletedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}

export interface MemberKpis {
  /** Membres présents dans l'annuaire, tous statuts confondus (hors supprimés). */
  total: number;
  /** Membres avec status = 'actif'. */
  activeTotal: number;
  /** Membres actifs ayant rejoint dans les 30 derniers jours. */
  new30d: number;
}

export async function getMemberKpis(
  organizationId: string,
): Promise<MemberKpis> {
  const inOrg = and(
    eq(associationMembers.organizationId, organizationId),
    isNull(associationMembers.deletedAt),
    // Les demandes d'adhésion en attente de validation ne sont pas encore
    // des membres : exclues des KPI comme du répertoire.
    ne(associationMembers.status, PENDING_VALIDATION_STATUS),
  );
  const active = and(inOrg, eq(associationMembers.status, "actif"));

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since = thirtyDaysAgo.toISOString().slice(0, 10); // YYYY-MM-DD

  const [totalResult, activeResult, recentResult] = await Promise.all([
    db.select({ value: count() }).from(associationMembers).where(inOrg),
    db.select({ value: count() }).from(associationMembers).where(active),
    db
      .select({ value: count() })
      .from(associationMembers)
      .where(and(active, sql`${associationMembers.joinedAt} >= ${since}`)),
  ]);

  return {
    total: Number(totalResult[0]?.value ?? 0),
    activeTotal: Number(activeResult[0]?.value ?? 0),
    new30d: Number(recentResult[0]?.value ?? 0),
  };
}

/**
 * Demandes d'adhésion en attente de validation (volet 4 de la 4B, checkpoint
 * 3) : lignes créées par `registerAndJoinViaLink`/`joinViaInviteLink` quand
 * le lien partageable utilisé est en mode "validation manuelle".
 */
export async function listPendingJoinRequests(
  organizationId: string,
): Promise<MemberRow[]> {
  return db
    .select()
    .from(associationMembers)
    .where(
      and(
        eq(associationMembers.organizationId, organizationId),
        eq(associationMembers.status, PENDING_VALIDATION_STATUS),
        isNull(associationMembers.deletedAt),
      ),
    )
    .orderBy(desc(associationMembers.createdAt));
}
