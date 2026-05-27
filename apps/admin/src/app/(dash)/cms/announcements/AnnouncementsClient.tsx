'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Send, Trash2 } from 'lucide-react';
import { clientFetch } from '@/lib/api-client';
import { formatCount, formatRelativeDate } from '@/lib/format';
import { SkeletonTable } from '@/components/Skeletons';

type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: 'all' | 'customers' | 'professionals';
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduledAt: string | null;
  sentAt: string | null;
  sentCount: number;
  failedCount: number;
  targetCount: number;
  deepLink: string | null;
  createdBy: string;
  createdAt: string;
};

export function AnnouncementsClient() {
  const list = useQuery({
    queryKey: ['admin', 'cms', 'announcements'],
    queryFn: () => clientFetch<{ items: Announcement[] }>('/api/admin/cms/announcements'),
    staleTime: 15_000,
    refetchInterval: 15_000,
  });

  const qc = useQueryClient();

  const send = useMutation({
    mutationFn: (id: string) =>
      clientFetch<Announcement>(`/api/admin/cms/announcements/${id}/send`, { method: 'POST' }),
    onSuccess: (res) => {
      toast.success(
        `Sent to ${res.sentCount}/${res.targetCount} ${
          res.failedCount > 0 ? `· ${res.failedCount} failed` : ''
        }`,
      );
      qc.invalidateQueries({ queryKey: ['admin', 'cms', 'announcements'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Send failed'),
  });

  const del = useMutation({
    mutationFn: (id: string) =>
      clientFetch(`/api/admin/cms/announcements/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['admin', 'cms', 'announcements'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
  });

  if (list.isPending) return <SkeletonTable rows={4} />;
  if (list.isError) {
    return (
      <div className="card p-12 text-center">
        <p className="text-body text-danger">Failed to load announcements.</p>
      </div>
    );
  }

  const items = list.data?.items ?? [];
  if (items.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-body text-ink-subtle">No announcements yet. Create the first one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((a) => (
        <div key={a.id} className="card p-5">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-h3 font-semibold text-ink">{a.title}</h3>
                <StatusPill status={a.status} />
                <AudiencePill audience={a.audience} />
              </div>
              <p className="mt-2 text-body text-ink-muted">{a.body}</p>
              {a.deepLink && (
                <p className="mt-1 text-caption text-ink-subtle">
                  Deep link: <code className="font-mono">{a.deepLink}</code>
                </p>
              )}
              <p className="mt-3 text-caption text-ink-subtle">
                Created {formatRelativeDate(a.createdAt)}
                {a.sentAt && ` · Sent ${formatRelativeDate(a.sentAt)}`}
                {a.scheduledAt &&
                  ` · Scheduled for ${new Date(a.scheduledAt).toLocaleString('en-IN')}`}
                {a.status === 'sent' &&
                  ` · ${formatCount(a.sentCount)}/${formatCount(a.targetCount)} delivered${
                    a.failedCount > 0 ? ` (${formatCount(a.failedCount)} failed)` : ''
                  }`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {(a.status === 'draft' || a.status === 'scheduled' || a.status === 'failed') && (
                <button
                  onClick={() => {
                    if (confirm(`Send "${a.title}" to all ${a.audience} now?`)) {
                      send.mutate(a.id);
                    }
                  }}
                  disabled={send.isPending}
                  className="inline-flex items-center gap-1.5 rounded-card bg-brand px-3 py-1.5 text-small font-semibold text-ink-inverse hover:bg-brand-700 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send now
                </button>
              )}
              {a.status !== 'sent' && a.status !== 'sending' && (
                <button
                  onClick={() => {
                    if (confirm('Delete this announcement?')) del.mutate(a.id);
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-card border border-border bg-surface text-danger hover:bg-danger/10"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: Announcement['status'] }) {
  const tone: Record<string, string> = {
    draft: 'bg-surface-muted text-ink-muted',
    scheduled: 'bg-warning/15 text-warning',
    sending: 'bg-brand-100 text-brand-700',
    sent: 'bg-success/15 text-success',
    failed: 'bg-danger/15 text-danger',
  };
  return <span className={`pill ${tone[status]}`}>{status}</span>;
}

function AudiencePill({ audience }: { audience: Announcement['audience'] }) {
  const tone: Record<string, string> = {
    all: 'bg-brand-100 text-brand-700',
    customers: 'bg-accent/15 text-accent-700',
    professionals: 'bg-success/15 text-success',
  };
  return <span className={`pill ${tone[audience]} capitalize`}>{audience}</span>;
}
