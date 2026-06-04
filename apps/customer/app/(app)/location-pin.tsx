import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useUpdateProfile } from '../../src/api/profile';
import { getCurrentCoords, reverseGeocode, FALLBACK_COORDS } from '../../src/lib/location';
import { CoralButton } from '../../src/components/ui';
import { colors } from '../../src/theme/colors';

/**
 * "Move pin to your exact location" — a fixed centre pin floats over a map
 * that pans underneath (Swiggy/Snabbit pattern). On settle we reverse-geocode
 * the centre to show the address; Confirm saves city/area/lat/lng.
 *
 * Reached from the location step's "Use current location" (centred on GPS) or
 * directly to fine-tune. Params: optional lat/lng to seed the centre.
 */
export default function LocationPinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ lat?: string; lng?: string }>();
  const update = useUpdateProfile();

  const [region, setRegion] = useState<Region | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [addressLabel, setAddressLabel] = useState<string>('');
  const [resolving, setResolving] = useState(false);
  const resolved = useRef<{ city: string | null; area: string | null }>({ city: null, area: null });

  // Seed the initial region: params → GPS → Jaipur fallback.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let lat = params.lat ? Number(params.lat) : NaN;
      let lng = params.lng ? Number(params.lng) : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        const coords = await getCurrentCoords();
        lat = coords?.lat ?? FALLBACK_COORDS.lat;
        lng = coords?.lng ?? FALLBACK_COORDS.lng;
      }
      if (cancelled) return;
      setRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 });
      setCenter({ lat, lng });
      void resolve(lat, lng);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolve = async (lat: number, lng: number) => {
    setResolving(true);
    const addr = await reverseGeocode({ lat, lng });
    resolved.current = { city: addr?.city ?? null, area: addr?.area ?? null };
    setAddressLabel(addr?.formatted ?? 'Pin set — confirm to continue');
    setResolving(false);
  };

  const onRegionChangeComplete = (r: Region) => {
    setCenter({ lat: r.latitude, lng: r.longitude });
    void resolve(r.latitude, r.longitude);
  };

  const onConfirm = async () => {
    if (!center) return;
    try {
      await update.mutateAsync({
        latitude: center.lat,
        longitude: center.lng,
        ...(resolved.current.city ? { city: resolved.current.city } : {}),
        ...(resolved.current.area ? { area: resolved.current.area } : {}),
      });
      router.replace('/(app)');
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.muted }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      {region ? (
        <MapView
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={{ flex: 1 }}
          initialRegion={region}
          onRegionChangeComplete={onRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
          toolbarEnabled={false}
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.brand.DEFAULT} />
        </View>
      )}

      {/* Back button */}
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0 }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{
            margin: 16,
            height: 40,
            width: 40,
            borderRadius: 20,
            backgroundColor: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.ink.DEFAULT} />
        </Pressable>
      </SafeAreaView>

      {/* Fixed centre pin — sits slightly above true centre so the point
          touches the map centre while the head floats above. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ alignItems: 'center', transform: [{ translateY: -18 }] }}>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: colors.accent.DEFAULT,
                marginBottom: 6,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                Move pin to your exact location
              </Text>
            </View>
            <Ionicons name="location" size={40} color={colors.accent.DEFAULT} />
          </View>
        </View>
      </View>

      {/* Confirm card */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.surface.DEFAULT,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingHorizontal: 20,
          paddingTop: 18,
          paddingBottom: Math.max(insets.bottom, 16),
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
          elevation: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="location" size={20} color={colors.brand[700]} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.ink.DEFAULT }}>
              Confirm location
            </Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: colors.ink.muted }} numberOfLines={1}>
              {resolving ? 'Locating…' : addressLabel}
            </Text>
          </View>
        </View>
        <View style={{ marginTop: 14 }}>
          <CoralButton
            label="Confirm location"
            onPress={() => void onConfirm()}
            loading={update.isPending}
            icon="checkmark"
          />
        </View>
      </View>
    </View>
  );
}
