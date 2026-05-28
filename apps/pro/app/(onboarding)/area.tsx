import { useEffect, useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { WizardLayout } from '../../src/components/wizard/WizardLayout';
import { useSaveArea } from '../../src/api/onboarding';
import { colors } from '../../src/theme/colors';

/**
 * Step 4 — Working area. Pro sets their service center (pin on map) +
 * how far they're willing to travel (radius slider). The matcher uses
 * this to filter customers within range.
 */

// Jaipur centre as fallback if GPS denied
const JAIPUR: { lat: number; lng: number } = { lat: 26.9124, lng: 75.7873 };

const RADII = [3, 5, 10, 15, 25];

export default function AreaScreen() {
  const router = useRouter();
  const save = useSaveArea();
  const [region, setRegion] = useState<Region>({
    latitude: JAIPUR.lat,
    longitude: JAIPUR.lng,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  const [radius, setRadius] = useState(5);
  const [locating, setLocating] = useState(true);

  // Try GPS on mount — center map on current location if granted.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') {
          if (!cancelled) setLocating(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setRegion({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } catch {
        // ignore — fallback to Jaipur center
      } finally {
        if (!cancelled) setLocating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onContinue = () => {
    save.mutate(
      { lat: region.latitude, lng: region.longitude, radiusKm: radius },
      {
        onSuccess: () => router.push('/(onboarding)/schedule' as never),
        onError: (e: Error) => Alert.alert('Save failed', e.message),
      },
    );
  };

  return (
    <WizardLayout
      stepIndex={4}
      stepTotal={8}
      title="Working area"
      subtitle="Map pe apna base pin karein — kahaan se serve karenge + kitne km tak travel kar sakte hain."
      mascotVariant="area"
      ctaLabel="Continue"
      onCta={onContinue}
      ctaLoading={save.isPending}
      hideCornerMascot
    >
      {/* Map */}
      <View
        style={{
          height: 320,
          borderRadius: 18,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border.DEFAULT,
          backgroundColor: colors.surface.muted,
        }}
      >
        {locating ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.brand[700]} />
            <Text style={{ marginTop: 8, fontSize: 13, color: colors.ink.muted }}>
              Finding your location…
            </Text>
          </View>
        ) : (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={{ flex: 1 }}
            region={region}
            onRegionChangeComplete={(r) => setRegion(r)}
          >
            <Marker
              coordinate={{ latitude: region.latitude, longitude: region.longitude }}
              pinColor={colors.brand[700]}
            />
            <Circle
              center={{ latitude: region.latitude, longitude: region.longitude }}
              radius={radius * 1000}
              fillColor="rgba(141,93,178,0.18)"
              strokeColor={colors.brand[700]}
              strokeWidth={2}
            />
          </MapView>
        )}
      </View>

      {/* Coordinates display */}
      <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="location" size={16} color={colors.brand[700]} />
        <Text style={{ fontSize: 12, color: colors.ink.muted, fontWeight: '600' }}>
          {region.latitude.toFixed(5)}, {region.longitude.toFixed(5)}
        </Text>
      </View>

      {/* Radius picker */}
      <View style={{ marginTop: 24 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '700',
            color: colors.ink.DEFAULT,
            marginBottom: 10,
          }}
        >
          Service radius
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {RADII.map((r) => {
            const selected = r === radius;
            return (
              <Pressable
                key={r}
                onPress={() => setRadius(r)}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: selected ? colors.brand[700] : colors.border.DEFAULT,
                  backgroundColor: selected ? colors.brand[700] : colors.surface.DEFAULT,
                  minWidth: 64,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '800',
                    color: selected ? '#fff' : colors.ink.DEFAULT,
                  }}
                >
                  {r}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: selected ? 'rgba(255,255,255,0.8)' : colors.ink.subtle,
                    marginTop: 2,
                  }}
                >
                  KM
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ marginTop: 10, fontSize: 12, color: colors.ink.subtle }}>
          Customers within {radius} km will see you when booking.
        </Text>
      </View>
    </WizardLayout>
  );
}
