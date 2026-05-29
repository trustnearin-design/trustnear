import { Mascot, type MascotVariant } from './Mascot';

/**
 * Page header — title + subtitle + optional action slot. Optional
 * small mascot beside the title for sections that benefit from a
 * brand touch (e.g. SMS settings, Approvals). Default is plain text
 * so most pages stay clean and information-dense.
 */
export function PageHeader({
  title,
  subtitle,
  action,
  mascot,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  /** Optional Sevak pose rendered at 64px beside the title. */
  mascot?: MascotVariant;
}) {
  return (
    <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {mascot && (
          <div className="shrink-0">
            <Mascot variant={mascot} size={64} />
          </div>
        )}
        <div>
          <h1 className="font-display text-h1 font-bold text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-body text-ink-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}
