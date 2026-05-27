import { prisma, type TemplateChannel } from '@sevalink/db';
import { NotFoundError } from '@sevalink/types';

/**
 * In-process cache for rendered templates. Templates change rarely (admin
 * edits) but are read on every notification dispatch — caching keeps the
 * hot path single-digit-microseconds. Invalidate on upsert.
 *
 * 60s TTL is fine: if an admin tweaks copy, change propagates within a
 * minute. For instant rollout, restart the API.
 */
type CachedRow = { title: string; body: string; isActive: boolean; expiresAt: number };
const cache = new Map<string, CachedRow>();
const TTL_MS = 60_000;

export async function listTemplates(args: { channel?: TemplateChannel } = {}) {
  const where: Record<string, unknown> = {};
  if (args.channel) where['channel'] = args.channel;
  return prisma.notificationTemplate.findMany({
    where,
    orderBy: [{ channel: 'asc' }, { eventKey: 'asc' }],
    select: {
      id: true,
      eventKey: true,
      channel: true,
      title: true,
      body: true,
      variables: true,
      description: true,
      isActive: true,
      updatedAt: true,
    },
  });
}

export async function getTemplate(eventKey: string) {
  const row = await prisma.notificationTemplate.findUnique({
    where: { eventKey },
  });
  if (!row) throw new NotFoundError(`Template '${eventKey}' not found`);
  return row;
}

export async function upsertTemplate(input: {
  eventKey: string;
  channel: TemplateChannel;
  title: string;
  body: string;
  variables: string[];
  description?: string | null;
  isActive: boolean;
}) {
  const row = await prisma.notificationTemplate.upsert({
    where: { eventKey: input.eventKey },
    create: {
      eventKey: input.eventKey,
      channel: input.channel,
      title: input.title,
      body: input.body,
      variables: input.variables,
      description: input.description ?? null,
      isActive: input.isActive,
    },
    update: {
      channel: input.channel,
      title: input.title,
      body: input.body,
      variables: input.variables,
      description: input.description ?? null,
      isActive: input.isActive,
    },
  });
  cache.delete(input.eventKey);
  return row;
}

/**
 * Public hot-path used by the notifications dispatcher. Returns either the
 * admin-defined copy with variables substituted, or `null` to signal the
 * caller should use its hardcoded fallback. Never throws.
 */
export async function renderTemplate(
  eventKey: string,
  vars: Record<string, string | number>,
): Promise<{ title: string; body: string } | null> {
  const cached = cache.get(eventKey);
  const now = Date.now();
  let row: { title: string; body: string; isActive: boolean } | null = null;

  if (cached && cached.expiresAt > now) {
    row = cached;
  } else {
    try {
      const fresh = await prisma.notificationTemplate.findUnique({
        where: { eventKey },
        select: { title: true, body: true, isActive: true },
      });
      if (fresh) {
        cache.set(eventKey, { ...fresh, expiresAt: now + TTL_MS });
        row = fresh;
      } else {
        // Cache misses as inactive for short TTL so we don't hammer the DB
        cache.set(eventKey, {
          title: '',
          body: '',
          isActive: false,
          expiresAt: now + TTL_MS,
        });
        return null;
      }
    } catch {
      return null;
    }
  }

  if (!row || !row.isActive) return null;
  return {
    title: substitute(row.title, vars),
    body: substitute(row.body, vars),
  };
}

/** Replace {{varName}} occurrences. Unknown vars left as-is so the gap is visible. */
function substitute(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key) => {
    const v = vars[key];
    return v === undefined ? m : String(v);
  });
}

/** Seed defaults — idempotent. Called once at boot so admin sees the row to edit. */
export async function seedDefaultTemplates(): Promise<void> {
  const defaults = [
    {
      eventKey: 'booking_matched_customer',
      title: '{{professionalName}} accepted your booking',
      body: '{{bookingNumber}} · Tap to view details',
      variables: ['professionalName', 'bookingNumber'],
      description: 'Sent to customer when a pro accepts their booking',
    },
    {
      eventKey: 'booking_en_route',
      title: 'Your expert is on the way',
      body: '{{professionalName}} has started the trip. Track live on the map.',
      variables: ['professionalName'],
      description: 'Sent to customer when pro starts the trip',
    },
    {
      eventKey: 'booking_arrived',
      title: 'Your expert has arrived',
      body: 'Share the OTP with {{professionalName}} to begin the service.',
      variables: ['professionalName'],
      description: 'Sent to customer when pro reaches the location',
    },
    {
      eventKey: 'booking_completed',
      title: 'Service complete',
      body: '{{bookingNumber}} done. Pay ₹{{amountRupees}} to wrap up.',
      variables: ['bookingNumber', 'amountRupees'],
      description: 'Sent to customer when the service finishes',
    },
    {
      eventKey: 'payment_received',
      title: 'Payment of ₹{{amountRupees}} received',
      body: 'Thank you! {{bookingNumber}} is fully closed. Rate your expert?',
      variables: ['amountRupees', 'bookingNumber'],
      description: 'Sent to customer after payment captured',
    },
    {
      eventKey: 'job_new_match_pro',
      title: 'New job · {{categoryName}}',
      body: '{{customerName}}{{locationBit}} · ₹{{payoutRupees}}',
      variables: ['categoryName', 'customerName', 'locationBit', 'payoutRupees'],
      description: 'Sent to pro on a new incoming job (high-priority alert)',
    },
  ];
  for (const t of defaults) {
    await prisma.notificationTemplate.upsert({
      where: { eventKey: t.eventKey },
      create: { ...t, channel: 'push', isActive: true },
      update: {}, // never overwrite admin edits on boot
    });
  }
}
