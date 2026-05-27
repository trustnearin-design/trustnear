import { createMiddleware } from 'hono/factory';
import { prisma } from '@sevalink/db';
import { AuthError, ForbiddenError, ErrorCode } from '@sevalink/types';
import type { UserRole, AdminRole } from '@sevalink/db';
import { verifyAccessToken, type AccessTokenPayload } from '../features/auth/jwt.js';

export type AuthContext = {
  Variables: {
    requestId: string;
    user: AccessTokenPayload;
  };
};

/**
 * Require a valid access token. Attaches the decoded payload to c.var.user.
 */
export const authenticate = createMiddleware<AuthContext>(async (c, next) => {
  const header = c.req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new AuthError(ErrorCode.SL_104_INVALID_TOKEN, 'Missing Bearer token');
  }
  const token = header.slice('Bearer '.length).trim();
  const payload = await verifyAccessToken(token);
  c.set('user', payload);
  await next();
});

/**
 * Require the authenticated user to have one of the allowed roles.
 * Must run AFTER authenticate.
 */
export const authorize = (...allowedRoles: UserRole[]) =>
  createMiddleware<AuthContext>(async (c, next) => {
    const user = c.get('user');
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError(`Requires role: ${allowedRoles.join(' or ')}`);
    }
    await next();
  });

/**
 * Require the authenticated admin to have one of the allowed sub-roles.
 * Used to gate sensitive routes like role management or refunds. Must
 * run AFTER authorize('admin'). Looks up adminRole from the DB since
 * the JWT only stores the top-level role.
 *
 * Admins seeded before Phase F have a null adminRole — we treat them
 * as `super` so existing access doesn't break mid-upgrade.
 */
export const requireAdminScope = (...allowed: AdminRole[]) =>
  createMiddleware<AuthContext>(async (c, next) => {
    const user = c.get('user');
    const row = await prisma.user.findUnique({
      where: { id: user.sub },
      select: { adminRole: true },
    });
    const effective = (row?.adminRole ?? 'super') as AdminRole;
    if (!allowed.includes(effective)) {
      throw new ForbiddenError(
        `Requires admin scope: ${allowed.join(' or ')} (you are ${effective})`,
      );
    }
    await next();
  });
