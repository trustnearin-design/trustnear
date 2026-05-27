import { useEffect, useRef } from 'react';
import { View, Text, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export interface JobMapProps {
  /** Customer's booking address — the destination the pro is heading to. */
  customer: { lat: number; lng: number };
  /** Pro's current GPS position (null until first reading). */
  pro: { lat: number; lng: number } | null;
  /** Optional fixed height in px (default 220). */
  height?: number;
}

/**
 * Pro-side map: same shape as the customer's BookingMap but the iconography
 * flips — the pro is the moving pin (navigation arrow), the customer's
 * address is the home pin.
 */
export function JobMap({ customer, pro, height = 220 }: JobMapProps) {
  const mapRef = useRef<MapView | null>(null);

  const initialRegion: Region = {
    latitude: pro?.lat ?? customer.lat,
    longitude: pro?.lng ?? customer.lng,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

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
          <PinCustomer />
        </Marker>
        {pro ? (
          <Marker
            coordinate={{ latitude: pro.lat, longitude: pro.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <PinMe />
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
}

function PinCustomer() {
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

function PinMe() {
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
      <Ionicons name="navigate" size={20} color="#fff" />
    </View>
  );
}

/**
 * ETA strip — pair below the map while en route. Same visual language as
 * the customer's banner so it feels like one product.
 */
export function JobEtaBanner({
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
          {etaText} to customer
        </Text>
        <Text style={{ color: '#cbd5e1', fontSize: 11, marginTop: 1 }}>
          {km} km away · {sourceLabel}
        </Text>
      </View>
    </View>
  );
}
