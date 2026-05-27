import { apiFetch } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { ConfigEditor, type ConfigEntry } from './ConfigEditor';

export const dynamic = 'force-dynamic';

export default async function ConfigPage() {
  const { entries } = await apiFetch<{ entries: ConfigEntry[] }>('/api/v1/admin/config');

  // Group by descriptor.group (or "Advanced / Unknown" for orphan keys)
  const groups = new Map<string, ConfigEntry[]>();
  for (const e of entries) {
    const groupName = e.descriptor?.group ?? 'Advanced (unregistered)';
    const list = groups.get(groupName) ?? [];
    list.push(e);
    groups.set(groupName, list);
  }

  return (
    <>
      <PageHeader
        title="Config"
        subtitle="Business rules, feature flags and tunable knobs. Changes are live as soon as you save — no redeploy."
      />

      {entries.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-body text-ink-subtle">No config keys yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([groupName, list]) => (
            <section key={groupName} className="card overflow-hidden">
              <header className="border-b border-border bg-surface-muted px-6 py-3">
                <h2 className="text-h3 font-semibold text-ink">{groupName}</h2>
                <p className="text-caption text-ink-subtle">
                  {list.length} setting{list.length === 1 ? '' : 's'}
                </p>
              </header>
              <ul className="divide-y divide-border">
                {list.map((entry) => (
                  <li key={entry.key} className="p-6">
                    <ConfigEditor entry={entry} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
