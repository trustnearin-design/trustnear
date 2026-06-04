import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '@sevalink/db';
import { NotFoundError } from '@sevalink/types';
import { authenticate, type AuthContext } from '../../middleware/authenticate.js';
import { idempotency } from '../../middleware/idempotency.js';
import { validator } from '../../shared/validator.js';
import { success } from '../../shared/responses.js';
import { WalletQuerySchema } from '../payments/schemas.js';
import { createWalletTopup, reconcileWalletTopup } from './topup-service.js';

const wallet = new Hono<AuthContext>();

wallet.use('*', authenticate);

const TopupCreateSchema = z.object({
  amountPaise: z.number().int().positive(),
});
const TopupVerifySchema = z.object({
  topupId: z.string().uuid(),
});

/**
 * GET /api/v1/wallet/balance — own wallet balance + loyalty points.
 */
wallet.get('/balance', async (c) => {
  const user = c.get('user');
  const row = await prisma.user.findUnique({
    where: { id: user.sub },
    select: { walletBalance: true, loyaltyPoints: true },
  });
  if (!row) throw new NotFoundError('User not found');
  return success(c, {
    walletBalance: row.walletBalance, // paise
    loyaltyPoints: row.loyaltyPoints,
  });
});

/**
 * POST /api/v1/wallet/topup — start an "Add money" order. Returns the gateway
 * SDK session the app opens (UPI / card / netbanking). Crediting happens on
 * verify + webhook, never here.
 */
wallet.post('/topup', idempotency, validator('json', TopupCreateSchema), async (c) => {
  const user = c.get('user');
  const { amountPaise } = c.req.valid('json');
  const result = await createWalletTopup({ userId: user.sub, amountPaise });
  return success(c, result, undefined, 201);
});

/**
 * POST /api/v1/wallet/topup/verify — defensive client check after the gateway
 * sheet closes. Idempotent; credits the wallet at most once.
 */
wallet.post('/topup/verify', validator('json', TopupVerifySchema), async (c) => {
  const user = c.get('user');
  const { topupId } = c.req.valid('json');
  const result = await reconcileWalletTopup({ topupId, callerId: user.sub });
  return success(c, { topupId, ...result });
});

/**
 * GET /api/v1/wallet/transactions — paginated transaction history.
 * Includes the platform-payment debits and (later) pro payouts + referral
 * rewards.
 */
wallet.get('/transactions', validator('query', WalletQuerySchema), async (c) => {
  const user = c.get('user');
  const q = c.req.valid('query');

  const rows = await prisma.walletTransaction.findMany({
    where: { userId: user.sub },
    orderBy: { createdAt: 'desc' },
    take: q.limit + 1,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      type: true,
      reason: true,
      amount: true,
      balanceAfter: true,
      referenceId: true,
      metadata: true,
      createdAt: true,
    },
  });

  const hasMore = rows.length > q.limit;
  const items = hasMore ? rows.slice(0, q.limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1]?.id : null;

  return success(
    c,
    { transactions: items, count: items.length },
    {
      requestId: c.get('requestId') ?? '',
      timestamp: new Date().toISOString(),
      ...(nextCursor ? { cursor: nextCursor } : {}),
    },
  );
});

export default wallet;
