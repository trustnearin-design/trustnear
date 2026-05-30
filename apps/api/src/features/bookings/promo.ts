import { prisma } from '@sevalink/db';
import { ErrorCode } from '@sevalink/types';

/**
 * Promo code resolution.
 *
 * Pure validation + discount math against an order subtotal. Does NOT mutate
 * `usageCount` — that increment happens inside the booking-create transaction
 * so two concurrent bookings can't oversell a limited code.
 *
 * The same resolver backs both the customer's pre-booking `/promo/validate`
 * preview (which surfaces `reason` inline, never throws) and `createBooking`
 * (which throws on `ok: false` so an invalid code fails the booking loudly
 * instead of silently charging full price).
 */

export interface PromoResolution {
  ok: boolean;
  /** Set when ok. */
  promoCodeId?: string;
  code?: string;
  discountPaise?: number;
  /** Human-readable failure reason — shown to the customer. Set when !ok. */
  reason?: string;
  /** Machine error code so the route can pick the right HTTP status. Set when !ok. */
  errorCode?: ErrorCode;
}

export async function resolvePromo(args: {
  code: string;
  customerId: string;
  /** basePrice + platformFee, in paise, BEFORE any discount. */
  subtotalPaise: number;
  now?: Date;
}): Promise<PromoResolution> {
  const code = args.code.trim().toUpperCase();
  if (!code) {
    return { ok: false, reason: 'Enter a promo code', errorCode: ErrorCode.SL_404_PROMO_INVALID };
  }

  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo || !promo.isActive) {
    return { ok: false, reason: 'Invalid promo code', errorCode: ErrorCode.SL_404_PROMO_INVALID };
  }

  const now = args.now ?? new Date();
  if (now < promo.validFrom) {
    return {
      ok: false,
      reason: 'This promo isn’t active yet',
      errorCode: ErrorCode.SL_405_PROMO_EXPIRED,
    };
  }
  if (now > promo.validUntil) {
    return {
      ok: false,
      reason: 'This promo has expired',
      errorCode: ErrorCode.SL_405_PROMO_EXPIRED,
    };
  }
  if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) {
    return {
      ok: false,
      reason: 'This promo has reached its usage limit',
      errorCode: ErrorCode.SL_406_PROMO_LIMIT_REACHED,
    };
  }
  if (args.subtotalPaise < promo.minOrderAmount) {
    return {
      ok: false,
      reason: `Minimum order ₹${Math.ceil(promo.minOrderAmount / 100)} for this code`,
      errorCode: ErrorCode.SL_404_PROMO_INVALID,
    };
  }

  // Per-user limit — count this customer's prior bookings on the code.
  // Cancelled bookings don't burn the allowance.
  if (promo.perUserLimit > 0) {
    const used = await prisma.booking.count({
      where: {
        customerId: args.customerId,
        promoCodeId: promo.id,
        status: { notIn: ['cancelled_customer', 'cancelled_pro'] },
      },
    });
    if (used >= promo.perUserLimit) {
      return {
        ok: false,
        reason: 'You’ve already used this promo',
        errorCode: ErrorCode.SL_406_PROMO_LIMIT_REACHED,
      };
    }
  }

  // Discount math. `value` is paise for flat, percent×100 for percent
  // (so 20% is stored as 2000 → /10000 = 0.2).
  let discount: number;
  if (promo.discountType === 'flat') {
    discount = promo.value;
  } else {
    discount = Math.round((args.subtotalPaise * promo.value) / 10000);
    if (promo.maxDiscount !== null) discount = Math.min(discount, promo.maxDiscount);
  }
  // Clamp: never negative, never more than the order itself.
  discount = Math.max(0, Math.min(discount, args.subtotalPaise));

  return { ok: true, promoCodeId: promo.id, code: promo.code, discountPaise: discount };
}
