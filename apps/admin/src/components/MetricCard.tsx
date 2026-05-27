export function MetricCard({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'accent' | 'success' | 'warning';
}) {
  const toneStyles: Record<string, string> = {
    default: 'border-border',
    accent: 'border-accent/50 bg-accent/5',
    success: 'border-success/30 bg-success/5',
    warning: 'border-warning/30 bg-warning/5',
  };
  return (
    <div className={`card p-5 ${toneStyles[tone]}`}>
      <p className="text-caption font-semibold uppercase tracking-wider text-ink-subtle">{label}</p>
      <p className="mt-2 text-display font-bold text-ink">{value}</p>
      {sub && <p className="mt-1 text-small text-ink-muted">{sub}</p>}
    </div>
  );
}
