'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

const ROLES = ['customer', 'professional', 'admin'] as const;
type Role = (typeof ROLES)[number];

export function UserActions({
  userId,
  currentRole,
  isActive,
}: {
  userId: string;
  currentRole: Role;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pendingRole, setPendingRole] = useState<Role>(currentRole);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [toggling, startToggle] = useTransition();

  function saveRole() {
    if (pendingRole === currentRole) return;
    if (
      !confirm(`Change role from "${currentRole}" to "${pendingRole}"? This is logged in audit.`)
    ) {
      return;
    }
    setError(null);
    startSave(async () => {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: pendingRole }),
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.error?.message ?? 'Failed to change role.');
        return;
      }
      router.refresh();
    });
  }

  function toggleActive() {
    const next = !isActive;
    if (!confirm(next ? 'Reactivate this account?' : 'Suspend this account?')) return;
    setError(null);
    startToggle(async () => {
      const res = await fetch(`/api/admin/users/${userId}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: next }),
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.error?.message ?? 'Failed.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-small font-semibold text-ink-muted">Role</label>
        <div className="flex gap-2">
          <select
            value={pendingRole}
            onChange={(e) => setPendingRole(e.target.value as Role)}
            className="input flex-1"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={saveRole}
            disabled={pendingRole === currentRole || saving}
            className="btn-primary"
          >
            {saving ? 'Saving…' : 'Save role'}
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-small font-semibold text-ink-muted">
          Account status
        </label>
        <button
          type="button"
          onClick={toggleActive}
          disabled={toggling}
          className={
            isActive
              ? 'rounded-pill border border-danger/30 px-5 py-3 text-small font-semibold text-danger transition hover:bg-danger/5 disabled:opacity-50'
              : 'btn-primary'
          }
        >
          {toggling ? 'Working…' : isActive ? 'Suspend account' : 'Reactivate account'}
        </button>
      </div>

      {error && <p className="text-small text-danger">{error}</p>}
    </div>
  );
}
