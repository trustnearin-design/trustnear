import { Mascot, type MascotVariant } from './Mascot';

/**
 * Plum gradient brand hero — used for high-visibility brand touchpoints:
 * login screen, dashboard greeting, occasional empty-state heroes.
 *
 * Visual contract mirrors the mobile `BrandHero` from
 * `apps/customer/src/components/ui` so admin feels like the same product.
 */
export function BrandHero({
  eyebrow,
  title,
  subtitle,
  mascot,
  mascotSize = 88,
  rightSlot,
  children,
}: {
  /** Small uppercase label above the title (e.g. "YOUR ADMIN") */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Optional Sevak pose to overlay in the hero */
  mascot?: MascotVariant;
  mascotSize?: number;
  /** Optional content on the right (e.g. action buttons, status) */
  rightSlot?: React.ReactNode;
  /** Optional child content rendered below the title block (e.g. metric strip) */
  children?: React.ReactNode;
}) {
  return (
    <div
      // The (dash) layout uses px-8 horizontal padding; -mx-8 + px-8 here
      // extends the hero to the page edges so the gradient feels like a
      // header strip rather than a card. -mt-8/-mt-16 mirrors the layout's
      // pt-16 (mobile) / pt-8 (desktop). pt-8 lines the title up with where
      // a PageHeader would normally start.
      className="relative -mx-8 -mt-16 mb-6 overflow-hidden px-8 pb-10 pt-12 lg:-mt-8 lg:pt-8"
      style={{
        backgroundImage: 'linear-gradient(135deg, #4F2A66 0%, #3D1F4E 55%, #22102F 100%)',
      }}
    >
      {/* Soft brand circles for depth — same as mobile */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-20 h-72 w-72 rounded-full bg-brand-700/40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 bottom-0 h-64 w-64 rounded-full bg-brand-600/30"
      />

      <div className="relative flex items-start gap-5">
        <div className="flex-1">
          {eyebrow && (
            <p className="text-caption font-bold uppercase tracking-[2px] text-support-300">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-1 font-display text-h1 font-bold leading-tight text-ink-inverse">
            {title}
          </h1>
          {subtitle && <p className="mt-2 max-w-2xl text-body text-brand-200">{subtitle}</p>}
          {children && <div className="mt-5">{children}</div>}
        </div>

        {mascot && (
          <div className="hidden shrink-0 self-end sm:block">
            <Mascot variant={mascot} size={mascotSize} priority />
          </div>
        )}
        {rightSlot && <div className="hidden shrink-0 sm:block">{rightSlot}</div>}
      </div>
    </div>
  );
}
