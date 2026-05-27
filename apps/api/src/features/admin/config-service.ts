import { prisma } from '@sevalink/db';
import { DomainError, ErrorCode, NotFoundError } from '@sevalink/types';
import { CONFIG_REGISTRY, findDescriptor, type ConfigDescriptor } from './config-registry.js';

export type ConfigEntry = {
  key: string;
  value: unknown;
  description: string | null;
  isPublic: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  /** Registry metadata if this key is known. Unknown keys show as advanced/raw. */
  descriptor: ConfigDescriptor | null;
};

/**
 * Returns every known config key (with its registry metadata + current
 * stored value, falling back to descriptor.defaultValue if not yet
 * written) PLUS any "orphan" keys that exist in the DB but not in the
 * registry (shown under "Advanced / Unknown" in the UI).
 */
export async function listAllConfig(): Promise<ConfigEntry[]> {
  const stored = await prisma.appConfig.findMany();
  const storedMap = new Map(stored.map((r) => [r.key, r]));

  const result: ConfigEntry[] = [];

  // Every registered key first (in registry order so groups render predictably)
  for (const d of CONFIG_REGISTRY) {
    const row = storedMap.get(d.key);
    result.push({
      key: d.key,
      value: row ? row.value : d.defaultValue,
      description: row?.description ?? null,
      isPublic: row?.isPublic ?? Boolean(d.isPublic),
      updatedAt: row?.updatedAt.toISOString() ?? null,
      updatedBy: row?.updatedBy ?? null,
      descriptor: d,
    });
    storedMap.delete(d.key);
  }

  // Then any unregistered keys that the DB has (defensive — keeps admins
  // from losing visibility of legacy settings).
  for (const [key, row] of storedMap) {
    result.push({
      key,
      value: row.value,
      description: row.description,
      isPublic: row.isPublic,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
      descriptor: null,
    });
  }

  return result;
}

export async function getConfig(key: string): Promise<ConfigEntry> {
  const row = await prisma.appConfig.findUnique({ where: { key } });
  const descriptor = findDescriptor(key) ?? null;
  if (!row && !descriptor) {
    throw new NotFoundError(`Config key "${key}" not found`);
  }
  return {
    key,
    value: row ? row.value : descriptor!.defaultValue,
    description: row?.description ?? null,
    isPublic: row?.isPublic ?? Boolean(descriptor?.isPublic),
    updatedAt: row?.updatedAt.toISOString() ?? null,
    updatedBy: row?.updatedBy ?? null,
    descriptor,
  };
}

/**
 * Upsert a config value. Validates against the registry descriptor if one
 * exists (number bounds, type match). Unknown keys are accepted as-is
 * (admin-as-developer escape hatch — Vikas can use Postman to set raw
 * keys without me having to ship a new release of the registry).
 */
export async function upsertConfig(input: {
  key: string;
  value: unknown;
  description?: string;
  isPublic?: boolean;
  actorId: string;
}): Promise<ConfigEntry> {
  const descriptor = findDescriptor(input.key);
  if (descriptor) {
    validateAgainstDescriptor(descriptor, input.value);
  }

  const row = await prisma.appConfig.upsert({
    where: { key: input.key },
    update: {
      value: input.value as never,
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
      updatedBy: input.actorId,
    },
    create: {
      key: input.key,
      value: input.value as never,
      description: input.description ?? descriptor?.description ?? null,
      isPublic: input.isPublic ?? Boolean(descriptor?.isPublic),
      updatedBy: input.actorId,
    },
  });

  return {
    key: row.key,
    value: row.value,
    description: row.description,
    isPublic: row.isPublic,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
    descriptor: descriptor ?? null,
  };
}

export async function deleteConfig(key: string): Promise<{ key: string; deleted: boolean }> {
  // Don't allow deleting registered keys — they're meaningful to the app.
  // Admin can RESET them by upserting with the default value.
  if (findDescriptor(key)) {
    throw new DomainError(
      ErrorCode.SL_900_VALIDATION_ERROR,
      `"${key}" is a registered config key. Reset to default by editing — not deleting.`,
    );
  }
  await prisma.appConfig.delete({ where: { key } }).catch(() => null);
  return { key, deleted: true };
}

function validateAgainstDescriptor(d: ConfigDescriptor, value: unknown): void {
  switch (d.type) {
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new DomainError(
          ErrorCode.SL_900_VALIDATION_ERROR,
          `${d.key} expects a number, got ${typeof value}.`,
        );
      }
      if (d.min !== undefined && value < d.min) {
        throw new DomainError(ErrorCode.SL_900_VALIDATION_ERROR, `${d.key} minimum is ${d.min}.`);
      }
      if (d.max !== undefined && value > d.max) {
        throw new DomainError(ErrorCode.SL_900_VALIDATION_ERROR, `${d.key} maximum is ${d.max}.`);
      }
      return;
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new DomainError(ErrorCode.SL_900_VALIDATION_ERROR, `${d.key} expects a boolean.`);
      }
      return;
    case 'string':
      if (typeof value !== 'string') {
        throw new DomainError(ErrorCode.SL_900_VALIDATION_ERROR, `${d.key} expects a string.`);
      }
      return;
    case 'json':
      if (value === null || typeof value !== 'object') {
        throw new DomainError(ErrorCode.SL_900_VALIDATION_ERROR, `${d.key} expects an object.`);
      }
      return;
  }
}
