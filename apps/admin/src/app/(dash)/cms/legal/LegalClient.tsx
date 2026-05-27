'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, FileText } from 'lucide-react';
import { clientFetch } from '@/lib/api-client';
import { formatRelativeDate } from '@/lib/format';
import { SkeletonBar } from '@/components/Skeletons';

type LegalRow = {
  id: string;
  slug: string;
  title: string;
  body: string;
  version: number;
  effectiveAt: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export function LegalClient() {
  const list = useQuery({
    queryKey: ['admin', 'cms', 'legal'],
    queryFn: () => clientFetch<{ items: LegalRow[] }>('/api/admin/cms/legal-pages'),
    staleTime: 30_000,
  });
  const qc = useQueryClient();

  const publish = useMutation({
    mutationFn: (args: { id: string; isPublished: boolean }) =>
      clientFetch(`/api/admin/cms/legal-pages/${args.id}/publish`, {
        method: 'PATCH',
        body: JSON.stringify({ isPublished: args.isPublished }),
      }),
    onSuccess: (_, vars) => {
      toast.success(vars.isPublished ? 'Published' : 'Unpublished');
      qc.invalidateQueries({ queryKey: ['admin', 'cms', 'legal'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Publish failed'),
  });

  if (list.isPending) return <SkeletonBar className="h-64" />;
  if (list.isError) {
    return (
      <div className="card p-12 text-center">
        <p className="text-body text-danger">Failed to load legal pages.</p>
      </div>
    );
  }

  const items = list.data?.items ?? [];
  const grouped = new Map<string, LegalRow[]>();
  for (const r of items) {
    if (!grouped.has(r.slug)) grouped.set(r.slug, []);
    grouped.get(r.slug)!.push(r);
  }

  if (grouped.size === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-body text-ink-subtle">
          No legal pages yet. Create your first Terms / Privacy / Refund page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([slug, versions]) => (
        <section key={slug}>
          <div className="mb-2 flex items-center gap-2 px-1">
            <FileText className="h-4 w-4 text-brand" />
            <p className="font-semibold text-ink">{slug}</p>
            <span className="text-caption text-ink-muted">
              {versions.length} version{versions.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="card overflow-hidden">
            <ul className="divide-y divide-border">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="rounded-card bg-surface-muted px-2 py-0.5 font-mono text-caption font-semibold text-ink">
                    v{v.version}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{v.title}</p>
                    <p className="truncate text-caption text-ink-subtle">
                      Effective {new Date(v.effectiveAt).toLocaleDateString('en-IN')} · Created{' '}
                      {formatRelativeDate(v.createdAt)}
                    </p>
                  </div>
                  {v.isPublished ? (
                    <span className="inline-flex items-center gap-1 rounded-pill bg-success/15 px-2.5 py-1 text-caption font-semibold text-success">
                      <CheckCircle2 className="h-3 w-3" />
                      Live
                    </span>
                  ) : (
                    <button
                      onClick={() => publish.mutate({ id: v.id, isPublished: true })}
                      className="rounded-card border border-border bg-surface px-2.5 py-1 text-small font-medium text-ink hover:bg-surface-muted"
                    >
                      Publish
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </div>
  );
}
