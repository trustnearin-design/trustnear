import { prisma, type AnnouncementAudience } from '@sevalink/db';
import { DomainError, ErrorCode, NotFoundError } from '@sevalink/types';
import { logger } from '../../logger.js';
import { isExpoPushToken, sendExpoPush } from '../notifications/expo.js';

export async function listAnnouncements(args: { status?: string; limit: number }) {
  return prisma.announcement.findMany({
    where: args.status ? { status: args.status as never } : {},
    orderBy: { createdAt: 'desc' },
    take: args.limit,
    select: {
      id: true,
      title: true,
      body: true,
      audience: true,
      status: true,
      scheduledAt: true,
      sentAt: true,
      sentCount: true,
      failedCount: true,
      targetCount: true,
      deepLink: true,
      createdBy: true,
      createdAt: true,
    },
  });
}

export async function getAnnouncement(id: string) {
  const row = await prisma.announcement.findUnique({ where: { id } });
  if (!row) throw new NotFoundError('Announcement not found');
  return row;
}

export async function createAnnouncement(input: {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  scheduledAt: Date | null;
  deepLink: string | null;
  createdBy: string;
}) {
  return prisma.announcement.create({
    data: {
      title: input.title,
      body: input.body,
      audience: input.audience,
      deepLink: input.deepLink,
      createdBy: input.createdBy,
      status: input.scheduledAt ? 'scheduled' : 'draft',
      scheduledAt: input.scheduledAt,
    },
  });
}

export async function deleteAnnouncement(id: string) {
  const existing = await prisma.announcement.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!existing) throw new NotFoundError('Announcement not found');
  if (existing.status === 'sent' || existing.status === 'sending') {
    throw new DomainError(
      ErrorCode.SL_900_VALIDATION_ERROR,
      'Cannot delete an announcement that has been or is being sent.',
    );
  }
  await prisma.announcement.delete({ where: { id } });
  return { id };
}

/**
 * Fan-out: load all eligible users for the audience, push in chunks of
 * 100 (Expo's batch limit), record per-batch results. Single-shot — runs
 * inline on the request thread because admin volumes are small (<10k
 * tokens). Move to a queue if/when audiences blow past that.
 */
export async function sendAnnouncement(id: string) {
  const ann = await prisma.announcement.findUnique({ where: { id } });
  if (!ann) throw new NotFoundError('Announcement not found');
  if (ann.status === 'sent') {
    throw new DomainError(ErrorCode.SL_900_VALIDATION_ERROR, 'Already sent.');
  }
  if (ann.status === 'sending') {
    throw new DomainError(ErrorCode.SL_900_VALIDATION_ERROR, 'Send is already in progress.');
  }

  await prisma.announcement.update({
    where: { id },
    data: { status: 'sending', scheduledAt: null },
  });

  const userFilter: Record<string, unknown> = {
    isActive: true,
    deviceToken: { not: null },
  };
  if (ann.audience === 'customers') userFilter['role'] = 'customer';
  if (ann.audience === 'professionals') userFilter['role'] = 'professional';

  const recipients = await prisma.user.findMany({
    where: userFilter,
    select: { id: true, deviceToken: true },
  });

  const tokens = recipients
    .map((r) => r.deviceToken)
    .filter((t): t is string => isExpoPushToken(t));

  let sent = 0;
  let failed = 0;

  const data: Record<string, string> = {
    type: 'announcement',
    announcementId: id,
  };
  if (ann.deepLink) data['deepLink'] = ann.deepLink;

  // 100 per batch — Expo's documented limit
  for (let i = 0; i < tokens.length; i += 100) {
    const batch = tokens.slice(i, i + 100);
    try {
      const tickets = await sendExpoPush(
        batch.map((to) => ({
          to,
          title: ann.title,
          body: ann.body,
          data,
          sound: 'default',
          priority: 'high',
          channelId: 'sevalink-booking',
        })),
      );
      for (const t of tickets) {
        if (t?.status === 'ok') sent++;
        else failed++;
      }
    } catch (err) {
      failed += batch.length;
      logger.warn({ err, announcementId: id }, 'announcement: batch failed');
    }
  }

  const updated = await prisma.announcement.update({
    where: { id },
    data: {
      status: failed === tokens.length && tokens.length > 0 ? 'failed' : 'sent',
      sentAt: new Date(),
      sentCount: sent,
      failedCount: failed,
      targetCount: tokens.length,
    },
  });
  return updated;
}
