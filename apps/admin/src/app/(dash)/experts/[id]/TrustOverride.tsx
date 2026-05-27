'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

const BADGES = ['none', 'bronze', 'silver', 'gold', 'platinum'] as const;
type Badge = (typeof BADGES)[number];

export function TrustOverride({
  expertId,
  currentScore,
  currentBadge,
}: {
  expertId: string;
  currentScore: number;
  currentBadge: Badge;
}) {
  const router = useRouter();
  const [score, setScore] = useState<number>(currentScore);
  const [badge, setBadge] = useState<Badge>(currentBadge);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = score !== currentScore || badge !== currentBadge;

  function save() {
    if (!confirm(`Override trust to ${score.toFixed(1)} / ${badge}? Logged in audit.`)) return;
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await fetch(`/api/admin/experts/${expertId}/trust`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trustScore: score, trustBadge: badge }),
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.error?.message ?? 'Save failed.');
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3 md:grid-cols-[1fr,1fr,auto] md:items-end">
      <div>
        <label className="mb-1.5 block text-small font-semibold text-ink-muted">
          Trust score (0–100)
        </label>
        <input
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className="input"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-small font-semibold text-ink-muted">Badge</label>
        <select value={badge} onChange={(e) => setBadge(e.target.value as Badge)} className="input">
          {BADGES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>
      <button type="button" onClick={save} disabled={!dirty || pending} className="btn-primary">
        {pending ? 'Saving…' : 'Override'}
      </button>
      {error && <p className="md:col-span-3 text-small text-danger">{error}</p>}
      {saved && <p className="md:col-span-3 text-small text-success">✓ Trust override saved</p>}
    </div>
  );
}
