'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';

/**
 * 3-way toggle: Light · Dark · System. Sits in the sidebar user strip.
 * Active mode is highlighted; others are click-to-switch.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const items: Array<{ value: 'light' | 'dark' | 'system'; Icon: typeof Sun; label: string }> = [
    { value: 'light', Icon: Sun, label: 'Light' },
    { value: 'dark', Icon: Moon, label: 'Dark' },
    { value: 'system', Icon: Monitor, label: 'System' },
  ];

  return (
    <div className="inline-flex items-center gap-0.5 rounded-pill bg-brand-700/60 p-0.5">
      {items.map((it) => {
        const active = theme === it.value;
        return (
          <button
            key={it.value}
            onClick={() => setTheme(it.value)}
            title={it.label}
            aria-label={it.label + ' theme'}
            aria-pressed={active}
            className={
              'inline-flex h-6 w-6 items-center justify-center rounded-pill transition ' +
              (active
                ? 'bg-accent text-brand-900 shadow-[0_1px_4px_rgba(212,162,76,0.4)]'
                : 'text-brand-200 hover:text-ink-inverse')
            }
          >
            <it.Icon className="h-3 w-3" strokeWidth={2.5} />
          </button>
        );
      })}
    </div>
  );
}
