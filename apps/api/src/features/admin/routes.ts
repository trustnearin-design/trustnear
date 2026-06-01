import { Hono } from 'hono';
import { z } from 'zod';
import {
  authenticate,
  authorize,
  requireAdminScope,
  type AuthContext,
} from '../../middleware/authenticate.js';
import { validator } from '../../shared/validator.js';
import { success } from '../../shared/responses.js';
import {
  getDashboardMetrics,
  getRecentBookings,
  getDashboardCharts,
  getAlertCounts,
  getLiveOpsSnapshot,
} from './dashboard-service.js';
import { listKycQueue, getKycDetail, setVerification } from './kyc-service.js';
import { KycQueueQuerySchema, SetVerificationInputSchema } from './schemas.js';
import {
  approveProfessional,
  getApprovalReviewDetail,
  listPendingApprovals,
  rejectProfessional,
  revokeProfessional,
} from './approvals-service.js';
import {
  ApproveInputSchema,
  PendingApprovalsQuerySchema,
  RejectInputSchema,
  RevokeInputSchema,
} from '../pros/onboarding-schemas.js';
import {
  listAllCategories,
  getCategory,
  createCategory,
  updateCategory,
  softDeleteCategory,
  reorderCategories,
} from './categories-service.js';
import {
  CategoryInputSchema,
  CategoryUpdateSchema,
  ReorderInputSchema,
} from './categories-schemas.js';
import uploadsRouter from './uploads-routes.js';
import cmsRouter from '../cms/admin-routes.js';
import {
  listAllBanners,
  getBanner,
  createBanner,
  updateBanner,
  softDeleteBanner,
} from './banners-service.js';
import { BannerInputSchema, BannerUpdateSchema } from './banners-schemas.js';
import {
  listAllConfig,
  getConfig as getConfigEntry,
  upsertConfig,
  deleteConfig,
} from './config-service.js';
import { getMaskedSmsConfig, saveSmsConfig, sendTestSms } from './sms-config-service.js';
import { SmsConfigSchema, TestSmsInputSchema } from './sms-config-schemas.js';
import {
  listUsers,
  getUserDetail,
  changeRole,
  setActive,
  bulkSetActive,
  setAdminRole,
} from './users-service.js';
import { listExperts, getExpertDetail, setTrustOverride, updateExpert } from './experts-service.js';
import {
  listBookings,
  getBookingDetail,
  adminCancel,
  markDisputed,
  bulkAdminCancel,
} from './bookings-service.js';
import { listAuditLogs } from './audit-service.js';
import {
  refundBooking,
  resolveDispute,
  listReviewsForModeration,
  setReviewVisibility,
  listWalletTransactions,
  listPayoutsSnapshot,
} from './ops-service.js';
import {
  UsersListQuery,
  ChangeRoleInput,
  SetActiveInput,
  ExpertsListQuery,
  SetTrustInput,
  UpdateExpertInput,
  BookingsListQuery,
  CancelBookingInput,
  DisputeBookingInput,
  AuditQuery,
  BulkUsersActiveInput,
  BulkBookingsCancelInput,
  RefundBookingInput,
  ResolveDisputeInput,
  ReviewsListQuery,
  ReviewModerationInput,
  WalletTxnsListQuery,
  PayoutsListQuery,
} from './admin-schemas.js';

const admin = new Hono<AuthContext>();

// All admin routes require role=admin. Layered so unauth → 401 (SL_104),
// wrong-role → 403 (SL_201).
admin.use('*', authenticate, authorize('admin'));

/**
 * GET /admin/dashboard
 * Aggregate metrics + last 10 bookings.
 */
admin.get('/dashboard', async (c) => {
  const [metrics, recent] = await Promise.all([getDashboardMetrics(), getRecentBookings(10)]);
  return success(c, { metrics, recent });
});

/**
 * GET /admin/dashboard/charts
 * 30-day time series, GMV by category, status funnel, payment breakdown,
 * top experts. Heavier query — separate endpoint so cards above stay fast.
 */
admin.get('/dashboard/charts', async (c) => {
  const charts = await getDashboardCharts();
  return success(c, charts);
});

/** GET /admin/alerts — counts that drive sidebar badges + dashboard pills. */
admin.get('/alerts', async (c) => {
  const alerts = await getAlertCounts();
  return success(c, alerts);
});

/** GET /admin/live-ops — online pros + active bookings with geo for map. */
admin.get('/live-ops', async (c) => {
  const snapshot = await getLiveOpsSnapshot();
  return success(c, snapshot);
});

/**
 * GET /admin/kyc?filter=pending|partial|complete|all&limit=50
 */
admin.get('/kyc', validator('query', KycQueueQuerySchema), async (c) => {
  const { filter, limit } = c.req.valid('query');
  const pros = await listKycQueue(filter, limit);
  return success(c, { pros });
});

/**
 * GET /admin/kyc/:id
 */
admin.get('/kyc/:id', async (c) => {
  const detail = await getKycDetail(c.req.param('id'));
  return success(c, detail);
});

/**
 * PATCH /admin/kyc/:id/verification
 * Admin override — flip any verification flag. Used for police_verified
 * (manual review) and for break-glass corrections.
 */
admin.patch('/kyc/:id/verification', validator('json', SetVerificationInputSchema), async (c) => {
  const { field, value } = c.req.valid('json');
  const result = await setVerification({
    professionalId: c.req.param('id'),
    field,
    value,
  });
  return success(c, result);
});

// ─────────────────────────────────────────────────────────────
// Pro Onboarding Approvals (Phase 3g)
// ─────────────────────────────────────────────────────────────

/**
 * GET /admin/pros/pending
 * Queue of pros awaiting review. Defaults to submitted_for_review, but
 * the status filter accepts rejected/approved/all for the audit tabs.
 */
admin.get('/pros/pending', validator('query', PendingApprovalsQuerySchema), async (c) => {
  const q = c.req.valid('query');
  const result = await listPendingApprovals({
    status: q.status,
    limit: q.limit,
    offset: q.offset,
  });
  return success(c, result);
});

/**
 * GET /admin/pros/:id/review
 * Full review payload — personal + services + area + schedule + KYC +
 * police doc URL. One screen, one fetch. Admin doesn't need to bounce.
 */
admin.get('/pros/:id/review', async (c) => {
  const detail = await getApprovalReviewDetail(c.req.param('id'));
  return success(c, detail);
});

/**
 * POST /admin/pros/:id/approve
 * Flip approval_status → approved. Pro becomes visible in /pros/nearby
 * and the matcher considers them. Audit-logged.
 */
admin.post('/pros/:id/approve', validator('json', ApproveInputSchema), async (c) => {
  const adminUser = c.get('user');
  const { note } = c.req.valid('json');
  const result = await approveProfessional({
    professionalId: c.req.param('id'),
    adminUserId: adminUser.sub,
    note,
    ip: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: c.req.header('user-agent') ?? null,
  });
  return success(c, result);
});

/**
 * POST /admin/pros/:id/reject
 * Flip approval_status → rejected with a reason + which fields to fix.
 * Pro lands on Rejected screen with the fields list highlighted; can
 * edit + resubmit.
 */
admin.post('/pros/:id/reject', validator('json', RejectInputSchema), async (c) => {
  const adminUser = c.get('user');
  const { reason, fields } = c.req.valid('json');
  const result = await rejectProfessional({
    professionalId: c.req.param('id'),
    adminUserId: adminUser.sub,
    reason,
    fields,
    ip: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: c.req.header('user-agent') ?? null,
  });
  return success(c, result);
});

/**
 * POST /admin/pros/:id/revoke
 * Take an already-APPROVED pro offline → approval_status back to rejected
 * with a reason. Removes them from /pros/nearby immediately and notifies
 * the pro, who can edit + resubmit. Audit-logged.
 */
admin.post('/pros/:id/revoke', validator('json', RevokeInputSchema), async (c) => {
  const adminUser = c.get('user');
  const { reason, fields } = c.req.valid('json');
  const result = await revokeProfessional({
    professionalId: c.req.param('id'),
    adminUserId: adminUser.sub,
    reason,
    fields,
    ip: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: c.req.header('user-agent') ?? null,
  });
  return success(c, result);
});

// ─────────────────────────────────────────────────────────────
// Categories CMS
// ─────────────────────────────────────────────────────────────

/** GET /admin/categories — full flat list (admin tree client-grouped) */
admin.get('/categories', async (c) => {
  const categories = await listAllCategories();
  return success(c, { categories });
});

/** GET /admin/categories/:id — single category for edit form */
admin.get('/categories/:id', async (c) => {
  const category = await getCategory(c.req.param('id'));
  return success(c, category);
});

/** POST /admin/categories — create */
admin.post('/categories', validator('json', CategoryInputSchema), async (c) => {
  const input = c.req.valid('json');
  const created = await createCategory(input);
  return success(c, created, undefined, 201);
});

/** PATCH /admin/categories/:id — update */
admin.patch('/categories/:id', validator('json', CategoryUpdateSchema), async (c) => {
  const updated = await updateCategory(c.req.param('id'), c.req.valid('json'));
  return success(c, updated);
});

/** DELETE /admin/categories/:id — soft delete */
admin.delete('/categories/:id', async (c) => {
  const result = await softDeleteCategory(c.req.param('id'));
  return success(c, result);
});

// ─────────────────────────────────────────────────────────────
// Uploads — local FS (dev) or S3 (when creds set in env)
// ─────────────────────────────────────────────────────────────
admin.route('/uploads', uploadsRouter);

// ─────────────────────────────────────────────────────────────
// CMS — notification templates, announcements, promos, FAQs, legal pages
// ─────────────────────────────────────────────────────────────
admin.route('/cms', cmsRouter);

/** PATCH /admin/categories/reorder — bulk reorder */
admin.patch('/categories-reorder', validator('json', ReorderInputSchema), async (c) => {
  const result = await reorderCategories(c.req.valid('json').items);
  return success(c, result);
});

// ─────────────────────────────────────────────────────────────
// Home Banners CMS
// ─────────────────────────────────────────────────────────────

admin.get('/banners', async (c) => {
  const banners = await listAllBanners();
  return success(c, { banners });
});

admin.get('/banners/:id', async (c) => {
  const banner = await getBanner(c.req.param('id'));
  return success(c, banner);
});

admin.post('/banners', validator('json', BannerInputSchema), async (c) => {
  const input = c.req.valid('json');
  const created = await createBanner(input, c.get('user').sub);
  return success(c, created, undefined, 201);
});

admin.patch('/banners/:id', validator('json', BannerUpdateSchema), async (c) => {
  const updated = await updateBanner(c.req.param('id'), c.req.valid('json'));
  return success(c, updated);
});

admin.delete('/banners/:id', async (c) => {
  const result = await softDeleteBanner(c.req.param('id'));
  return success(c, result);
});

// ─────────────────────────────────────────────────────────────
// App Config — business rules / feature flags
// ─────────────────────────────────────────────────────────────

const ConfigUpsertSchema = z.object({
  value: z.unknown(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
});

admin.get('/config', async (c) => {
  const entries = await listAllConfig();
  return success(c, { entries });
});

admin.get('/config/:key', async (c) => {
  const entry = await getConfigEntry(c.req.param('key'));
  return success(c, entry);
});

admin.put('/config/:key', validator('json', ConfigUpsertSchema), async (c) => {
  const input = c.req.valid('json');
  const entry = await upsertConfig({
    key: c.req.param('key'),
    value: input.value,
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
    actorId: c.get('user').sub,
  });
  return success(c, entry);
});

admin.delete('/config/:key', async (c) => {
  const result = await deleteConfig(c.req.param('key'));
  return success(c, result);
});

// ─────────────────────────────────────────────────────────────
// SMS / OTP provider config — dedicated page for the credentials
// + template + provider switch + test SMS button.
// Credentials are masked in GET responses and merged on PUT so admins
// can edit one field without re-typing the password.
// ─────────────────────────────────────────────────────────────

admin.get('/sms-config', async (c) => {
  const config = await getMaskedSmsConfig();
  return success(c, { config });
});

admin.put('/sms-config', validator('json', SmsConfigSchema), async (c) => {
  const incoming = c.req.valid('json');
  const adminUser = c.get('user');
  const saved = await saveSmsConfig({
    incoming,
    actorId: adminUser.sub,
    actorRole: 'admin',
    ip: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: c.req.header('user-agent') ?? null,
  });
  return success(c, { config: saved });
});

admin.post('/sms-config/test', validator('json', TestSmsInputSchema), async (c) => {
  const { phone, draftConfig } = c.req.valid('json');
  const result = await sendTestSms({
    phone,
    ...(draftConfig ? { draftConfig } : {}),
  });
  return success(c, result);
});

// ─────────────────────────────────────────────────────────────
// Users — list / detail / role / active
// ─────────────────────────────────────────────────────────────

admin.get('/users', validator('query', UsersListQuery), async (c) => {
  const { search, role, active, sortBy, sortDir, limit, cursor } = c.req.valid('query');
  const result = await listUsers({
    ...(search ? { search } : {}),
    ...(role ? { role } : {}),
    ...(active !== undefined ? { active: active === 'true' } : {}),
    sortBy,
    sortDir,
    limit,
    ...(cursor ? { cursor } : {}),
  });
  return success(c, result);
});

/** POST /admin/users/bulk-active — flip isActive on many users at once. */
admin.post('/users/bulk-active', validator('json', BulkUsersActiveInput), async (c) => {
  const { ids, isActive } = c.req.valid('json');
  const result = await bulkSetActive({ ids, isActive, actorId: c.get('user').sub });
  return success(c, result);
});

admin.get('/users/:id', async (c) => {
  const user = await getUserDetail(c.req.param('id'));
  return success(c, user);
});

admin.patch('/users/:id/role', validator('json', ChangeRoleInput), async (c) => {
  const { role } = c.req.valid('json');
  const result = await changeRole({
    userId: c.req.param('id'),
    newRole: role,
    actorId: c.get('user').sub,
  });
  return success(c, result);
});

admin.patch('/users/:id/active', validator('json', SetActiveInput), async (c) => {
  const { isActive } = c.req.valid('json');
  const result = await setActive({
    userId: c.req.param('id'),
    isActive,
    actorId: c.get('user').sub,
  });
  return success(c, result);
});

/**
 * PATCH /admin/users/:id/admin-role — change a user's adminRole. Restricted
 * to `super` admins so ops staff can't elevate themselves. Last-super
 * guard lives in the service.
 */
admin.patch(
  '/users/:id/admin-role',
  requireAdminScope('super'),
  validator('json', z.object({ adminRole: z.enum(['super', 'ops', 'finance', 'support']) })),
  async (c) => {
    const { adminRole } = c.req.valid('json');
    const result = await setAdminRole({
      userId: c.req.param('id'),
      adminRole,
      actorId: c.get('user').sub,
    });
    return success(c, result);
  },
);

// ─────────────────────────────────────────────────────────────
// Experts — list / detail / trust override
// ─────────────────────────────────────────────────────────────

admin.get('/experts', validator('query', ExpertsListQuery), async (c) => {
  const { search, badge, availability, city, kycComplete, sortBy, sortDir, limit, cursor } =
    c.req.valid('query');
  const result = await listExperts({
    ...(search ? { search } : {}),
    ...(badge ? { badge } : {}),
    ...(availability ? { availability } : {}),
    ...(city ? { city } : {}),
    ...(kycComplete !== undefined ? { kycComplete: kycComplete === 'true' } : {}),
    sortBy,
    sortDir,
    limit,
    ...(cursor ? { cursor } : {}),
  });
  return success(c, result);
});

admin.get('/experts/:id', async (c) => {
  const expert = await getExpertDetail(c.req.param('id'));
  return success(c, expert);
});

admin.patch('/experts/:id/trust', validator('json', SetTrustInput), async (c) => {
  const { trustScore, trustBadge } = c.req.valid('json');
  const result = await setTrustOverride({
    expertId: c.req.param('id'),
    trustScore,
    trustBadge,
    actorId: c.get('user').sub,
  });
  return success(c, result);
});

/**
 * PATCH /admin/experts/:id — edit profile fields (photo, title, bio,
 * portfolio, certifications, intro video). All fields optional.
 *
 * The actual file upload is a SEPARATE call to /admin/uploads → returns a
 * URL → that URL is then PATCHed here. This split lets the admin upload
 * once and reuse the same URL across many expert records if needed (e.g.
 * a stock photo for placeholder seed pros).
 */
admin.patch('/experts/:id', validator('json', UpdateExpertInput), async (c) => {
  const patch = c.req.valid('json');
  const result = await updateExpert({
    expertId: c.req.param('id'),
    patch,
  });
  return success(c, result);
});

// ─────────────────────────────────────────────────────────────
// Bookings — list / detail / cancel / dispute
// ─────────────────────────────────────────────────────────────

admin.get('/bookings', validator('query', BookingsListQuery), async (c) => {
  const { search, status, paymentStatus, sortBy, sortDir, limit, cursor } = c.req.valid('query');
  const result = await listBookings({
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    sortBy,
    sortDir,
    limit,
    ...(cursor ? { cursor } : {}),
  });
  return success(c, result);
});

/** POST /admin/bookings/bulk-cancel — force cancel many bookings with a shared reason. */
admin.post('/bookings/bulk-cancel', validator('json', BulkBookingsCancelInput), async (c) => {
  const { ids, reason } = c.req.valid('json');
  const result = await bulkAdminCancel({ ids, reason, actorId: c.get('user').sub });
  return success(c, result);
});

admin.get('/bookings/:id', async (c) => {
  const booking = await getBookingDetail(c.req.param('id'));
  return success(c, booking);
});

admin.post('/bookings/:id/cancel', validator('json', CancelBookingInput), async (c) => {
  const { reason } = c.req.valid('json');
  const result = await adminCancel({
    bookingId: c.req.param('id'),
    reason,
    actorId: c.get('user').sub,
  });
  return success(c, result);
});

admin.post('/bookings/:id/dispute', validator('json', DisputeBookingInput), async (c) => {
  const { reason } = c.req.valid('json');
  const result = await markDisputed({
    bookingId: c.req.param('id'),
    reason,
    actorId: c.get('user').sub,
  });
  return success(c, result);
});

/** POST /admin/bookings/:id/refund — credits customer wallet + flips paymentStatus */
admin.post('/bookings/:id/refund', validator('json', RefundBookingInput), async (c) => {
  const { amountPaise, reason } = c.req.valid('json');
  const result = await refundBooking({
    bookingId: c.req.param('id'),
    amountPaise,
    reason,
    actorId: c.get('user').sub,
  });
  return success(c, result);
});

/** POST /admin/bookings/:id/resolve-dispute — structured dispute resolution */
admin.post('/bookings/:id/resolve-dispute', validator('json', ResolveDisputeInput), async (c) => {
  const { resolution, notes } = c.req.valid('json');
  const result = await resolveDispute({
    bookingId: c.req.param('id'),
    resolution,
    notes,
    actorId: c.get('user').sub,
  });
  return success(c, result);
});

// ─────────────────────────────────────────────────────────────
// Reviews moderation
// ─────────────────────────────────────────────────────────────

admin.get('/reviews', validator('query', ReviewsListQuery), async (c) => {
  const { filter, limit } = c.req.valid('query');
  const items = await listReviewsForModeration({ filter, limit });
  return success(c, { items });
});

admin.patch('/reviews/:id/moderate', validator('json', ReviewModerationInput), async (c) => {
  const { isPublic } = c.req.valid('json');
  const result = await setReviewVisibility({
    reviewId: c.req.param('id'),
    isPublic,
    actorId: c.get('user').sub,
  });
  return success(c, result);
});

// ─────────────────────────────────────────────────────────────
// Wallet / payouts
// ─────────────────────────────────────────────────────────────

admin.get('/wallet/transactions', validator('query', WalletTxnsListQuery), async (c) => {
  const { userId, reason, limit, cursor } = c.req.valid('query');
  const result = await listWalletTransactions({
    ...(userId ? { userId } : {}),
    ...(reason ? { reason } : {}),
    limit,
    ...(cursor ? { cursor } : {}),
  });
  return success(c, result);
});

admin.get('/payouts', validator('query', PayoutsListQuery), async (c) => {
  const { limit } = c.req.valid('query');
  const items = await listPayoutsSnapshot({ limit });
  return success(c, { items });
});

// ─────────────────────────────────────────────────────────────
// Audit log — read-only list
// ─────────────────────────────────────────────────────────────

admin.get('/audit', validator('query', AuditQuery), async (c) => {
  const { actorId, entity, action, sortDir, limit, cursor } = c.req.valid('query');
  const result = await listAuditLogs({
    ...(actorId ? { actorId } : {}),
    ...(entity ? { entity } : {}),
    ...(action ? { action } : {}),
    sortDir,
    limit,
    ...(cursor ? { cursor } : {}),
  });
  return success(c, result);
});

export default admin;
