import { prisma } from '@sevalink/db';
import type { BannerPlacement, BannerLinkKind } from '@sevalink/db';
import { NotFoundError } from '@sevalink/types';

const BANNER_SELECT = {
  id: true,
  title: true,
  subtitle: true,
  imageUrl: true,
  placement: true,
  ctaText: true,
  linkKind: true,
  linkTarget: true,
  startsAt: true,
  endsAt: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listAllBanners() {
  return prisma.homeBanner.findMany({
    where: { deletedAt: null },
    orderBy: [{ placement: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    select: BANNER_SELECT,
  });
}

export async function getBanner(id: string) {
  const banner = await prisma.homeBanner.findFirst({
    where: { id, deletedAt: null },
    select: BANNER_SELECT,
  });
  if (!banner) throw new NotFoundError('Banner not found');
  return banner;
}

export type BannerInput = {
  title: string;
  subtitle: string | null;
  imageUrl: string;
  placement: BannerPlacement;
  ctaText: string | null;
  linkKind: BannerLinkKind;
  linkTarget: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  sortOrder: number;
  isActive: boolean;
};

export async function createBanner(input: BannerInput, createdBy: string) {
  return prisma.homeBanner.create({
    data: { ...input, createdBy },
    select: BANNER_SELECT,
  });
}

type BannerUpdate = { [K in keyof BannerInput]?: BannerInput[K] | undefined };

export async function updateBanner(id: string, input: BannerUpdate) {
  const existing = await prisma.homeBanner.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError('Banner not found');

  // Strip undefined keys (exactOptionalPropertyTypes hates them)
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) data[k] = v;
  }

  return prisma.homeBanner.update({
    where: { id },
    data,
    select: BANNER_SELECT,
  });
}

export async function softDeleteBanner(id: string) {
  const existing = await prisma.homeBanner.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError('Banner not found');

  await prisma.homeBanner.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
  return { id, deleted: true };
}

/**
 * Public endpoint: live banners for a given placement, honoring start/end
 * window + isActive. Consumed by customer + pro apps. Sorted by sortOrder.
 */
export async function listLiveBanners(placement: BannerPlacement) {
  const now = new Date();
  return prisma.homeBanner.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      placement,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    select: BANNER_SELECT,
  });
}
