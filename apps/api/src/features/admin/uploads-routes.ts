import { Hono } from 'hono';
import { authenticate, authorize, type AuthContext } from '../../middleware/authenticate.js';
import { success } from '../../shared/responses.js';
import { DomainError, ErrorCode } from '@sevalink/types';
import { saveUpload } from './uploads-service.js';

const uploads = new Hono<AuthContext>();
uploads.use('*', authenticate, authorize('admin'));

/**
 * POST /admin/uploads — multipart form upload.
 * Fields:
 *   - file (required): the image File
 *   - folder (optional): subfolder under uploads/ or S3 prefix (default: "misc")
 */
uploads.post('/', async (c) => {
  const body = await c.req.parseBody().catch(() => null);
  if (!body) {
    throw new DomainError(ErrorCode.SL_906_BAD_REQUEST, 'Multipart form body required');
  }

  const file = body['file'];
  if (!(file instanceof File)) {
    throw new DomainError(ErrorCode.SL_906_BAD_REQUEST, 'No file in upload payload');
  }
  const folder = (body['folder'] as string | undefined) ?? 'misc';

  // Build the public base URL from the request — works for localhost dev
  // (http://localhost:3000) and any reverse-proxied prod URL alike.
  const proto = c.req.header('x-forwarded-proto') ?? new URL(c.req.url).protocol.replace(':', '');
  const host = c.req.header('x-forwarded-host') ?? c.req.header('host') ?? 'localhost:3000';
  const publicBaseUrl = `${proto}://${host}`;

  const output = await saveUpload({ file, folder, publicBaseUrl });
  return success(c, output, undefined, 201);
});

export default uploads;
