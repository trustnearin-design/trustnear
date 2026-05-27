import { Hono } from 'hono';
import { success } from '../../shared/responses.js';
import { listPublishedFaqs } from './faqs-service.js';
import { getPublishedLegalPage } from './legal-service.js';

/**
 * Public CMS reads. No auth required. Customer + Pro apps consume these
 * to render Help / Terms / Privacy / Refund pages.
 */
const publicCms = new Hono();

publicCms.get('/faqs', async (c) => {
  const items = await listPublishedFaqs();
  return success(c, { items });
});

publicCms.get('/legal/:slug', async (c) => {
  const page = await getPublishedLegalPage(c.req.param('slug'));
  return success(c, page);
});

export default publicCms;
