import { prisma, type UserRole, type AdminRole } from '@sevalink/db';
import { DomainError, ErrorCode, NotFoundError } from '@sevalink/types';

const USER_LIST_SELECT = {
  id: true,
  phone: true,
  fullName: true,
  email: true,
  role: true,
  adminRole: true,
  city: true,
  area: true,
  isActive: true,
  isVerified: true,
  walletBalance: true,
  loyaltyPoints: true,
  createdAt: true,
  _count: {
    select: { customerBookings: true },
  },
} as const;

export async function listUsers(args: {
  search?: string | undefined;
  role?: UserRole | undefined;
  active?: boolean | undefined;
  sortBy?: 'createdAt' | 'fullName' | 'walletBalance';
  sortDir?: 'asc' | 'desc';
  limit: number;
  cursor?: string | undefined;
}) {
  const where: Record<string, unknown> = { deletedAt: null };
  if (args.role) where['role'] = args.role;
  if (args.active !== undefined) where['isActive'] = args.active;
  if (args.search) {
    const q = args.search.trim();
    where['OR'] = [
      { phone: { contains: q } },
      { fullName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }

  const sortBy = args.sortBy ?? 'createdAt';
  const sortDir = args.sortDir ?? 'desc';

  const rows = await prisma.user.findMany({
    where,
    orderBy: { [sortBy]: sortDir },
    take: args.limit + 1,
    ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
    select: USER_LIST_SELECT,
  });

  const hasMore = rows.length > args.limit;
  const items = hasMore ? rows.slice(0, args.limit) : rows;
  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]!.id : null,
  };
}

/**
 * Set or clear adminRole on a user. Mostly used by super-admins from
 * the /admins page to promote/demote ops staff. Rules:
 *   - target must have role=admin (else 400)
 *   - cannot demote the last `super` admin (else they lock everyone out
 *     of the /admins page itself)
 *   - cannot demote self if you are the last super
 */
export async function setAdminRole(input: {
  userId: string;
  adminRole: AdminRole;
  actorId: string;
}) {
  const target = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, role: true, adminRole: true },
  });
  if (!target) throw new NotFoundError('User not found');
  if (target.role !== 'admin') {
    throw new DomainError(
      ErrorCode.SL_900_VALIDATION_ERROR,
      'Can only set adminRole on users with role=admin. Promote to admin first.',
    );
  }

  // Last-super safety
  if (target.adminRole === 'super' && input.adminRole !== 'super') {
    const superCount = await prisma.user.count({
      where: { role: 'admin', adminRole: 'super', isActive: true },
    });
    if (superCount <= 1) {
      throw new DomainError(
        ErrorCode.SL_900_VALIDATION_ERROR,
        'Cannot demote the last super-admin.',
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id: input.userId },
    data: { adminRole: input.adminRole },
    select: { id: true, phone: true, fullName: true, adminRole: true },
  });
  return updated;
}

/**
 * Bulk activate/suspend. Each row goes through `setActive` so the
 * last-admin guard + self-suspend guard still apply per row. Aggregates
 * results into ok/failed lists.
 */
export async function bulkSetActive(input: {
  ids: string[];
  isActive: boolean;
  actorId: string;
}): Promise<{ ok: string[]; failed: Array<{ id: string; reason: string }> }> {
  const ok: string[] = [];
  const failed: Array<{ id: string; reason: string }> = [];
  for (const id of input.ids) {
    try {
      await setActive({ userId: id, isActive: input.isActive, actorId: input.actorId });
      ok.push(id);
    } catch (e) {
      failed.push({ id, reason: e instanceof Error ? e.message : 'unknown' });
    }
  }
  return { ok, failed };
}

export async function getUserDetail(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      ...USER_LIST_SELECT,
      preferredLang: true,
      referralCode: true,
      updatedAt: true,
      professional: {
        select: {
          id: true,
          professionalTitle: true,
          trustScore: true,
          trustBadge: true,
          availabilityStatus: true,
          aadhaarVerified: true,
          panVerified: true,
          bankVerified: true,
          policeVerified: true,
          totalBookings: true,
        },
      },
    },
  });
  if (!user) throw new NotFoundError('User not found');
  return user;
}

/**
 * Promote/demote a user. Refuses to leave the system with zero admins —
 * if you're trying to demote yourself + you're the only admin, blocked.
 */
export async function changeRole(input: { userId: string; newRole: UserRole; actorId: string }) {
  const target = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, role: true },
  });
  if (!target) throw new NotFoundError('User not found');
  if (target.role === input.newRole) return target;

  // Safety: don't let admins lock everyone out.
  if (target.role === 'admin' && input.newRole !== 'admin') {
    const adminCount = await prisma.user.count({ where: { role: 'admin', isActive: true } });
    if (adminCount <= 1) {
      throw new DomainError(
        ErrorCode.SL_900_VALIDATION_ERROR,
        'Cannot demote the last active admin.',
      );
    }
  }

  // Promoting a customer to professional needs a Professional row (matcher
  // + KYC routes depend on it). Mirrors what findOrCreateUser does on first
  // OTP login.
  if (input.newRole === 'professional') {
    const hasProRow = await prisma.professional.findUnique({
      where: { userId: input.userId },
      select: { id: true },
    });
    if (!hasProRow) {
      await prisma.professional.create({ data: { userId: input.userId } });
    }
  }

  const updated = await prisma.user.update({
    where: { id: input.userId },
    data: { role: input.newRole },
    select: { id: true, phone: true, role: true, fullName: true },
  });
  return updated;
}

export async function setActive(input: { userId: string; isActive: boolean; actorId: string }) {
  const target = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, role: true },
  });
  if (!target) throw new NotFoundError('User not found');

  if (!input.isActive && target.role === 'admin') {
    const adminCount = await prisma.user.count({ where: { role: 'admin', isActive: true } });
    if (adminCount <= 1) {
      throw new DomainError(
        ErrorCode.SL_900_VALIDATION_ERROR,
        'Cannot suspend the last active admin.',
      );
    }
  }

  if (input.userId === input.actorId && !input.isActive) {
    throw new DomainError(
      ErrorCode.SL_900_VALIDATION_ERROR,
      'You cannot suspend your own account.',
    );
  }

  const updated = await prisma.user.update({
    where: { id: input.userId },
    data: { isActive: input.isActive },
    select: { id: true, phone: true, isActive: true },
  });
  return updated;
}
