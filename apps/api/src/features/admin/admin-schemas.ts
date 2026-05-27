import { z } from 'zod';

// ─── Common ──────────────────────────────────────────────────────────
export const PaginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(30),
  cursor: z.string().uuid().optional(),
});

export const SortDir = z.enum(['asc', 'desc']).default('desc');

// ─── Users ───────────────────────────────────────────────────────────
export const UsersListQuery = PaginationQuery.extend({
  search: z.string().trim().min(1).optional(),
  role: z.enum(['customer', 'professional', 'admin']).optional(),
  active: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['createdAt', 'fullName', 'walletBalance']).default('createdAt'),
  sortDir: SortDir,
});

export const ChangeRoleInput = z.object({
  role: z.enum(['customer', 'professional', 'admin']),
});

export const SetActiveInput = z.object({
  isActive: z.boolean(),
});

// ─── Experts ─────────────────────────────────────────────────────────
export const ExpertsListQuery = PaginationQuery.extend({
  search: z.string().trim().min(1).optional(),
  badge: z.enum(['none', 'bronze', 'silver', 'gold', 'platinum']).optional(),
  availability: z.enum(['online', 'busy', 'offline']).optional(),
  city: z.string().trim().min(1).optional(),
  kycComplete: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['trustScore', 'totalBookings', 'createdAt']).default('trustScore'),
  sortDir: SortDir,
});

export const SetTrustInput = z.object({
  trustScore: z.number().min(0).max(100),
  trustBadge: z.enum(['none', 'bronze', 'silver', 'gold', 'platinum']),
});

/**
 * Editable expert profile fields from the admin console. All optional —
 * caller may PATCH a single field (e.g. just profilePhoto) without
 * touching the rest. Keeps the seed flow ergonomic when Vikas onboards
 * a real Jaipur pro and only has the photo on hand initially.
 */
export const UpdateExpertInput = z.object({
  // User-table fields
  profilePhoto: z.string().url().or(z.literal('')).optional(),
  fullName: z.string().trim().min(2).max(80).optional(),
  // Professional-table fields
  professionalTitle: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(800).optional(),
  yearsExperience: z.number().int().min(0).max(60).optional(),
  portfolioUrls: z.array(z.string().url()).max(12).optional(),
  certifications: z.array(z.string().trim().min(1).max(80)).max(10).optional(),
  introVideoUrl: z.string().url().or(z.literal('')).optional(),
});

// ─── Bookings ────────────────────────────────────────────────────────
export const BookingsListQuery = PaginationQuery.extend({
  search: z.string().trim().min(1).optional(),
  status: z
    .enum([
      'pending_match',
      'matched',
      'confirmed',
      'pro_en_route',
      'otp_verified',
      'in_progress',
      'completed',
      'cancelled_customer',
      'cancelled_pro',
      'disputed',
    ])
    .optional(),
  paymentStatus: z.enum(['pending', 'paid', 'refunded', 'partial_refund', 'failed']).optional(),
  sortBy: z.enum(['createdAt', 'scheduledAt', 'totalAmount']).default('createdAt'),
  sortDir: SortDir,
});

export const CancelBookingInput = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const DisputeBookingInput = z.object({
  reason: z.string().trim().min(3).max(500),
});

// ─── Audit ───────────────────────────────────────────────────────────
export const AuditQuery = PaginationQuery.extend({
  actorId: z.string().uuid().optional(),
  entity: z.string().trim().min(1).optional(),
  action: z
    .enum([
      'create',
      'update',
      'delete',
      'soft_delete',
      'restore',
      'login',
      'logout',
      'permission_change',
      'config_change',
    ])
    .optional(),
  sortDir: SortDir,
});

// ─── Bulk actions ────────────────────────────────────────────────────
export const BulkUsersActiveInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  isActive: z.boolean(),
});

export const BulkBookingsCancelInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  reason: z.string().trim().min(3).max(500),
});

// ─── Ops: refunds + disputes + reviews + wallet ──────────────────────
export const RefundBookingInput = z.object({
  amountPaise: z.number().int().positive(),
  reason: z.string().trim().min(3).max(500),
});

export const ResolveDisputeInput = z.object({
  resolution: z.enum(['in_favor_of_customer', 'in_favor_of_pro', 'split']),
  notes: z.string().trim().min(3).max(500),
});

export const ReviewsListQuery = z.object({
  filter: z.enum(['all', 'visible', 'hidden', 'lowRating']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const ReviewModerationInput = z.object({
  isPublic: z.boolean(),
});

export const WalletTxnsListQuery = z.object({
  userId: z.string().uuid().optional(),
  reason: z
    .enum([
      'booking_payment',
      'pro_payout',
      'referral_reward',
      'loyalty_redeem',
      'promo_credit',
      'wallet_topup',
      'refund',
      'adjustment',
    ])
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().uuid().optional(),
});

export const PayoutsListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
