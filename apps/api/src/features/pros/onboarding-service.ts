import { prisma, type PoliceDocStatus, type Gender } from '@sevalink/db';
import { NotFoundError, ValidationError, ConflictError } from '@sevalink/types';
import { applyScoreEvent } from '../trust-score/service.js';
import type { z } from 'zod';
import type {
  PersonalInfoSchema,
  ServicesInputSchema,
  AreaInputSchema,
  ScheduleInputSchema,
} from './onboarding-schemas.js';

/**
 * Phase 3g — Pro onboarding wizard server-side state machine.
 *
 * Each `save*` function performs one wizard step's persistence; all are
 * idempotent (re-running with the same payload is a no-op effectively).
 * `submitForReview` is the gate — it re-validates every step's data so
 * a client cannot smuggle a half-filled profile to the admin queue.
 *
 * Status field semantics (kept narrow for MVP):
 *   draft                → pro is still filling the wizard
 *   submitted_for_review → pro hit Submit; visible in admin queue
 *   approved             → admin OK'd; pro is live in /pros/nearby
 *   rejected             → admin rejected with reason; pro can edit + resubmit
 * The intermediate enum values (personal_info_done etc.) are reserved for
 * future analytics — UI derives "what's next" from per-step booleans below.
 */

// ─── Step-completion predicates ───────────────────────────────────────
// One per wizard step — keep the rules in ONE place so submit + status
// stay in sync. Each takes the same shape (the rich profile snapshot
// below) and returns true if that step is "done" enough to count toward
// submission.

interface ProfileSnapshot {
  proId: string;
  gender: Gender | null;
  dob: Date | null;
  languagesSpoken: string[];
  currentAddress: string | null;
  serviceRadiusKm: number;
  aadhaarVerified: boolean;
  panVerified: boolean;
  bankVerified: boolean;
  policeDocStatus: PoliceDocStatus;
  profilePhoto: string | null;
  fullName: string;
  serviceCount: number;
  scheduleHasAnyAvailable: boolean;
  hasLocation: boolean;
}

const STEP_DONE = {
  personal: (s: ProfileSnapshot) =>
    s.fullName.trim().length >= 2 &&
    s.gender !== null &&
    s.dob !== null &&
    s.languagesSpoken.length >= 1 &&
    (s.currentAddress?.trim().length ?? 0) >= 10,
  photo: (s: ProfileSnapshot) => s.profilePhoto !== null,
  services: (s: ProfileSnapshot) => s.serviceCount >= 1,
  area: (s: ProfileSnapshot) => s.hasLocation && s.serviceRadiusKm > 0,
  schedule: (s: ProfileSnapshot) => s.scheduleHasAnyAvailable,
  aadhaar: (s: ProfileSnapshot) => s.aadhaarVerified,
  pan: (s: ProfileSnapshot) => s.panVerified,
  bank: (s: ProfileSnapshot) => s.bankVerified,
  // Police is OPTIONAL during initial submit. Admin can approve a pro
  // without it; pro can upload before or after admin review. Reflected
  // in REQUIRED_STEPS below (police not included).
  police: (s: ProfileSnapshot) => s.policeDocStatus === 'approved',
} as const;

export type WizardStepKey = keyof typeof STEP_DONE;

const REQUIRED_STEPS: WizardStepKey[] = [
  'personal',
  'photo',
  'services',
  'area',
  'schedule',
  'aadhaar',
  'pan',
  'bank',
];

const ALL_STEPS: WizardStepKey[] = [...REQUIRED_STEPS, 'police'];

// ─── Loader ───────────────────────────────────────────────────────────

async function loadSnapshot(userId: string): Promise<ProfileSnapshot> {
  const pro = await prisma.professional.findUnique({
    where: { userId },
    select: {
      id: true,
      gender: true,
      dob: true,
      languagesSpoken: true,
      currentAddress: true,
      serviceRadiusKm: true,
      aadhaarVerified: true,
      panVerified: true,
      bankVerified: true,
      policeDocStatus: true,
      user: { select: { profilePhoto: true, fullName: true } },
      location: { select: { professionalId: true } },
      serviceOfferings: { where: { isActive: true }, select: { id: true } },
      schedules: { where: { isAvailable: true }, select: { id: true } },
    },
  });

  if (!pro) {
    throw new NotFoundError('Professional profile not found for this user');
  }

  return {
    proId: pro.id,
    gender: pro.gender,
    dob: pro.dob,
    languagesSpoken: pro.languagesSpoken,
    currentAddress: pro.currentAddress,
    serviceRadiusKm: pro.serviceRadiusKm,
    aadhaarVerified: pro.aadhaarVerified,
    panVerified: pro.panVerified,
    bankVerified: pro.bankVerified,
    policeDocStatus: pro.policeDocStatus,
    profilePhoto: pro.user.profilePhoto,
    fullName: pro.user.fullName,
    serviceCount: pro.serviceOfferings.length,
    scheduleHasAnyAvailable: pro.schedules.length > 0,
    hasLocation: pro.location !== null,
  };
}

// ─── Public: status ───────────────────────────────────────────────────

export interface OnboardingStatusResponse {
  approvalStatus: string;
  steps: Record<WizardStepKey, { done: boolean; required: boolean }>;
  progress: {
    requiredDone: number;
    requiredTotal: number;
    requiredRemaining: WizardStepKey[];
    optionalDone: number;
    optionalTotal: number;
  };
  canSubmit: boolean;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  rejectionFields: string[];
}

export async function getOnboardingStatus(userId: string): Promise<OnboardingStatusResponse> {
  const [pro, snapshot] = await Promise.all([
    prisma.professional.findUnique({
      where: { userId },
      select: {
        approvalStatus: true,
        submittedForReviewAt: true,
        approvedAt: true,
        rejectionReason: true,
        rejectionFields: true,
      },
    }),
    loadSnapshot(userId),
  ]);

  if (!pro) {
    throw new NotFoundError('Professional profile not found for this user');
  }

  const steps = Object.fromEntries(
    ALL_STEPS.map((key) => [
      key,
      {
        done: STEP_DONE[key](snapshot),
        required: REQUIRED_STEPS.includes(key),
      },
    ]),
  ) as Record<WizardStepKey, { done: boolean; required: boolean }>;

  const requiredRemaining = REQUIRED_STEPS.filter((k) => !steps[k].done);
  const requiredDone = REQUIRED_STEPS.length - requiredRemaining.length;
  const optionalSteps = ALL_STEPS.filter((k) => !REQUIRED_STEPS.includes(k));
  const optionalDone = optionalSteps.filter((k) => steps[k].done).length;

  return {
    approvalStatus: pro.approvalStatus,
    steps,
    progress: {
      requiredDone,
      requiredTotal: REQUIRED_STEPS.length,
      requiredRemaining,
      optionalDone,
      optionalTotal: optionalSteps.length,
    },
    canSubmit: pro.approvalStatus === 'draft' && requiredRemaining.length === 0,
    submittedAt: pro.submittedForReviewAt?.toISOString() ?? null,
    approvedAt: pro.approvedAt?.toISOString() ?? null,
    rejectionReason: pro.rejectionReason,
    rejectionFields: pro.rejectionFields,
  };
}

// ─── Guards ───────────────────────────────────────────────────────────

/**
 * Block edits once the pro has hit Submit and is awaiting (or has cleared)
 * admin review. Only `rejected` and `draft` states allow edits. On reject,
 * the pro lands back in draft-like edit mode (status stays `rejected`
 * until they save anything — first save flips back to `draft`).
 */
async function assertEditable(userId: string): Promise<{ proId: string; approvalStatus: string }> {
  const pro = await prisma.professional.findUnique({
    where: { userId },
    select: { id: true, approvalStatus: true },
  });
  if (!pro) {
    throw new NotFoundError('Professional profile not found for this user');
  }
  if (pro.approvalStatus === 'submitted_for_review' || pro.approvalStatus === 'approved') {
    throw new ConflictError(
      `Profile is ${pro.approvalStatus} — cannot edit. Contact support to make changes.`,
    );
  }
  return { proId: pro.id, approvalStatus: pro.approvalStatus };
}

/**
 * After every step save, if the pro was previously `rejected` we drop them
 * back to `draft` so the admin queue doesn't re-show stale "rejected"
 * cards. Clears rejection reason + fields atomically.
 */
async function clearRejectionIfPresent(
  tx: typeof prisma | Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  proId: string,
  currentStatus: string,
): Promise<void> {
  if (currentStatus === 'rejected') {
    await tx.professional.update({
      where: { id: proId },
      data: {
        approvalStatus: 'draft',
        rejectionReason: null,
        rejectionFields: [],
      },
    });
  }
}

// ─── Save: personal info ──────────────────────────────────────────────

export async function savePersonalInfo(
  userId: string,
  data: z.infer<typeof PersonalInfoSchema>,
): Promise<{ ok: true }> {
  const { proId, approvalStatus } = await assertEditable(userId);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName,
        ...(data.city ? { city: data.city } : {}),
        ...(data.area ? { area: data.area } : {}),
      },
    });
    await tx.professional.update({
      where: { id: proId },
      data: {
        gender: data.gender,
        dob: new Date(data.dob),
        languagesSpoken: data.languagesSpoken,
        currentAddress: data.currentAddress,
      },
    });
    await clearRejectionIfPresent(tx, proId, approvalStatus);
  });

  return { ok: true };
}

// ─── Save: profile photo ──────────────────────────────────────────────

export async function savePhoto(
  userId: string,
  photoUrl: string,
): Promise<{ ok: true; url: string }> {
  const { proId, approvalStatus } = await assertEditable(userId);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { profilePhoto: photoUrl },
    });
    await clearRejectionIfPresent(tx, proId, approvalStatus);
  });

  return { ok: true, url: photoUrl };
}

// ─── Save: services + pricing ─────────────────────────────────────────

export async function saveServices(
  userId: string,
  data: z.infer<typeof ServicesInputSchema>,
): Promise<{ ok: true; count: number }> {
  const { proId, approvalStatus } = await assertEditable(userId);

  // Validate that all categoryIds exist + are active leaf categories.
  const categories = await prisma.serviceCategory.findMany({
    where: {
      id: { in: data.services.map((s) => s.categoryId) },
      isActive: true,
      deletedAt: null,
      parentId: { not: null }, // only LEAF categories can be offered
    },
    select: { id: true },
  });
  if (categories.length !== data.services.length) {
    throw new ValidationError('One or more categories are invalid or not active');
  }

  await prisma.$transaction(async (tx) => {
    // Replace strategy: delete all existing offerings, recreate from input.
    // Bookings table FKs on category, not offering, so this is safe.
    await tx.proServiceOffering.deleteMany({ where: { professionalId: proId } });
    await tx.proServiceOffering.createMany({
      data: data.services.map((s) => ({
        professionalId: proId,
        categoryId: s.categoryId,
        customPrice: s.customPrice ?? null,
        experienceYears: s.experienceYears,
        isActive: true,
      })),
    });
    await clearRejectionIfPresent(tx, proId, approvalStatus);
  });

  return { ok: true, count: data.services.length };
}

// ─── Save: working area ───────────────────────────────────────────────

export async function saveArea(
  userId: string,
  data: z.infer<typeof AreaInputSchema>,
): Promise<{ ok: true }> {
  const { proId, approvalStatus } = await assertEditable(userId);

  await prisma.$transaction(async (tx) => {
    await tx.proLocation.upsert({
      where: { professionalId: proId },
      create: {
        professionalId: proId,
        latitude: data.lat,
        longitude: data.lng,
      },
      update: {
        latitude: data.lat,
        longitude: data.lng,
      },
    });
    await tx.professional.update({
      where: { id: proId },
      data: { serviceRadiusKm: data.radiusKm },
    });
    // Keep User lat/lng aligned — used by some legacy queries.
    await tx.user.update({
      where: { id: userId },
      data: { latitude: data.lat, longitude: data.lng },
    });
    await clearRejectionIfPresent(tx, proId, approvalStatus);
  });

  return { ok: true };
}

// ─── Save: schedule ───────────────────────────────────────────────────

export async function saveSchedule(
  userId: string,
  data: z.infer<typeof ScheduleInputSchema>,
): Promise<{ ok: true; availableDays: number }> {
  const { proId, approvalStatus } = await assertEditable(userId);

  // Pro must be available at least one day.
  const availableDays = data.slots.filter((s) => s.isAvailable).length;
  if (availableDays === 0) {
    throw new ValidationError('Must be available on at least one day per week');
  }

  // Replace strategy: schedule has @@unique([professionalId, dayOfWeek])
  // so we can deleteMany + createMany cleanly.
  await prisma.$transaction(async (tx) => {
    await tx.proSchedule.deleteMany({ where: { professionalId: proId } });
    await tx.proSchedule.createMany({
      data: data.slots.map((s) => ({
        professionalId: proId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isAvailable: s.isAvailable,
      })),
    });
    await clearRejectionIfPresent(tx, proId, approvalStatus);
  });

  return { ok: true, availableDays };
}

// ─── Save: police verification doc ────────────────────────────────────

export async function savePoliceDoc(
  userId: string,
  docUrl: string,
): Promise<{ ok: true; status: PoliceDocStatus }> {
  const { proId, approvalStatus } = await assertEditable(userId);

  await prisma.$transaction(async (tx) => {
    await tx.professional.update({
      where: { id: proId },
      data: {
        policeDocUrl: docUrl,
        policeDocStatus: 'pending_review',
        policeDocRejectionNote: null,
      },
    });
    await clearRejectionIfPresent(tx, proId, approvalStatus);
  });

  return { ok: true, status: 'pending_review' };
}

// ─── Submit ───────────────────────────────────────────────────────────

/**
 * Atomic submit gate — re-loads the snapshot, re-runs every STEP_DONE
 * check for required steps, then flips status to submitted_for_review.
 * Throws ValidationError listing what's missing if the pro tries to
 * sneak through with incomplete data (UI should have already blocked).
 */
export async function submitForReview(userId: string): Promise<{ ok: true; submittedAt: string }> {
  const snapshot = await loadSnapshot(userId);

  const pro = await prisma.professional.findUnique({
    where: { userId },
    select: { approvalStatus: true },
  });
  if (!pro) {
    throw new NotFoundError('Professional profile not found for this user');
  }
  if (pro.approvalStatus !== 'draft' && pro.approvalStatus !== 'rejected') {
    throw new ConflictError(
      `Cannot submit — current status is ${pro.approvalStatus}. Only draft / rejected can submit.`,
    );
  }

  const missing = REQUIRED_STEPS.filter((k) => !STEP_DONE[k](snapshot));
  if (missing.length > 0) {
    throw new ValidationError(`Cannot submit — required steps incomplete: ${missing.join(', ')}`, {
      missing,
    });
  }

  const submittedAt = new Date();
  await prisma.professional.update({
    where: { id: snapshot.proId },
    data: {
      approvalStatus: 'submitted_for_review',
      submittedForReviewAt: submittedAt,
      rejectionReason: null,
      rejectionFields: [],
    },
  });

  // Trust score: "profile_complete" event — earns the pro starting points.
  // Idempotent at the event level (Phase 1.5 service handles dedupe).
  await applyScoreEvent({
    professionalId: snapshot.proId,
    eventType: 'profile_complete',
  }).catch(() => {
    // Non-fatal — if trust event fails, submission still succeeds.
  });

  return { ok: true, submittedAt: submittedAt.toISOString() };
}
