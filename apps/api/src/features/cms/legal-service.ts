import { prisma } from '@sevalink/db';
import { NotFoundError } from '@sevalink/types';

const SELECT = {
  id: true,
  slug: true,
  title: true,
  body: true,
  version: true,
  effectiveAt: true,
  isPublished: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Admin list — all versions across all slugs, newest first per slug.
 * Useful for the edit screen where ops want to see history.
 */
export async function listLegalPages() {
  return prisma.legalPage.findMany({
    orderBy: [{ slug: 'asc' }, { version: 'desc' }],
    select: SELECT,
  });
}

export async function getLegalPage(id: string) {
  const row = await prisma.legalPage.findUnique({ where: { id }, select: SELECT });
  if (!row) throw new NotFoundError('Legal page not found');
  return row;
}

/**
 * Public — latest PUBLISHED version for the given slug. Returns null if
 * the slug has never been published (so callers can render a placeholder
 * instead of erroring).
 */
export async function getPublishedLegalPage(slug: string) {
  return prisma.legalPage.findFirst({
    where: { slug, isPublished: true },
    orderBy: { version: 'desc' },
    select: SELECT,
  });
}

/**
 * Create a new version. Each save bumps version = max(existing) + 1, so
 * historical text users agreed to stays preserved.
 */
export async function createLegalPageVersion(input: {
  slug: string;
  title: string;
  body: string;
  effectiveAt?: Date;
  isPublished: boolean;
  createdBy: string;
}) {
  const last = await prisma.legalPage.findFirst({
    where: { slug: input.slug },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  const nextVersion = (last?.version ?? 0) + 1;

  // If this version is being published, unpublish prior versions so the
  // public read endpoint reliably returns the newest live copy.
  if (input.isPublished) {
    await prisma.legalPage.updateMany({
      where: { slug: input.slug, isPublished: true },
      data: { isPublished: false },
    });
  }

  return prisma.legalPage.create({
    data: {
      slug: input.slug,
      title: input.title,
      body: input.body,
      version: nextVersion,
      effectiveAt: input.effectiveAt ?? new Date(),
      isPublished: input.isPublished,
      createdBy: input.createdBy,
    },
    select: SELECT,
  });
}

/** Toggle published state on an existing version. */
export async function setPublished(id: string, isPublished: boolean) {
  const row = await prisma.legalPage.findUnique({ where: { id } });
  if (!row) throw new NotFoundError('Legal page not found');

  if (isPublished) {
    await prisma.legalPage.updateMany({
      where: { slug: row.slug, isPublished: true, NOT: { id } },
      data: { isPublished: false },
    });
  }

  return prisma.legalPage.update({
    where: { id },
    data: { isPublished },
    select: SELECT,
  });
}
