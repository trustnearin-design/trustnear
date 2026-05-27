'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ImageUpload } from '@/components/ImageUpload';

type Mode = 'create' | 'edit';

export type CategoryFormValues = {
  parentId: string | null;
  name: string;
  slug: string;
  iconUrl: string;
  bannerUrl: string;
  heroImageUrl: string;
  professionalTitle: string;
  description: string;
  shortPitch: string;
  basePrice: number;
  priceUnit: 'per_hour' | 'per_visit';
  isActive: boolean;
  isFeatured: boolean;
  phase: number;
  sortOrder: number;
  commissionRate: number;
  minDurationMinutes: number;
  searchKeywords: string;
};

export type ParentOption = { id: string; name: string };

export function CategoryForm({
  mode,
  initial,
  categoryId,
  parents,
  defaultParentId,
}: {
  mode: Mode;
  initial: CategoryFormValues;
  categoryId?: string;
  parents: ParentOption[];
  defaultParentId?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<CategoryFormValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();

  const isLeaf = values.parentId !== null;

  function update<K extends keyof CategoryFormValues>(key: K, value: CategoryFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Convert form values → API payload (split keywords by comma, basePrice already paise)
    const payload = {
      parentId: values.parentId,
      name: values.name.trim(),
      slug: values.slug.trim(),
      iconUrl: values.iconUrl.trim() || null,
      bannerUrl: values.bannerUrl.trim() || null,
      heroImageUrl: values.heroImageUrl.trim() || null,
      professionalTitle: values.professionalTitle.trim() || null,
      description: values.description.trim() || null,
      shortPitch: values.shortPitch.trim() || null,
      basePrice: Math.round(values.basePrice * 100), // user enters rupees, store paise
      priceUnit: values.priceUnit,
      isActive: values.isActive,
      isFeatured: values.isFeatured,
      phase: values.phase,
      sortOrder: values.sortOrder,
      commissionRate: values.commissionRate,
      minDurationMinutes: values.minDurationMinutes,
      searchKeywords: values.searchKeywords
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    };

    startTransition(async () => {
      const url =
        mode === 'create' ? '/api/admin/categories' : `/api/admin/categories/${categoryId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.error?.message ?? 'Save failed.');
        return;
      }
      router.push('/categories');
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!categoryId) return;
    if (
      !confirm(
        `Delete "${values.name}"? This soft-deletes the category — you can't undo from the UI.`,
      )
    ) {
      return;
    }
    setError(null);
    startDelete(async () => {
      const res = await fetch(`/api/admin/categories/${categoryId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.error?.message ?? 'Delete failed.');
        return;
      }
      router.push('/categories');
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Identity */}
      <Section title="Identity">
        <Field label="Type">
          <select
            value={values.parentId ?? ''}
            onChange={(e) => update('parentId', e.target.value || null)}
            className="input"
            disabled={mode === 'edit'}
          >
            <option value="">Parent (top-level)</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                Service under: {p.name}
              </option>
            ))}
          </select>
          {mode === 'edit' && (
            <p className="mt-1 text-caption text-ink-subtle">
              Parent can't be changed after creation. Delete + recreate if needed.
            </p>
          )}
        </Field>
        <Row>
          <Field label="Name" required>
            <input
              type="text"
              value={values.name}
              onChange={(e) => {
                update('name', e.target.value);
                if (mode === 'create' && values.slug === '') {
                  update('slug', kebab(e.target.value));
                }
              }}
              className="input"
              required
            />
          </Field>
          <Field label="Slug (URL)" required>
            <input
              type="text"
              value={values.slug}
              onChange={(e) => update('slug', e.target.value)}
              className="input font-mono"
              placeholder="home-cleaning"
              required
            />
          </Field>
        </Row>
        {isLeaf && (
          <Field label="Professional title">
            <input
              type="text"
              value={values.professionalTitle}
              onChange={(e) => update('professionalTitle', e.target.value)}
              className="input"
              placeholder="House Cleaner"
            />
            <p className="mt-1 text-caption text-ink-subtle">
              Shown on expert profiles (e.g. "Electrician", "Beautician").
            </p>
          </Field>
        )}
      </Section>

      {/* Copy */}
      <Section title="Copy">
        <Field label="Short pitch (160 chars)">
          <input
            type="text"
            value={values.shortPitch}
            onChange={(e) => update('shortPitch', e.target.value.slice(0, 160))}
            className="input"
            placeholder="Trained, verified cleaners for every corner of your home"
            maxLength={160}
          />
          <p className="mt-1 text-caption text-ink-subtle">
            {values.shortPitch.length}/160 · shown on category tiles
          </p>
        </Field>
        <Field label="Description (long)">
          <textarea
            value={values.description}
            onChange={(e) => update('description', e.target.value)}
            className="input min-h-[120px]"
            placeholder="Detailed description shown on the category detail screen"
          />
        </Field>
        <Field label="Search keywords (comma-separated, max 20)">
          <input
            type="text"
            value={values.searchKeywords}
            onChange={(e) => update('searchKeywords', e.target.value)}
            className="input"
            placeholder="cleaning, jhadu, pochha, dusting"
          />
        </Field>
      </Section>

      {/* Images */}
      <Section title="Images">
        <ImageUpload
          label="Hero image (main photo)"
          value={values.heroImageUrl}
          onChange={(url) => update('heroImageUrl', url)}
          folder="categories"
          hint="The big photo shown on the category tile + child detail screen. Square or 4:3 works best."
        />
        <ImageUpload
          label="Icon (small)"
          value={values.iconUrl}
          onChange={(url) => update('iconUrl', url)}
          folder="categories"
          hint="Used in nav, search results, and compact lists. Square, transparent PNG preferred."
        />
        <ImageUpload
          label="Banner (wide promo)"
          value={values.bannerUrl}
          onChange={(url) => update('bannerUrl', url)}
          folder="categories"
          aspect="wide"
          hint="Wide promotional strip. Reserved for future use — banner experiments."
        />
      </Section>

      {/* Pricing — only for leaves */}
      {isLeaf && (
        <Section title="Pricing">
          <Row>
            <Field label="Base price (₹)" required>
              <input
                type="number"
                min="0"
                step="1"
                value={values.basePrice}
                onChange={(e) => update('basePrice', Number(e.target.value))}
                className="input"
                required
              />
              <p className="mt-1 text-caption text-ink-subtle">
                Enter in rupees — stored as paise in DB.
              </p>
            </Field>
            <Field label="Price unit">
              <select
                value={values.priceUnit}
                onChange={(e) => update('priceUnit', e.target.value as 'per_hour' | 'per_visit')}
                className="input"
              >
                <option value="per_hour">Per hour</option>
                <option value="per_visit">Per visit</option>
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Commission %">
              <input
                type="number"
                min="0"
                max="50"
                step="0.1"
                value={values.commissionRate}
                onChange={(e) => update('commissionRate', Number(e.target.value))}
                className="input"
              />
            </Field>
            <Field label="Min duration (minutes)">
              <input
                type="number"
                min="15"
                max="480"
                step="15"
                value={values.minDurationMinutes}
                onChange={(e) => update('minDurationMinutes', Number(e.target.value))}
                className="input"
              />
            </Field>
          </Row>
        </Section>
      )}

      {/* Visibility + ordering */}
      <Section title="Visibility & ordering">
        <Row>
          <Field label="Sort order">
            <input
              type="number"
              min="0"
              max="999"
              value={values.sortOrder}
              onChange={(e) => update('sortOrder', Number(e.target.value))}
              className="input"
            />
            <p className="mt-1 text-caption text-ink-subtle">Lower = shown first.</p>
          </Field>
          <Field label="Phase">
            <input
              type="number"
              min="1"
              max="10"
              value={values.phase}
              onChange={(e) => update('phase', Number(e.target.value))}
              className="input"
            />
            <p className="mt-1 text-caption text-ink-subtle">Rollout phase (1 = live now).</p>
          </Field>
        </Row>
        <Row>
          <Toggle
            label="Active (visible to customers)"
            value={values.isActive}
            onChange={(v) => update('isActive', v)}
          />
          <Toggle
            label="Featured (highlighted in app)"
            value={values.isFeatured}
            onChange={(v) => update('isFeatured', v)}
          />
        </Row>
      </Section>

      {/* Submit */}
      <div className="flex items-center justify-between gap-3 border-t border-border pt-6">
        <div>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || pending}
              className="rounded-pill border border-danger/30 px-4 py-2 text-small font-semibold text-danger transition hover:bg-danger/5 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete category'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {error && <p className="text-small text-danger">{error}</p>}
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? 'Saving…' : mode === 'create' ? 'Create category' : 'Save changes'}
          </button>
        </div>
      </div>
    </form>
  );

  function Field({
    label,
    children,
    required,
  }: {
    label: string;
    children: React.ReactNode;
    required?: boolean;
  }) {
    return (
      <div>
        <label className="mb-1.5 block text-small font-semibold text-ink-muted">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
        {children}
      </div>
    );
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="card p-6">
      <legend className="px-2 text-caption font-semibold uppercase tracking-wider text-ink-subtle">
        {title}
      </legend>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-card border border-border bg-surface-muted p-3">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-brand"
      />
      <span className="text-small font-medium text-ink">{label}</span>
    </label>
  );
}

function kebab(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}
