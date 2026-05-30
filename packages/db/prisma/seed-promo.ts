/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

/**
 * Standalone, idempotent promo seed. Unlike seed.ts this injects NO dummy
 * categories/experts — safe to run against staging or prod.
 *
 *   pnpm --filter @sevalink/db db:seed-promo
 *
 * FIRST20 — the "first booking 20% off" code advertised on the category
 * banner. Percent discount (value = percent×100), capped at ₹150 so a big
 * booking doesn't hand out a huge discount. perUserLimit 1 = once per
 * customer (their first redemption). Re-running updates the definition but
 * preserves the live usageCount.
 */

const PROMOS = [
  {
    code: 'FIRST20',
    description: 'First booking — 20% off (max ₹150)',
    discountType: 'percent' as const,
    value: 2000, // 20.00%
    maxDiscount: 15000, // ₹150 cap (paise)
    minOrderAmount: 0,
    usageLimit: null as number | null,
    perUserLimit: 1,
    isActive: true,
    validFrom: new Date('2026-01-01T00:00:00.000Z'),
    validUntil: new Date('2026-12-31T23:59:59.000Z'),
  },
];

const prisma = new PrismaClient();

async function main() {
  for (const p of PROMOS) {
    const { code, ...fields } = p;
    const row = await prisma.promoCode.upsert({
      where: { code },
      update: fields, // note: does NOT touch usageCount — live count preserved
      create: { code, ...fields },
    });
    console.log(
      `✓ ${row.code} — ${row.discountType === 'percent' ? `${row.value / 100}% off` : `₹${row.value / 100} off`}` +
        `${row.maxDiscount ? ` (max ₹${row.maxDiscount / 100})` : ''}, perUser ${row.perUserLimit}, ` +
        `used ${row.usageCount}, valid till ${row.validUntil.toISOString().slice(0, 10)}`,
    );
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
