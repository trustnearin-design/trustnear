import { zValidator } from '@hono/zod-validator';
import type { ZodSchema } from 'zod';
import { ValidationError } from '@sevalink/types';

/**
 * Drop-in replacement for @hono/zod-validator that routes validation failures
 * through our global error handler (so responses use SL_xxx codes and the
 * standard envelope). Without this wrapper, zValidator returns its own raw
 * 400 response with the ZodError tree.
 */
export function validator<T extends ZodSchema>(
  target: 'json' | 'query' | 'param' | 'header' | 'cookie',
  schema: T,
) {
  return zValidator(target, schema, (result) => {
    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_';
        (fieldErrors[key] ??= []).push(issue.message);
      }
      throw new ValidationError('Validation failed', { fields: fieldErrors });
    }
  });
}
