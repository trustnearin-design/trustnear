import { Mascot, type MascotVariant } from './Mascot';

/**
 * Empty-state block — used inside a card or section when a list
 * returns zero items. Mascot + warm copy + optional CTA so empty
 * surfaces feel intentional rather than broken.
 *
 *   <EmptyState
 *     mascot="toolbox"
 *     title="Abhi koi banner nahi hai"
 *     subtitle="Customer home par dikhane ke liye pehla banner upload karein."
 *     action={<Link className="btn-primary text-small" href="/banners/new">Add banner</Link>}
 *   />
 */
export function EmptyState({
  mascot = 'toolbox',
  title,
  subtitle,
  action,
}: {
  mascot?: MascotVariant;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <Mascot variant={mascot} size={120} />
      <h3 className="mt-2 font-display text-h3 font-bold text-ink">{title}</h3>
      {subtitle && <p className="max-w-sm text-small text-ink-muted">{subtitle}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
