import { Hono } from 'hono';
import { prisma } from '@sevalink/db';
import { NotFoundError } from '@sevalink/types';
import { authenticate, authorize, type AuthContext } from '../../middleware/authenticate.js';
import { validator } from '../../shared/validator.js';
import { success } from '../../shared/responses.js';
import {
  CompleteDigilockerInputSchema,
  StartDigilockerInputSchema,
  VerifyBankInputSchema,
  VerifyPanInputSchema,
} from './schemas.js';
import { completeDigilockerSession, startDigilockerSession } from './digilocker-service.js';
import { verifyPan } from './pan-service.js';
import { verifyBank } from './bav-service.js';

/**
 * Pro-only KYC endpoints. Every route requires role=professional.
 *
 *   GET  /verify/status                          — combined KYC status snapshot
 *   POST /verify/digilocker/start                — kick off DigiLocker OAuth
 *   POST /verify/digilocker/complete             — finish + persist Aadhaar
 *   POST /verify/pan                             — verify + persist PAN
 *   POST /verify/bank                            — verify + persist bank
 */

const verify = new Hono<AuthContext>();

verify.use('*', authenticate, authorize('professional'));

verify.get('/status', async (c) => {
  const user = c.get('user');
  const pro = await prisma.professional.findUnique({
    where: { userId: user.sub },
    select: {
      aadhaarVerified: true,
      aadhaarLastFour: true,
      aadhaarFullName: true,
      aadhaarDob: true,
      aadhaarPhotoUrl: true,
      panVerified: true,
      panNumber: true,
      panFullName: true,
      bankVerified: true,
      bankAccountLastFour: true,
      bankAccountHolderName: true,
      ifscCode: true,
      faceVerified: true,
      policeVerified: true,
      kycUpdatedAt: true,
    },
  });
  if (!pro) {
    throw new NotFoundError('Professional profile not found');
  }
  return success(c, pro);
});

verify.post('/digilocker/start', validator('json', StartDigilockerInputSchema), async (c) => {
  const user = c.get('user');
  const input = c.req.valid('json');
  const res = await startDigilockerSession({
    proUserId: user.sub,
    ...(input.redirectUrl ? { redirectUrl: input.redirectUrl } : {}),
  });
  return success(c, res);
});

verify.post('/digilocker/complete', validator('json', CompleteDigilockerInputSchema), async (c) => {
  const user = c.get('user');
  const { requestId } = c.req.valid('json');
  const res = await completeDigilockerSession({
    proUserId: user.sub,
    requestId,
  });
  return success(c, res);
});

verify.post('/pan', validator('json', VerifyPanInputSchema), async (c) => {
  const user = c.get('user');
  const { pan } = c.req.valid('json');
  const res = await verifyPan({ proUserId: user.sub, pan });
  return success(c, res);
});

verify.post('/bank', validator('json', VerifyBankInputSchema), async (c) => {
  const user = c.get('user');
  const { accountNumber, ifsc } = c.req.valid('json');
  const res = await verifyBank({
    proUserId: user.sub,
    accountNumber,
    ifsc,
  });
  return success(c, res);
});

export default verify;
