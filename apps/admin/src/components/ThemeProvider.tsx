'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';
type Effective = 'light' | 'dark';

interface ThemeCtx {
  theme: Theme;
  effective: Effective;
  setTheme: (t: Theme) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

const STORAGE_KEY = 'trustnear-admin-theme';

function readStored(): Theme {
  if (typeof window === 'undefined') return 'system';
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}

function systemPref(): Effective {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyClass(effective: Effective) {
  if (typeof document === 'undefined') return;
  const cl = document.documentElement.classList;
  if (effective === 'dark') cl.add('dark');
  else cl.remove('dark');
  // Hint the UA so native form controls + scrollbars match
  document.documentElement.style.colorScheme = effective;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [effective, setEffective] = useState<Effective>('light');

  // Boot — read storage + apply
  useEffect(() => {
    const stored = readStored();
    const eff = stored === 'system' ? systemPref() : stored;
    setThemeState(stored);
    setEffective(eff);
    applyClass(eff);
  }, []);

  // Watch system pref while in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const eff: Effective = mq.matches ? 'dark' : 'light';
      setEffective(eff);
      applyClass(eff);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    window.localStorage.setItem(STORAGE_KEY, t);
    const eff = t === 'system' ? systemPref() : t;
    setEffective(eff);
    applyClass(eff);
  }, []);

  return <Ctx.Provider value={{ theme, effective, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme must be used within <ThemeProvider>');
  return v;
}

/**
 * Inline script that runs BEFORE React hydration to prevent a light-mode
 * flash if the saved theme is dark. Inject this into <head> via the root
 * layout. Idempotent + tiny.
 */
export const ThemePrelude = `
(function(){try{
  var t=localStorage.getItem('${STORAGE_KEY}');
  var d=(t==='dark')||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  if(d){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}
}catch(e){}})();
`;
