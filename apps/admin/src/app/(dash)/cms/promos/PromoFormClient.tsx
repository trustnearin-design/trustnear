'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { clientFetch } from '@/lib/api-client';
import { SkeletonBar } from '@/components/Skeletons';

type Promo = {
  id: string;
  code: string;
  description: string | null;
  discountType: 'percent' | 'flat';
  value: number;
  maxDiscount: number | null;
  minOrderAmount: number;
  usageLimit: number | null;
  perUserLimit: number;
  isActive: boolean;
  validFrom: string;
  validUntil: string;
};

export function PromoFormClient({ mode, id }: { mode: 'create' | 'edit'; id?: string }) {
  const router = useRouter();

  const loaded = useQuery({
    queryKey: ['admin', 'cms', 'promos', id],
    queryFn: () => clientFetch<Promo>(`/api/admin/cms/promo-codes/${id}`),
    enabled: mode === 'edit' && !!id,
  });

  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent');
  const [value, setValue] = useState('1000'); // percent x100, or paise
  const [maxDiscount, setMaxDiscount] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('0');
  const [usageLimit, setUsageLimit] = useState('');
  const [perUserLimit, setPerUserLimit] = useState('1');
  const [isActive, setIsActive] = useState(true);
  const [validFrom, setValidFrom] = useState(toLocalInput(new Date()));
  const [validUntil, setValidUntil] = useState(toLocalInput(new Date(Date.now() + 30 * 86400_000)));

  useEffect(() => {
    if (mode === 'edit' && loaded.data) {
      const p = loaded.data;
      setCode(p.code);
      setDescription(p.description ?? '');
      setDiscountType(p.discountType);
      setValue(String(p.value));
      setMaxDiscount(p.maxDiscount === null ? '' : String(p.maxDiscount));
      setMinOrderAmount(String(p.minOrderAmount));
      setUsageLimit(p.usageLimit === null ? '' : String(p.usageLimit));
      setPerUserLimit(String(p.perUserLimit));
      setIsActive(p.isActive);
      setValidFrom(toLocalInput(new Date(p.validFrom)));
      setValidUntil(toLocalInput(new Date(p.validUntil)));
    }
  }, [mode, loaded.data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        code,
        description: description || null,
        discountType,
        value: Number(value),
        maxDiscount: maxDiscount === '' ? null : Number(maxDiscount),
        minOrderAmount: Number(minOrderAmount || 0),
        usageLimit: usageLimit === '' ? null : Number(usageLimit),
        perUserLimit: Number(perUserLimit || 1),
        isActive,
        validFrom: new Date(validFrom).toISOString(),
        validUntil: new Date(validUntil).toISOString(),
      };
      if (mode === 'create') {
        return clientFetch<Promo>('/api/admin/cms/promo-codes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      return clientFetch<Promo>(`/api/admin/cms/promo-codes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success(mode === 'create' ? 'Promo created' : 'Promo updated');
      router.push('/cms/promos' as never);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
  });

  if (mode === 'edit' && loaded.isPending) {
    return <SkeletonBar className="h-96" />;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="card max-w-3xl space-y-5 p-6"
    >
      <div className="grid gap-4 sm:grid-cols-[1fr,2fr]">
        <Field label="Code (uppercase)">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={20}
            required
            disabled={mode === 'edit'}
            className="input w-full font-mono uppercase"
            placeholder="DIWALI50"
          />
        </Field>
        <Field label="Description (admin only)">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input w-full"
            placeholder="Diwali 2026 promo"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Discount type">
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as 'percent' | 'flat')}
            className="input w-full"
          >
            <option value="percent">Percent</option>
            <option value="flat">Flat (paise)</option>
          </select>
        </Field>
        <Field label={discountType === 'percent' ? 'Value (× 100, max 10000)' : 'Value (paise)'}>
          <input
            type="number"
            value={value}
            min={1}
            onChange={(e) => setValue(e.target.value)}
            required
            className="input w-full"
          />
        </Field>
        <Field label="Max discount (paise, cap for %)">
          <input
            type="number"
            value={maxDiscount}
            min={0}
            onChange={(e) => setMaxDiscount(e.target.value)}
            placeholder="Leave blank for none"
            className="input w-full"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Min order (paise)">
          <input
            type="number"
            value={minOrderAmount}
            min={0}
            onChange={(e) => setMinOrderAmount(e.target.value)}
            className="input w-full"
          />
        </Field>
        <Field label="Total usage cap">
          <input
            type="number"
            value={usageLimit}
            min={0}
            onChange={(e) => setUsageLimit(e.target.value)}
            placeholder="∞"
            className="input w-full"
          />
        </Field>
        <Field label="Per-user limit">
          <input
            type="number"
            value={perUserLimit}
            min={0}
            onChange={(e) => setPerUserLimit(e.target.value)}
            className="input w-full"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Valid from">
          <input
            type="datetime-local"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            required
            className="input w-full"
          />
        </Field>
        <Field label="Valid until">
          <input
            type="datetime-local"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            required
            className="input w-full"
          />
        </Field>
      </div>

      <label className="inline-flex items-center gap-2 text-small text-ink">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 accent-brand"
        />
        Active
      </label>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-card border border-border bg-surface px-4 py-2 text-small font-medium text-ink hover:bg-surface-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={save.isPending}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {save.isPending ? 'Saving…' : mode === 'create' ? 'Create promo' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    'T' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes())
  );
}
