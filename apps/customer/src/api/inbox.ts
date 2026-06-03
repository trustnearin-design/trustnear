import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';

/**
 * In-app notification inbox. Every booking/payment/system event the backend
 * dispatches also writes a row here, so this is a reliable history even when
 * a push didn't arrive (e.g. permission off, FCM hiccup).
 */

export type InboxType =
  | 'booking_matched'
  | 'booking_confirmed'
  | 'booking_status'
  | 'payment_received'
  | 'payment_failed'
  | 'system';

export interface InboxItem {
  id: string;
  type: InboxType;
  title: string;
  body: string;
  data: { bookingId?: string; deepLink?: string } | null;
  isRead: boolean;
  createdAt: string;
}

interface InboxPage {
  notifications: InboxItem[];
  count: number;
}

// Single page (latest 50). Notification volume per user is low at this stage,
// so infinite scroll isn't worth the meta-cursor plumbing yet.
export function useNotifications() {
  return useQuery({
    queryKey: ['inbox'],
    queryFn: () => apiFetch<InboxPage>('/notifications?limit=50'),
    staleTime: 15_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['inbox.unread'],
    queryFn: () => apiFetch<{ count: number }>('/notifications/unread-count'),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ updated: number }>('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inbox'] });
      void qc.invalidateQueries({ queryKey: ['inbox.unread'] });
    },
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: true }>(`/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inbox.unread'] });
    },
  });
}
