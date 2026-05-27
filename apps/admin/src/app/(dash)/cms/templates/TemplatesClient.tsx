'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bell, ChevronDown, ChevronRight, Save } from 'lucide-react';
import { clientFetch } from '@/lib/api-client';
import { SkeletonBar } from '@/components/Skeletons';

type Template = {
  id: string;
  eventKey: string;
  channel: 'push' | 'email' | 'sms';
  title: string;
  body: string;
  variables: string[];
  description: string | null;
  isActive: boolean;
  updatedAt: string;
};

export function TemplatesClient() {
  const list = useQuery({
    queryKey: ['admin', 'cms', 'templates'],
    queryFn: () => clientFetch<{ items: Template[] }>('/api/admin/cms/templates'),
    staleTime: 30_000,
  });

  if (list.isPending) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBar key={i} className="h-24" />
        ))}
      </div>
    );
  }
  if (list.isError) {
    return (
      <div className="card p-12 text-center">
        <p className="text-body text-danger">Failed to load templates.</p>
      </div>
    );
  }

  const items = list.data?.items ?? [];
  if (items.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-body text-ink-subtle">
          No templates yet. The API seeds defaults on boot — restart it and refresh.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((t) => (
        <TemplateCard key={t.id} template={t} />
      ))}
    </div>
  );
}

function TemplateCard({ template }: { template: Template }) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(template.title);
  const [body, setBody] = useState(template.body);
  const [isActive, setIsActive] = useState(template.isActive);
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: () =>
      clientFetch<Template>(`/api/admin/cms/templates/${template.eventKey}`, {
        method: 'PUT',
        body: JSON.stringify({
          channel: template.channel,
          title,
          body,
          variables: template.variables,
          description: template.description,
          isActive,
        }),
      }),
    onSuccess: () => {
      toast.success(`'${template.eventKey}' saved`);
      qc.invalidateQueries({ queryKey: ['admin', 'cms', 'templates'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
  });

  const dirty =
    title !== template.title || body !== template.body || isActive !== template.isActive;

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-surface-muted"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-ink-subtle" />
        ) : (
          <ChevronRight className="h-4 w-4 text-ink-subtle" />
        )}
        <Bell className="h-4 w-4 text-brand" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate font-semibold text-ink">
            <code className="font-mono text-small text-brand">{template.eventKey}</code>
            <span
              className={`pill ${
                isActive ? 'bg-success/15 text-success' : 'bg-surface-muted text-ink-subtle'
              }`}
            >
              {isActive ? 'Live' : 'Paused'}
            </span>
            <span className="pill bg-brand-100 text-brand-700">{template.channel}</span>
          </p>
          {template.description && (
            <p className="mt-0.5 truncate text-caption text-ink-subtle">{template.description}</p>
          )}
        </div>
        <p className="hidden text-caption text-ink-subtle md:block">
          Updated {new Date(template.updatedAt).toLocaleDateString('en-IN')}
        </p>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-border bg-surface-muted/30 p-5">
          <div>
            <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ink-muted">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-caption font-semibold uppercase tracking-wider text-ink-muted">
              Body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="input w-full resize-y"
            />
          </div>
          {template.variables.length > 0 && (
            <div>
              <p className="mb-1 text-caption font-semibold uppercase tracking-wider text-ink-muted">
                Available variables
              </p>
              <div className="flex flex-wrap gap-1.5">
                {template.variables.map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      setBody((curr) => curr + `{{${v}}}`);
                    }}
                    className="rounded-card border border-border bg-surface px-2 py-1 font-mono text-caption text-brand hover:bg-brand-100"
                    type="button"
                    title="Click to insert into body"
                  >
                    {'{{' + v + '}}'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-small text-ink">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 accent-brand"
              />
              Active (uncheck to fall back to hardcoded copy)
            </label>
            <button
              onClick={() => save.mutate()}
              disabled={!dirty || save.isPending}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {save.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
