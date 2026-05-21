import { useEffect, useRef } from 'react';
import { View, Text, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export interface BookingMapProps {
  /** Customer's booking address (destination). */
  customer: { lat: number; lng: number };
  /** Latest pro position (null until first event). */
  pro: { lat: number; lng: number } | null;
  /** Optional fixed height in px (default 240). */
  height?: number;
}

/**
 * Lightweight map view used in the active-booking screen. Shows the
 * customer's address as a fixed pin and the assigned pro as an animated
 * pin that updates whenever a new `pro:location` event arrives.
 *
 * Uses Google Maps on Android (requires a key in app.json). On iOS it
 * falls back to Apple Maps since we don't need iOS-specific styling.
 */
export function BookingMap({ customer, pro, height = 240 }: BookingMapProps) {
  const mapRef = useRef<MapView | null>(null);

  const initialRegion: Region = {
    latitude: pro?.lat ?? customer.lat,
    longitude: pro?.lng ?? customer.lng,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  // Re-fit the map to include both markers whenever the pro position changes.
  useEffect(() => {
    if (!mapRef.current || !pro) return;
    mapRef.current.fitToCoordinates(
      [
        { latitude: customer.lat, longitude: customer.lng },
        { latitude: pro.lat, longitude: pro.lng },
      ],
      {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      },
    );
  }, [pro, customer.lat, customer.lng]);

  return (
    <View style={{ height, overflow: 'hidden' }}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsCompass={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <Marker
          coordinate={{ latitude: customer.lat, longitude: customer.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <PinHome />
        </Marker>
        {pro ? (
          <Marker
            coordinate={{ latitude: pro.lat, longitude: pro.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <PinPro />
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
}

function PinHome() {
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.brand.DEFAULT,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#fff',
      }}
    >
      <Ionicons name="home" size={16} color="#fff" />
    </View>
  );
}

function PinPro() {
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accent.DEFAULT,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#fff',
      }}
    >
      <Ionicons name="bicycle" size={20} color="#fff" />
    </View>
  );
}

/**
 * Compact ETA strip — pair with the map. Reads provider so we can label
 * the source (haversine = straight-line estimate, google = real route).
 */
export function EtaBanner({
  etaText,
  distanceMeters,
  provider,
}: {
  etaText: string;
  distanceMeters: number;
  provider: 'haversine' | 'google';
}) {
  const km = (distanceMeters / 1000).toFixed(1);
  const sourceLabel = provider === 'google' ? 'Live route' : 'Estimate';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.brand[900],
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.accent.DEFAULT,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="navigate" size={18} color="#fff" />
      </View>
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
          Arriving in {etaText}
        </Text>
        <Text style={{ color: '#cbd5e1', fontSize: 11, marginTop: 1 }}>
          {km} km away · {sourceLabel}
        </Text>
      </View>
    </View>
  );
}
