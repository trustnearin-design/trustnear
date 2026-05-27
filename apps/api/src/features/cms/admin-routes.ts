import { Hono } from 'hono';
import { z } from 'zod';
import { type AuthContext } from '../../middleware/authenticate.js';
import { validator } from '../../shared/validator.js';
import { success } from '../../shared/responses.js';
import { listTemplates, getTemplate, upsertTemplate } from './templates-service.js';
import {
  listAnnouncements,
  getAnnouncement,
  createAnnouncement,
  deleteAnnouncement,
  sendAnnouncement,
} from './announcements-service.js';
import {
  listPromoCodes,
  getPromoCode,
  createPromoCode,
  updatePromoCode,
  archivePromoCode,
} from './promo-codes-service.js';
import { listFaqs, getFaq, createFaq, updateFaq, softDeleteFaq } from './faqs-service.js';
import {
  listLegalPages,
  getLegalPage,
  createLegalPageVersion,
  setPublished,
} from './legal-service.js';
import {
  TemplateUpsertInput,
  AnnouncementInput,
  AnnouncementListQuery,
  PromoCodeInput,
  PromoCodeUpdateInput,
  PromoCodeListQuery,
  FaqInput,
  FaqUpdateInput,
  LegalPageInput,
} from './schemas.js';

// Auth (role=admin) is enforced by the parent /api/v1/admin router that
// mounts this sub-router. Don't double-wrap with middleware here.
const cms = new Hono<AuthContext>();

// ─── Templates ────────────────────────────────────────────────────────

cms.get('/templates', async (c) => {
  const items = await listTemplates();
  return success(c, { items });
});

cms.get('/templates/:eventKey', async (c) => {
  const item = await getTemplate(c.req.param('eventKey'));
  return success(c, item);
});

cms.put('/templates/:eventKey', validator('json', TemplateUpsertInput), async (c) => {
  const input = c.req.valid('json');
  const item = await upsertTemplate({
    eventKey: c.req.param('eventKey'),
    ...input,
    description: input.description ?? null,
  });
  return success(c, item);
});

// ─── Announcements ────────────────────────────────────────────────────

cms.get('/announcements', validator('query', AnnouncementListQuery), async (c) => {
  const { status, limit } = c.req.valid('query');
  const items = await listAnnouncements({ ...(status ? { status } : {}), limit });
  return success(c, { items });
});

cms.get('/announcements/:id', async (c) => {
  const item = await getAnnouncement(c.req.param('id'));
  return success(c, item);
});

cms.post('/announcements', validator('json', AnnouncementInput), async (c) => {
  const input = c.req.valid('json');
  const item = await createAnnouncement({
    title: input.title,
    body: input.body,
    audience: input.audience,
    scheduledAt: input.scheduledAt,
    deepLink: input.deepLink ?? null,
    createdBy: c.get('user').sub,
  });
  return success(c, item, undefined, 201);
});

cms.post('/announcements/:id/send', async (c) => {
  const item = await sendAnnouncement(c.req.param('id'));
  return success(c, item);
});

cms.delete('/announcements/:id', async (c) => {
  const result = await deleteAnnouncement(c.req.param('id'));
  return success(c, result);
});

// ─── Promo codes ──────────────────────────────────────────────────────

cms.get('/promo-codes', validator('query', PromoCodeListQuery), async (c) => {
  const { active, search, limit } = c.req.valid('query');
  const items = await listPromoCodes({
    ...(active !== undefined ? { active: active === 'true' } : {}),
    ...(search ? { search } : {}),
    limit,
  });
  return success(c, { items });
});

cms.get('/promo-codes/:id', async (c) => {
  const item = await getPromoCode(c.req.param('id'));
  return success(c, item);
});

cms.post('/promo-codes', validator('json', PromoCodeInput), async (c) => {
  const input = c.req.valid('json');
  const item = await createPromoCode({
    code: input.code,
    description: input.description ?? null,
    discountType: input.discountType,
    value: input.value,
    maxDiscount: input.maxDiscount ?? null,
    minOrderAmount: input.minOrderAmount,
    usageLimit: input.usageLimit ?? null,
    perUserLimit: input.perUserLimit,
    isActive: input.isActive,
    validFrom: new Date(input.validFrom),
    validUntil: new Date(input.validUntil),
  });
  return success(c, item, undefined, 201);
});

cms.patch('/promo-codes/:id', validator('json', PromoCodeUpdateInput), async (c) => {
  const input = c.req.valid('json');
  const patch: Record<string, unknown> = { ...input };
  if (input.validFrom) patch['validFrom'] = new Date(input.validFrom);
  if (input.validUntil) patch['validUntil'] = new Date(input.validUntil);
  const item = await updatePromoCode(c.req.param('id'), patch as never);
  return success(c, item);
});

cms.delete('/promo-codes/:id', async (c) => {
  const item = await archivePromoCode(c.req.param('id'));
  return success(c, item);
});

// ─── FAQs ─────────────────────────────────────────────────────────────

cms.get('/faqs', async (c) => {
  const items = await listFaqs();
  return success(c, { items });
});

cms.get('/faqs/:id', async (c) => {
  const item = await getFaq(c.req.param('id'));
  return success(c, item);
});

cms.post('/faqs', validator('json', FaqInput), async (c) => {
  const input = c.req.valid('json');
  const item = await createFaq(input);
  return success(c, item, undefined, 201);
});

cms.patch('/faqs/:id', validator('json', FaqUpdateInput), async (c) => {
  const input = c.req.valid('json');
  const item = await updateFaq(c.req.param('id'), input);
  return success(c, item);
});

cms.delete('/faqs/:id', async (c) => {
  const result = await softDeleteFaq(c.req.param('id'));
  return success(c, result);
});

// ─── Legal pages ──────────────────────────────────────────────────────

cms.get('/legal-pages', async (c) => {
  const items = await listLegalPages();
  return success(c, { items });
});

cms.get('/legal-pages/:id', async (c) => {
  const item = await getLegalPage(c.req.param('id'));
  return success(c, item);
});

cms.post('/legal-pages', validator('json', LegalPageInput), async (c) => {
  const input = c.req.valid('json');
  const item = await createLegalPageVersion({
    slug: input.slug,
    title: input.title,
    body: input.body,
    ...(input.effectiveAt ? { effectiveAt: new Date(input.effectiveAt) } : {}),
    isPublished: input.isPublished,
    createdBy: c.get('user').sub,
  });
  return success(c, item, undefined, 201);
});

cms.patch(
  '/legal-pages/:id/publish',
  validator('json', z.object({ isPublished: z.boolean() })),
  async (c) => {
    const { isPublished } = c.req.valid('json');
    const item = await setPublished(c.req.param('id'), isPublished);
    return success(c, item);
  },
);

export default cms;
