'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export type ConfigDescriptor = {
  key: string;
  group: string;
  label: string;
  description: string;
  type: 'number' | 'boolean' | 'string' | 'json';
  defaultValue: unknown;
  min?: number;
  max?: number;
  unit?: string;
  isPublic?: boolean;
};

export type ConfigEntry = {
  key: string;
  value: unknown;
  description: string | null;
  isPublic: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  descriptor: ConfigDescriptor | null;
};

export function ConfigEditor({ entry }: { entry: ConfigEntry }) {
  const router = useRouter();
  const [value, setValue] = useState<unknown>(entry.value);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = JSON.stringify(value) !== JSON.stringify(entry.value);
  const isDefault = entry.descriptor
    ? JSON.stringify(value) === JSON.stringify(entry.descriptor.defaultValue)
    : false;

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await fetch(`/api/admin/config/${encodeURIComponent(entry.key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
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

  function resetToDefault() {
    if (!entry.descriptor) return;
    setValue(entry.descriptor.defaultValue);
  }

  const label = entry.descriptor?.label ?? entry.key;
  const description = entry.descriptor?.description ?? entry.description;

  return (
    <div className="grid gap-5 md:grid-cols-[1fr,minmax(0,1.2fr)] md:gap-8">
      {/* Left: meta */}
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-body font-semibold text-ink">{label}</h3>
          {entry.isPublic && (
            <span className="pill bg-accent/15 text-accent-700" title="Exposed via public /config">
              Public
            </span>
          )}
        </div>
        <code className="mt-0.5 block font-mono text-caption text-ink-subtle">{entry.key}</code>
        {description && <p className="mt-2 text-small text-ink-muted">{description}</p>}
        {entry.updatedAt && (
          <p className="mt-3 text-caption text-ink-subtle">
            Last updated {new Date(entry.updatedAt).toLocaleString('en-IN')}
          </p>
        )}
      </div>

      {/* Right: editor */}
      <div>
        <ValueEditor value={value} onChange={setValue} descriptor={entry.descriptor} />

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-caption">
            {dirty && <span className="text-warning">● Unsaved</span>}
            {saved && <span className="text-success">✓ Saved</span>}
            {error && <span className="text-danger">{error}</span>}
          </div>
          <div className="flex items-center gap-2">
            {entry.descriptor && !isDefault && (
              <button type="button" onClick={resetToDefault} className="btn-ghost text-small">
                Reset to default
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!dirty || pending}
              className="btn-primary text-small"
            >
              {pending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValueEditor({
  value,
  onChange,
  descriptor,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  descriptor: ConfigDescriptor | null;
}) {
  const type = descriptor?.type ?? guessType(value);

  if (type === 'boolean') {
    const v = Boolean(value);
    return (
      <label className="flex cursor-pointer items-center gap-3 rounded-card border border-border bg-surface-muted p-3">
        <input
          type="checkbox"
          checked={v}
          onChange={(e) => onChange(e.target.checked)}
          className="h-5 w-5 accent-brand"
        />
        <span className="text-small font-medium text-ink">{v ? 'Enabled' : 'Disabled'}</span>
      </label>
    );
  }

  if (type === 'number') {
    const v = typeof value === 'number' ? value : Number(value) || 0;
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={v}
          onChange={(e) => onChange(Number(e.target.value))}
          min={descriptor?.min}
          max={descriptor?.max}
          step={descriptor?.min === undefined || descriptor.min >= 1 ? 1 : 0.1}
          className="input flex-1"
        />
        {descriptor?.unit && (
          <span className="text-small font-medium text-ink-muted">{descriptor.unit}</span>
        )}
      </div>
    );
  }

  if (type === 'string') {
    const v = typeof value === 'string' ? value : '';
    return (
      <input type="text" value={v} onChange={(e) => onChange(e.target.value)} className="input" />
    );
  }

  // JSON / object
  return <JsonEditor value={value} onChange={onChange} />;
}

function JsonEditor({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          try {
            const parsed = JSON.parse(e.target.value);
            setJsonError(null);
            onChange(parsed);
          } catch (err) {
            setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
          }
        }}
        rows={6}
        spellCheck={false}
        className="input font-mono text-small"
      />
      {jsonError && <p className="mt-1 text-caption text-danger">{jsonError}</p>}
    </div>
  );
}

function guessType(value: unknown): 'number' | 'boolean' | 'string' | 'json' {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'string';
  return 'json';
}
