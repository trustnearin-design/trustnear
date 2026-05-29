'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { clientFetch } from '@/lib/api-client';
import { SkeletonBar } from '@/components/Skeletons';
import { EmptyState } from '@/components/EmptyState';

type Faq = {
  id: string;
  slug: string;
  category: string;
  question: string;
  body: string;
  sortOrder: number;
  isPublished: boolean;
  updatedAt: string;
};

export function FaqsClient() {
  const list = useQuery({
    queryKey: ['admin', 'cms', 'faqs'],
    queryFn: () => clientFetch<{ items: Faq[] }>('/api/admin/cms/faqs'),
    staleTime: 30_000,
  });
  const qc = useQueryClient();

  const togglePublish = useMutation({
    mutationFn: (args: { id: string; isPublished: boolean }) =>
      clientFetch(`/api/admin/cms/faqs/${args.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPublished: args.isPublished }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'cms', 'faqs'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
  });

  const del = useMutation({
    mutationFn: (id: string) => clientFetch(`/api/admin/cms/faqs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('FAQ deleted');
      qc.invalidateQueries({ queryKey: ['admin', 'cms', 'faqs'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
  });

  const grouped = useMemo(() => {
    const items = list.data?.items ?? [];
    const map = new Map<string, Faq[]>();
    for (const f of items) {
      if (!map.has(f.category)) map.set(f.category, []);
      map.get(f.category)!.push(f);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [list.data]);

  if (list.isPending) return <SkeletonBar className="h-64" />;
  if (list.isError) {
    return (
      <div className="card p-12 text-center">
        <p className="text-body text-danger">Failed to load FAQs.</p>
      </div>
    );
  }
  if (grouped.length === 0) {
    return (
      <div className="card">
        <EmptyState
          mascot="verified"
          title="Abhi koi FAQ nahi hai"
          subtitle="Customers + Pros ko help dene ke liye pehli FAQ add karo."
          action={
            <Link href="/cms/faqs/new" className="btn-primary text-small">
              + Add first FAQ
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(([category, items]) => (
        <section key={category}>
          <p className="mb-2 px-1 text-caption font-semibold uppercase tracking-wider text-ink-muted">
            {category} · {items.length}
          </p>
          <div className="card overflow-hidden">
            <ul className="divide-y divide-border">
              {items.map((f) => (
                <li key={f.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span
                    className={
                      'pill ' +
                      (f.isPublished
                        ? 'bg-success/15 text-success'
                        : 'bg-surface-muted text-ink-subtle')
                    }
                  >
                    {f.isPublished ? 'Published' : 'Draft'}
                  </span>
                  <Link
                    href={`/cms/faqs/${f.id}` as never}
                    prefetch
                    className="min-w-0 flex-1 truncate font-semibold text-ink hover:text-brand"
                  >
                    {f.question}
                  </Link>
                  <p className="hidden font-mono text-caption text-ink-subtle md:block">{f.slug}</p>
                  <button
                    onClick={() => togglePublish.mutate({ id: f.id, isPublished: !f.isPublished })}
                    title={f.isPublished ? 'Unpublish' : 'Publish'}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-card border border-border bg-surface text-ink-muted hover:bg-surface-muted"
                  >
                    {f.isPublished ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete FAQ "${f.question}"?`)) del.mutate(f.id);
                    }}
                    title="Delete"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-card border border-border bg-surface text-ink-muted hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </div>
  );
}
