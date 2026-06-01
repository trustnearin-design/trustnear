import { prisma, type Prisma } from '@sevalink/db';
import { ConflictError, NotFoundError, ValidationError } from '@sevalink/types';
import { applyScoreEvent } from '../trust-score/service.js';
import { notifyProApproved, notifyProRejected } from '../notifications/service.js';
import { recordAudit } from './audit-service.js';

/**
 * Phase 3g — Admin "Pending Approvals" service.
 *
 * Backs the admin UI queue: list pros by approval status, read full
 * onboarding snapshot for review, approve / reject. Approval is the
 * trust gate — a pro can ONLY appear in /pros/nearby after an admin
 * flips approval_status to 'approved' here.
 */

export type ApprovalQueueStatus = 'submitted_for_review' | 'rejected' | 'approved' | 'all';

export interface PendingProRow {
  professionalId: string;
  userId: string;
  fullName: string;
  phone: string;
  profilePhoto: string | null;
  approvalStatus: string;
  submittedForReviewAt: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  rejectionFields: string[];
  // Quick verification chips for the queue row
  aadhaarVerified: boolean;
  panVerified: boolean;
  bankVerified: boolean;
  policeDocStatus: string;
  // Primary service for at-a-glance context
  primaryCategory: string | null;
  city: string;
  area: string | null;
}

export async function listPendingApprovals(args: {
  status: ApprovalQueueStatus;
  limit: number;
  offset: number;
}): Promise<{ rows: PendingProRow[]; total: number }> {
  // Prisma's enum-array filter wants a mutable array, not `as const`.
  // Type the where explicitly so TS unifies the branches into one shape.
  const statuses: ('submitted_for_review' | 'rejected' | 'approved')[] = [
    'submitted_for_review',
    'rejected',
    'approved',
  ];
  const where: Prisma.ProfessionalWhereInput =
    args.status === 'all'
      ? { deletedAt: null, approvalStatus: { in: statuses } }
      : { deletedAt: null, approvalStatus: args.status };

  const [rows, total] = await Promise.all([
    prisma.professional.findMany({
      where,
      orderBy: [{ submittedForReviewAt: 'desc' as const }, { createdAt: 'desc' as const }],
      take: args.limit,
      skip: args.offset,
      select: {
        id: true,
        approvalStatus: true,
        submittedForReviewAt: true,
        approvedAt: true,
        rejectionReason: true,
        rejectionFields: true,
        aadhaarVerified: true,
        panVerified: true,
        bankVerified: true,
        policeDocStatus: true,
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            profilePhoto: true,
            city: true,
            area: true,
          },
        },
        serviceOfferings: {
          where: { isActive: true },
          orderBy: { experienceYears: 'desc' },
          take: 1,
          select: { category: { select: { name: true } } },
        },
      },
    }),
    prisma.professional.count({ where }),
  ]);

  return {
    rows: rows.map((r) => ({
      professionalId: r.id,
      userId: r.user.id,
      fullName: r.user.fullName,
      phone: r.user.phone,
      profilePhoto: r.user.profilePhoto,
      approvalStatus: r.approvalStatus,
      submittedForReviewAt: r.submittedForReviewAt?.toISOString() ?? null,
      approvedAt: r.approvedAt?.toISOString() ?? null,
      rejectionReason: r.rejectionReason,
      rejectionFields: r.rejectionFields,
      aadhaarVerified: r.aadhaarVerified,
      panVerified: r.panVerified,
      bankVerified: r.bankVerified,
      policeDocStatus: r.policeDocStatus,
      primaryCategory: r.serviceOfferings[0]?.category.name ?? null,
      city: r.user.city,
      area: r.user.area,
    })),
    total,
  };
}

/**
 * Full review payload — everything the admin needs on one screen so they
 * don't have to bounce between tabs. Includes KYC fields, services, area,
 * schedule, photo URL, police doc URL.
 */
export async function getApprovalReviewDetail(professionalId: string) {
  const pro = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: {
      id: true,
      approvalStatus: true,
      submittedForReviewAt: true,
      approvedAt: true,
      approvedByUserId: true,
      rejectionReason: true,
      rejectionFields: true,
      gender: true,
      dob: true,
      languagesSpoken: true,
      currentAddress: true,
      serviceRadiusKm: true,
      aadhaarVerified: true,
      aadhaarFullName: true,
      aadhaarLastFour: true,
      aadhaarDob: true,
      aadhaarPhotoUrl: true,
      aadhaarFrontUrl: true,
      aadhaarBackUrl: true,
      aadhaarSelfieUrl: true,
      aadhaarDocStatus: true,
      aadhaarFrontOk: true,
      aadhaarBackOk: true,
      aadhaarSelfieOk: true,
      panVerified: true,
      panNumber: true,
      panFullName: true,
      bankVerified: true,
      bankAccountLastFour: true,
      bankAccountHolderName: true,
      ifscCode: true,
      policeDocUrl: true,
      policeDocStatus: true,
      policeDocRejectionNote: true,
      user: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          profilePhoto: true,
          city: true,
          area: true,
          createdAt: true,
        },
      },
      serviceOfferings: {
        where: { isActive: true },
        select: {
          customPrice: true,
          experienceYears: true,
          category: {
            select: { id: true, name: true, slug: true, basePrice: true, priceUnit: true },
          },
        },
      },
      location: {
        select: { latitude: true, longitude: true, updatedAt: true },
      },
      schedules: {
        select: { dayOfWeek: true, startTime: true, endTime: true, isAvailable: true },
        orderBy: { dayOfWeek: 'asc' },
      },
    },
  });

  if (!pro) {
    throw new NotFoundError('Professional not found');
  }
  return pro;
}

export async function approveProfessional(args: {
  professionalId: string;
  adminUserId: string;
  note?: string | undefined;
  ip?: string | null | undefined;
  userAgent?: string | null | undefined;
}): Promise<{ ok: true; approvedAt: string }> {
  const pro = await prisma.professional.findUnique({
    where: { id: args.professionalId },
    select: {
      id: true,
      approvalStatus: true,
      aadhaarDocStatus: true,
      userId: true,
      user: { select: { fullName: true } },
    },
  });
  if (!pro) {
    throw new NotFoundError('Professional not found');
  }
  if (pro.approvalStatus !== 'submitted_for_review') {
    throw new ConflictError(
      `Cannot approve — pro is ${pro.approvalStatus}, not submitted_for_review`,
    );
  }

  const approvedAt = new Date();
  await prisma.professional.update({
    where: { id: pro.id },
    data: {
      approvalStatus: 'approved',
      approvedAt,
      approvedByUserId: args.adminUserId,
      rejectionReason: null,
      rejectionFields: [],
      // Phase-1 manual Aadhaar: approving the pro IS the human verification,
      // so reflect it on the KYC chips. Only flips if docs were uploaded.
      ...(pro.aadhaarDocStatus === 'pending_review'
        ? { aadhaarVerified: true, aadhaarDocStatus: 'approved' as const }
        : {}),
    },
  });

  // Trust score nudge — approval earns the pro starting credibility.
  await applyScoreEvent({
    professionalId: pro.id,
    eventType: 'profile_complete',
    customDelta: 5.0,
    metadata: { event: 'admin_approval', adminUserId: args.adminUserId, note: args.note ?? null },
  }).catch(() => {
    // Non-fatal — approval still succeeds if trust event errors.
  });

  await recordAudit({
    actorId: args.adminUserId,
    actorRole: 'admin',
    action: 'update',
    entity: 'professional',
    entityId: pro.id,
    before: { approvalStatus: 'submitted_for_review' },
    after: { approvalStatus: 'approved', note: args.note ?? null, userId: pro.userId },
    ipAddress: args.ip ?? null,
    userAgent: args.userAgent ?? null,
  });

  // Push notification — best-effort, non-blocking. Pro sees "🎉 Approved!"
  // on their home screen; tapping deep-links to (app)/(tabs).
  await notifyProApproved({
    proUserId: pro.userId,
    proName: pro.user.fullName,
  }).catch(() => {
    // Non-fatal — approval already succeeded
  });

  return { ok: true, approvedAt: approvedAt.toISOString() };
}

/**
 * Revoke an ALREADY-APPROVED pro — takes them offline immediately. Sets
 * approval_status back to 'rejected' (the customer-visibility gate is
 * approval_status === 'approved', so this hides them from /pros/nearby),
 * records the reason, resets the manual-Aadhaar verification so it must
 * be re-reviewed on resubmit, and notifies the pro. They can edit +
 * resubmit through the normal rejected flow.
 */
export async function revokeProfessional(args: {
  professionalId: string;
  adminUserId: string;
  reason: string;
  fields?: string[] | undefined;
  ip?: string | null | undefined;
  userAgent?: string | null | undefined;
}): Promise<{ ok: true }> {
  const pro = await prisma.professional.findUnique({
    where: { id: args.professionalId },
    select: {
      id: true,
      approvalStatus: true,
      aadhaarDocStatus: true,
      userId: true,
      user: { select: { fullName: true } },
    },
  });
  if (!pro) {
    throw new NotFoundError('Professional not found');
  }
  if (pro.approvalStatus !== 'approved') {
    throw new ConflictError(`Cannot revoke — pro is ${pro.approvalStatus}, not approved`);
  }

  const fields = args.fields ?? [];
  await prisma.professional.update({
    where: { id: pro.id },
    data: {
      approvalStatus: 'rejected',
      rejectionReason: args.reason,
      rejectionFields: fields,
      approvedAt: null,
      approvedByUserId: null,
      // Approval WAS the human Aadhaar verification — undo it so a
      // resubmit goes back through manual review instead of staying "approved".
      ...(pro.aadhaarDocStatus === 'approved'
        ? { aadhaarVerified: false, aadhaarDocStatus: 'pending_review' as const }
        : {}),
    },
  });

  await recordAudit({
    actorId: args.adminUserId,
    actorRole: 'admin',
    action: 'update',
    entity: 'professional',
    entityId: pro.id,
    before: { approvalStatus: 'approved' },
    after: {
      approvalStatus: 'rejected',
      revoked: true,
      rejectionReason: args.reason,
      rejectionFields: fields,
      userId: pro.userId,
    },
    ipAddress: args.ip ?? null,
    userAgent: args.userAgent ?? null,
  });

  // Reuse the rejection push — pro sees "Application needs fixes" with the
  // reason + fields, deep-links to the onboarding welcome screen.
  await notifyProRejected({
    proUserId: pro.userId,
    proName: pro.user.fullName,
    reason: args.reason,
    fields,
  }).catch(() => {
    // Non-fatal — revoke already persisted
  });

  return { ok: true };
}

export async function rejectProfessional(args: {
  professionalId: string;
  adminUserId: string;
  reason: string;
  fields: string[];
  ip?: string | null | undefined;
  userAgent?: string | null | undefined;
}): Promise<{ ok: true }> {
  const pro = await prisma.professional.findUnique({
    where: { id: args.professionalId },
    select: {
      id: true,
      approvalStatus: true,
      userId: true,
      user: { select: { fullName: true } },
    },
  });
  if (!pro) {
    throw new NotFoundError('Professional not found');
  }
  if (pro.approvalStatus !== 'submitted_for_review') {
    throw new ConflictError(
      `Cannot reject — pro is ${pro.approvalStatus}, not submitted_for_review`,
    );
  }

  // Validate field names — only allow known step keys
  const KNOWN_FIELDS = new Set([
    'personal',
    'photo',
    'services',
    'area',
    'schedule',
    'aadhaar',
    'pan',
    'bank',
    'police',
  ]);
  const bad = args.fields.filter((f) => !KNOWN_FIELDS.has(f));
  if (bad.length > 0) {
    throw new ValidationError(`Unknown rejection fields: ${bad.join(', ')}`);
  }

  await prisma.professional.update({
    where: { id: pro.id },
    data: {
      approvalStatus: 'rejected',
      rejectionReason: args.reason,
      rejectionFields: args.fields,
    },
  });

  await recordAudit({
    actorId: args.adminUserId,
    actorRole: 'admin',
    action: 'update',
    entity: 'professional',
    entityId: pro.id,
    before: { approvalStatus: 'submitted_for_review' },
    after: {
      approvalStatus: 'rejected',
      rejectionReason: args.reason,
      rejectionFields: args.fields,
      userId: pro.userId,
    },
    ipAddress: args.ip ?? null,
    userAgent: args.userAgent ?? null,
  });

  // Push notification with the rejection reason + fields[] embedded.
  // Pro sees "Application needs fixes" notification; tapping deep-links
  // to /(onboarding)/welcome where the rejection banner renders the same
  // reason + lists the fields to fix.
  await notifyProRejected({
    proUserId: pro.userId,
    proName: pro.user.fullName,
    reason: args.reason,
    fields: args.fields,
  }).catch(() => {
    // Non-fatal — rejection already persisted
  });

  return { ok: true };
}
