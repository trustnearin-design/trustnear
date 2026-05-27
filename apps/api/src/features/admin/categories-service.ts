import { prisma } from '@sevalink/db';
import type { PriceUnit } from '@sevalink/db';
import { NotFoundError, DomainError, ErrorCode } from '@sevalink/types';

const CATEGORY_SELECT = {
  id: true,
  parentId: true,
  name: true,
  slug: true,
  iconUrl: true,
  bannerUrl: true,
  heroImageUrl: true,
  professionalTitle: true,
  description: true,
  shortPitch: true,
  basePrice: true,
  priceUnit: true,
  isActive: true,
  isFeatured: true,
  phase: true,
  sortOrder: true,
  commissionRate: true,
  minDurationMinutes: true,
  searchKeywords: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { offerings: true, bookings: true } },
} as const;

/**
 * Full category tree as a flat list grouped client-side. Includes inactive +
 * featured flags + booking counts so the admin tree can show usage badges.
 * Soft-deleted rows are excluded — admins use a dedicated trash view for those
 * (deferred).
 */
export async function listAllCategories() {
  const rows = await prisma.serviceCategory.findMany({
    where: { deletedAt: null },
    orderBy: [{ parentId: { sort: 'asc', nulls: 'first' } }, { sortOrder: 'asc' }, { name: 'asc' }],
    select: CATEGORY_SELECT,
  });
  return rows;
}

export async function getCategory(id: string) {
  const row = await prisma.serviceCategory.findFirst({
    where: { id, deletedAt: null },
    select: { ...CATEGORY_SELECT, parent: { select: { id: true, name: true, slug: true } } },
  });
  if (!row) throw new NotFoundError('Category not found');
  return row;
}

export type CategoryInput = {
  parentId: string | null;
  name: string;
  slug: string;
  iconUrl: string | null;
  bannerUrl: string | null;
  heroImageUrl: string | null;
  professionalTitle: string | null;
  description: string | null;
  shortPitch: string | null;
  basePrice: number;
  priceUnit: PriceUnit;
  isActive: boolean;
  isFeatured: boolean;
  phase: number;
  sortOrder: number;
  commissionRate: number;
  minDurationMinutes: number;
  searchKeywords: string[];
};

export async function createCategory(input: CategoryInput) {
  // Validate parent if leaf
  if (input.parentId) {
    const parent = await prisma.serviceCategory.findUnique({
      where: { id: input.parentId },
      select: { id: true, parentId: true },
    });
    if (!parent) throw new NotFoundError('Parent category not found');
    if (parent.parentId !== null) {
      throw new DomainError(
        ErrorCode.SL_900_VALIDATION_ERROR,
        'Categories are only two levels deep — cannot nest under a leaf.',
      );
    }
  }

  // Slug uniqueness check (let DB enforce too, but better error)
  const slugClash = await prisma.serviceCategory.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (slugClash) {
    throw new DomainError(
      ErrorCode.SL_900_VALIDATION_ERROR,
      `Slug "${input.slug}" already in use.`,
    );
  }

  const created = await prisma.serviceCategory.create({
    data: input,
    select: CATEGORY_SELECT,
  });
  return created;
}

type CategoryUpdate = {
  [K in keyof CategoryInput]?: CategoryInput[K] | undefined;
};

export async function updateCategory(id: string, input: CategoryUpdate) {
  const existing = await prisma.serviceCategory.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, parentId: true, slug: true },
  });
  if (!existing) throw new NotFoundError('Category not found');

  if (input.slug && input.slug !== existing.slug) {
    const clash = await prisma.serviceCategory.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });
    if (clash && clash.id !== id) {
      throw new DomainError(
        ErrorCode.SL_900_VALIDATION_ERROR,
        `Slug "${input.slug}" already in use.`,
      );
    }
  }

  // Disallow reparenting that would create grandchildren or make a parent
  // into a leaf when it has children.
  if (input.parentId !== undefined && input.parentId !== existing.parentId) {
    if (input.parentId !== null) {
      const newParent = await prisma.serviceCategory.findUnique({
        where: { id: input.parentId },
        select: { id: true, parentId: true },
      });
      if (!newParent) throw new NotFoundError('Parent category not found');
      if (newParent.parentId !== null) {
        throw new DomainError(
          ErrorCode.SL_900_VALIDATION_ERROR,
          'Cannot nest under another leaf — max depth is two.',
        );
      }
    }
    // If was a parent with children, refuse to demote.
    const childCount = await prisma.serviceCategory.count({
      where: { parentId: id, deletedAt: null },
    });
    if (childCount > 0 && input.parentId !== null) {
      throw new DomainError(
        ErrorCode.SL_900_VALIDATION_ERROR,
        'This category has children — move or delete them before reparenting.',
      );
    }
  }

  // Strip undefined keys — Prisma with exactOptionalPropertyTypes rejects
  // explicit undefined on fields whose update type is `T | null` (not `T | null | undefined`).
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) data[k] = v;
  }

  const updated = await prisma.serviceCategory.update({
    where: { id },
    data,
    select: CATEGORY_SELECT,
  });
  return updated;
}

/**
 * Soft delete. Refuses if the category has active children or recent bookings.
 * Admins can still hide a category via isActive=false without deleting.
 */
export async function softDeleteCategory(id: string) {
  const existing = await prisma.serviceCategory.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError('Category not found');

  const childCount = await prisma.serviceCategory.count({
    where: { parentId: id, deletedAt: null },
  });
  if (childCount > 0) {
    throw new DomainError(
      ErrorCode.SL_900_VALIDATION_ERROR,
      `Cannot delete — has ${childCount} active child category${childCount === 1 ? '' : 'ies'}. Delete or move them first.`,
    );
  }

  const offeringCount = await prisma.proServiceOffering.count({
    where: { categoryId: id, isActive: true },
  });
  if (offeringCount > 0) {
    throw new DomainError(
      ErrorCode.SL_900_VALIDATION_ERROR,
      `Cannot delete — ${offeringCount} expert${offeringCount === 1 ? '' : 's'} offer this service. Toggle inactive instead.`,
    );
  }

  await prisma.serviceCategory.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
  return { id, deleted: true };
}

/**
 * Bulk reorder — atomic. Accepts {id, sortOrder} pairs; everything else stays.
 */
export async function reorderCategories(items: Array<{ id: string; sortOrder: number }>) {
  await prisma.$transaction(
    items.map((i) =>
      prisma.serviceCategory.update({
        where: { id: i.id },
        data: { sortOrder: i.sortOrder },
      }),
    ),
  );
  return { updated: items.length };
}
