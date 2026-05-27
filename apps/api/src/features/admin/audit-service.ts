import { prisma, type AuditAction, type UserRole } from '@sevalink/db';

/**
 * Write a single audit row. Best-effort — if the audit insert fails we
 * log + swallow so the user's primary action still succeeds (audit is
 * post-hoc visibility, not a gate).
 */
export async function recordAudit(input: {
  actorId: string | null;
  actorRole: UserRole | null;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    const data: Record<string, unknown> = {
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    };
    if (input.before !== undefined) data['before'] = input.before;
    if (input.after !== undefined) data['after'] = input.after;
    await prisma.auditLog.create({ data: data as never });
  } catch (err) {
    // Log + continue — audit is best-effort
    console.warn('audit write failed:', err);
  }
}

export async function listAuditLogs(args: {
  actorId?: string | undefined;
  entity?: string | undefined;
  action?: AuditAction | undefined;
  sortDir?: 'asc' | 'desc';
  limit: number;
  cursor?: string | undefined;
}) {
  const where: Record<string, unknown> = {};
  if (args.actorId) where['actorId'] = args.actorId;
  if (args.entity) where['entity'] = args.entity;
  if (args.action) where['action'] = args.action;

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: args.sortDir ?? 'desc' },
    take: args.limit + 1,
    ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      actorId: true,
      actorRole: true,
      action: true,
      entity: true,
      entityId: true,
      ipAddress: true,
      createdAt: true,
      actor: {
        select: { id: true, fullName: true, phone: true },
      },
    },
  });
  const hasMore = rows.length > args.limit;
  const items = hasMore ? rows.slice(0, args.limit) : rows;
  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]!.id : null,
  };
}
