'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ImageUpload } from '@/components/ImageUpload';

type Placement = 'home_hero' | 'home_strip' | 'category_top' | 'booking_complete';
type LinkKind = 'none' | 'category' | 'external' | 'promo';

export type BannerFormValues = {
  title: string;
  subtitle: string;
  imageUrl: string;
  placement: Placement;
  ctaText: string;
  linkKind: LinkKind;
  linkTarget: string;
  startsAt: string; // ISO local datetime "2026-05-23T14:30"
  endsAt: string;
  sortOrder: number;
  isActive: boolean;
};

const PLACEMENT_OPTIONS: { value: Placement; label: string; description: string }[] = [
  {
    value: 'home_hero',
    label: 'Home — hero slider',
    description: 'Top of customer home, large carousel.',
  },
  {
    value: 'home_strip',
    label: 'Home — promo strip',
    description: 'Mid-page horizontal strip below categories.',
  },
  {
    value: 'category_top',
    label: 'Category page — top',
    description: 'Above the experts list on a category screen.',
  },
  {
    value: 'booking_complete',
    label: 'Booking complete',
    description: 'After a successful booking — referral / upsell.',
  },
];

const LINK_OPTIONS: { value: LinkKind; label: string; hint: string }[] = [
  { value: 'none', label: 'No action', hint: 'Banner is decorative.' },
  { value: 'category', label: 'Open category', hint: 'Use category slug (e.g. home-cleaning).' },
  { value: 'external', label: 'External URL', hint: 'Opens in browser.' },
  { value: 'promo', label: 'Apply promo code', hint: 'Auto-applies a promo on tap.' },
];

export function BannerForm({
  mode,
  initial,
  bannerId,
}: {
  mode: 'create' | 'edit';
  initial: BannerFormValues;
  bannerId?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<BannerFormValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();

  function update<K extends keyof BannerFormValues>(key: K, value: BannerFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.imageUrl) {
      setError('Please upload or paste an image URL.');
      return;
    }

    const payload = {
      title: values.title.trim(),
      subtitle: values.subtitle.trim() || null,
      imageUrl: values.imageUrl.trim(),
      placement: values.placement,
      ctaText: values.ctaText.trim() || null,
      linkKind: values.linkKind,
      linkTarget: values.linkKind === 'none' ? null : values.linkTarget.trim() || null,
      startsAt: values.startsAt ? new Date(values.startsAt).toISOString() : null,
      endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : null,
      sortOrder: values.sortOrder,
      isActive: values.isActive,
    };

    startTransition(async () => {
      const url = mode === 'create' ? '/api/admin/banners' : `/api/admin/banners/${bannerId}`;
      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.error?.message ?? 'Save failed.');
        return;
      }
      router.push('/banners');
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!bannerId) return;
    if (!confirm(`Delete "${values.title}"? Soft delete — can't undo from UI.`)) return;
    setError(null);
    startDelete(async () => {
      const res = await fetch(`/api/admin/banners/${bannerId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.error?.message ?? 'Delete failed.');
        return;
      }
      router.push('/banners');
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Section title="Content">
        <Field label="Title" required>
          <input
            type="text"
            value={values.title}
            onChange={(e) => update('title', e.target.value.slice(0, 100))}
            className="input"
            placeholder="Diwali Deep Cleaning · Flat 20% Off"
            required
            maxLength={100}
          />
        </Field>
        <Field label="Subtitle (optional, max 160)">
          <input
            type="text"
            value={values.subtitle}
            onChange={(e) => update('subtitle', e.target.value.slice(0, 160))}
            className="input"
            placeholder="Book now — limited slots this week"
            maxLength={160}
          />
        </Field>
        <ImageUpload
          label="Banner image"
          value={values.imageUrl}
          onChange={(url) => update('imageUrl', url)}
          folder="banners"
          aspect="wide"
          hint="Recommended: 16:9 ratio. Designed to fill the slider/strip width."
        />
        <Field label="CTA button text (optional)">
          <input
            type="text"
            value={values.ctaText}
            onChange={(e) => update('ctaText', e.target.value.slice(0, 40))}
            className="input"
            placeholder="Book now"
            maxLength={40}
          />
        </Field>
      </Section>

      <Section title="Placement & action">
        <Field label="Where does this banner show?" required>
          <select
            value={values.placement}
            onChange={(e) => update('placement', e.target.value as Placement)}
            className="input"
          >
            {PLACEMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-caption text-ink-subtle">
            {PLACEMENT_OPTIONS.find((o) => o.value === values.placement)?.description}
          </p>
        </Field>
        <Row>
          <Field label="Tap action">
            <select
              value={values.linkKind}
              onChange={(e) => update('linkKind', e.target.value as LinkKind)}
              className="input"
            >
              {LINK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          {values.linkKind !== 'none' && (
            <Field label="Link target">
              <input
                type="text"
                value={values.linkTarget}
                onChange={(e) => update('linkTarget', e.target.value)}
                className="input font-mono"
                placeholder={
                  values.linkKind === 'category'
                    ? 'home-cleaning'
                    : values.linkKind === 'external'
                      ? 'https://trustnear.in/diwali'
                      : 'DIWALI20'
                }
              />
              <p className="mt-1 text-caption text-ink-subtle">
                {LINK_OPTIONS.find((o) => o.value === values.linkKind)?.hint}
              </p>
            </Field>
          )}
        </Row>
      </Section>

      <Section title="Schedule & visibility">
        <Row>
          <Field label="Starts at (optional)">
            <input
              type="datetime-local"
              value={values.startsAt}
              onChange={(e) => update('startsAt', e.target.value)}
              className="input"
            />
            <p className="mt-1 text-caption text-ink-subtle">
              Empty = visible immediately when active.
            </p>
          </Field>
          <Field label="Ends at (optional)">
            <input
              type="datetime-local"
              value={values.endsAt}
              onChange={(e) => update('endsAt', e.target.value)}
              className="input"
            />
            <p className="mt-1 text-caption text-ink-subtle">Empty = never expires.</p>
          </Field>
        </Row>
        <Row>
          <Field label="Sort order (lower = first)">
            <input
              type="number"
              min="0"
              max="999"
              value={values.sortOrder}
              onChange={(e) => update('sortOrder', Number(e.target.value))}
              className="input"
            />
          </Field>
          <label className="flex cursor-pointer items-center gap-3 rounded-card border border-border bg-surface-muted p-3">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(e) => update('isActive', e.target.checked)}
              className="h-5 w-5 accent-brand"
            />
            <span className="text-small font-medium text-ink">Active (visible to customers)</span>
          </label>
        </Row>
      </Section>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-6">
        <div>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || pending}
              className="rounded-pill border border-danger/30 px-4 py-2 text-small font-semibold text-danger transition hover:bg-danger/5 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete banner'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {error && <p className="text-small text-danger">{error}</p>}
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? 'Saving…' : mode === 'create' ? 'Create banner' : 'Save changes'}
          </button>
        </div>
      </div>
    </form>
  );
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
