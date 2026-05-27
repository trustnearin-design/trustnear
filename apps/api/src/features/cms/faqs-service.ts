import { prisma } from '@sevalink/db';
import { DomainError, ErrorCode, NotFoundError } from '@sevalink/types';

const SELECT = {
  id: true,
  slug: true,
  category: true,
  question: true,
  body: true,
  sortOrder: true,
  isPublished: true,
  updatedAt: true,
} as const;

/** Admin list — includes unpublished. */
export async function listFaqs() {
  return prisma.faqArticle.findMany({
    where: { deletedAt: null },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { question: 'asc' }],
    select: SELECT,
  });
}

/** Public list — only published. Grouped client-side by category. */
export async function listPublishedFaqs() {
  return prisma.faqArticle.findMany({
    where: { deletedAt: null, isPublished: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { question: 'asc' }],
    select: SELECT,
  });
}

export async function getFaq(id: string) {
  const row = await prisma.faqArticle.findUnique({ where: { id }, select: SELECT });
  if (!row || (row as { deletedAt?: Date | null }).deletedAt) {
    throw new NotFoundError('FAQ not found');
  }
  return row;
}

export async function createFaq(input: {
  slug: string;
  category: string;
  question: string;
  body: string;
  sortOrder: number;
  isPublished: boolean;
}) {
  const dup = await prisma.faqArticle.findUnique({ where: { slug: input.slug } });
  if (dup) throw new DomainError(ErrorCode.SL_900_VALIDATION_ERROR, 'Slug already exists');
  return prisma.faqArticle.create({ data: input, select: SELECT });
}

export async function updateFaq(
  id: string,
  patch: {
    slug?: string | undefined;
    category?: string | undefined;
    question?: string | undefined;
    body?: string | undefined;
    sortOrder?: number | undefined;
    isPublished?: boolean | undefined;
  },
) {
  const existing = await prisma.faqArticle.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('FAQ not found');

  if (patch.slug && patch.slug !== existing.slug) {
    const dup = await prisma.faqArticle.findUnique({ where: { slug: patch.slug } });
    if (dup) throw new DomainError(ErrorCode.SL_900_VALIDATION_ERROR, 'Slug already exists');
  }
  // Drop undefined keys so Prisma's exactOptionalPropertyTypes is happy.
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) data[k] = v;
  }
  return prisma.faqArticle.update({ where: { id }, data: data as never, select: SELECT });
}

export async function softDeleteFaq(id: string) {
  const existing = await prisma.faqArticle.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('FAQ not found');
  await prisma.faqArticle.update({
    where: { id },
    data: { deletedAt: new Date(), isPublished: false },
  });
  return { id };
}
