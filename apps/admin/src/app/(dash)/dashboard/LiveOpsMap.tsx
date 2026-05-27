'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from '@react-google-maps/api';
import { MapPin, Users } from 'lucide-react';
import { clientFetch } from '@/lib/api-client';

type LiveOps = {
  pros: Array<{
    id: string;
    name: string;
    photo: string | null;
    availability: 'online' | 'busy' | 'offline';
    trustBadge: string;
    lat: number;
    lng: number;
  }>;
  bookings: Array<{
    id: string;
    bookingNumber: string;
    status: string;
    category: string;
    customerName: string;
    proName: string | null;
    lat: number;
    lng: number;
  }>;
};

// Jaipur centre — used until we have a national footprint
const DEFAULT_CENTER = { lat: 26.9124, lng: 75.7873 };

const MAP_STYLES = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
];

const containerStyle = { width: '100%', height: '420px', borderRadius: '0.875rem' };

export function LiveOpsMap() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey ?? '',
    id: 'admin-live-ops',
  });

  const query = useQuery({
    queryKey: ['admin', 'live-ops'],
    queryFn: () => clientFetch<LiveOps>('/api/admin/live-ops'),
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  const [selectedProId, setSelectedProId] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const data = query.data;
  const center = useMemo(() => {
    if (!data || (data.pros.length === 0 && data.bookings.length === 0)) return DEFAULT_CENTER;
    const points = [
      ...data.pros.map((p) => ({ lat: p.lat, lng: p.lng })),
      ...data.bookings.map((b) => ({ lat: b.lat, lng: b.lng })),
    ];
    const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), {
      lat: 0,
      lng: 0,
    });
    return { lat: sum.lat / points.length, lng: sum.lng / points.length };
  }, [data]);

  if (!apiKey) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-card bg-surface-muted text-small text-ink-subtle">
        <MapPin className="mr-2 h-4 w-4" />
        Set <code className="mx-1 font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in admin's
        .env.local to enable the map.
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-card bg-danger/5 text-small text-danger">
        Failed to load Google Maps script.
      </div>
    );
  }
  if (!isLoaded || query.isPending) {
    return <div className="h-[420px] animate-pulse rounded-card bg-surface-muted" />;
  }

  const selectedPro = selectedProId
    ? (data?.pros.find((p) => p.id === selectedProId) ?? null)
    : null;
  const selectedBooking = selectedBookingId
    ? (data?.bookings.find((b) => b.id === selectedBookingId) ?? null)
    : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-small text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-success" />
          {data?.pros.filter((p) => p.availability === 'online').length ?? 0} online experts
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-warning" />
          {data?.pros.filter((p) => p.availability === 'busy').length ?? 0} busy
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand" />
          {data?.bookings.length ?? 0} active bookings
        </span>
        <span className="ml-auto text-caption text-ink-subtle">
          Auto-refresh every 20s · last update{' '}
          {query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toLocaleTimeString('en-IN') : '—'}
        </span>
      </div>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        options={{
          styles: MAP_STYLES,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
          gestureHandling: 'cooperative',
        }}
      >
        {data?.pros.map((p) => (
          <Marker
            key={'pro-' + p.id}
            position={{ lat: p.lat, lng: p.lng }}
            onClick={() => {
              setSelectedProId(p.id);
              setSelectedBookingId(null);
            }}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: p.availability === 'online' ? '#16A34A' : '#EAB308',
              fillOpacity: 0.92,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            }}
            title={p.name}
          />
        ))}

        {data?.bookings.map((b) => (
          <Marker
            key={'book-' + b.id}
            position={{ lat: b.lat, lng: b.lng }}
            onClick={() => {
              setSelectedBookingId(b.id);
              setSelectedProId(null);
            }}
            icon={{
              path: 'M -2,-2 L 2,-2 L 2,2 L -2,2 z',
              scale: 4,
              fillColor: '#0B1F3A',
              fillOpacity: 0.95,
              strokeColor: '#D4A24C',
              strokeWeight: 2,
            }}
            title={b.bookingNumber}
          />
        ))}

        {selectedPro && (
          <InfoWindow
            position={{ lat: selectedPro.lat, lng: selectedPro.lng }}
            onCloseClick={() => setSelectedProId(null)}
          >
            <div className="min-w-[180px] space-y-1 p-1">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-brand" />
                <p className="font-semibold text-ink">{selectedPro.name}</p>
              </div>
              <p className="text-caption text-ink-muted capitalize">
                {selectedPro.availability} · {selectedPro.trustBadge}
              </p>
              <a
                href={`/experts/${selectedPro.id}`}
                className="text-caption font-semibold text-brand hover:underline"
              >
                Open profile →
              </a>
            </div>
          </InfoWindow>
        )}

        {selectedBooking && (
          <InfoWindow
            position={{ lat: selectedBooking.lat, lng: selectedBooking.lng }}
            onCloseClick={() => setSelectedBookingId(null)}
          >
            <div className="min-w-[180px] space-y-1 p-1">
              <p className="font-semibold text-ink">{selectedBooking.bookingNumber}</p>
              <p className="text-caption text-ink-muted">{selectedBooking.category}</p>
              <p className="text-caption text-ink-muted">
                {selectedBooking.customerName}
                {selectedBooking.proName && ' → ' + selectedBooking.proName}
              </p>
              <p className="text-caption font-semibold text-brand capitalize">
                {selectedBooking.status.replaceAll('_', ' ')}
              </p>
              <a
                href={`/bookings/${selectedBooking.id}`}
                className="text-caption font-semibold text-brand hover:underline"
              >
                Open booking →
              </a>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
