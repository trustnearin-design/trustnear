'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { ThemeProvider, useTheme } from './ThemeProvider';

function ThemedToaster() {
  const { effective } = useTheme();
  return <Toaster richColors position="top-right" closeButton theme={effective} />;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: { retry: 0 },
        },
      }),
  );

  return (
    <ThemeProvider>
      <QueryClientProvider client={client}>
        {children}
        <ThemedToaster />
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools buttonPosition="bottom-right" />
        )}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
