import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { CoralButton } from '../../../src/components/ui/CoralButton';
import { EditHeader, EditFooter } from '../../../src/components/edit/EditChrome';
import { useMyProfile } from '../../../src/api/me';
import { useSaveArea } from '../../../src/api/onboarding';
import { colors } from '../../../src/theme/colors';

/**
 * Post-approval editor — Working area & radius. Prefilled from the pro's
 * current base pin (user.latitude/longitude) + serviceRadiusKm. Reuses the
 * same save endpoint as onboarding (PATCH /me/onboarding/area); an approved
 * pro stays live after saving (no re-review). Mirrors onboarding/area.tsx
 * but in the post-approval edit chrome.
 */

const JAIPUR = { lat: 26.9124, lng: 75.7873 };
const RADII = [3, 5, 10, 15, 25];

export default function EditLocationScreen() {
  const router = useRouter();
  const profile = useMyProfile();
  const save = useSaveArea();

  const initial = useMemo(() => {
    const lat = profile.data?.user.latitude ? Number(profile.data.user.latitude) : JAIPUR.lat;
    const lng = profile.data?.user.longitude ? Number(profile.data.user.longitude) : JAIPUR.lng;
    return { lat, lng, radius: profile.data?.serviceRadiusKm ?? 5 };
  }, [profile.data]);

  const [region, setRegion] = useState<Region | null>(null);
  const [radius, setRadius] = useState<number | null>(null);
  const [locating, setLocating] = useState(true);

  // Seed the map from the saved profile once it loads. We don't auto-fetch
  // GPS here (unlike onboarding) — the pro already set a base; show it. A
  // "Use current location" button lets them re-center on demand.
  useEffect(() => {
    if (profile.data && region === null) {
      setRegion({
        latitude: initial.lat,
        longitude: initial.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      setRadius(initial.radius);
      setLocating(false);
    }
  }, [profile.data, region, initial]);

  const useCurrentLocation = async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Location access chahiye current jagah set karne ke liye.',
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setRegion({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    } catch {
      Alert.alert('Could not locate', 'GPS se location nahi mili. Map ko manually move karein.');
    }
  };

  const onSave = () => {
    if (!region || radius === null) return;
    save.mutate(
      { lat: region.latitude, lng: region.longitude, radiusKm: radius },
      {
        onSuccess: () => {
          void profile.refetch();
          router.back();
        },
        onError: (e: Error) => Alert.alert('Save failed', e.message),
      },
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.muted }}>
      <EditHeader title="Service area" onBack={() => router.back()} />

      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}>
        <Text style={{ fontSize: 13, color: colors.ink.muted, marginBottom: 16 }}>
          Map pe apna base pin karein + kitne km tak travel karenge. Jab chahein badal sakte hain.
        </Text>

        <View
          style={{
            height: 300,
            borderRadius: 18,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.border.DEFAULT,
            backgroundColor: colors.surface.muted,
          }}
        >
          {locating || !region || radius === null ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={colors.brand[700]} />
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

        <Pressable
          onPress={() => void useCurrentLocation()}
          style={{
            marginTop: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.brand[200],
            backgroundColor: colors.surface.DEFAULT,
          }}
        >
          <Ionicons name="locate" size={16} color={colors.brand[700]} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.brand[700] }}>
            Use my current location
          </Text>
        </Pressable>

        <View style={{ marginTop: 22 }}>
          <Text
            style={{ fontSize: 13, fontWeight: '700', color: colors.ink.DEFAULT, marginBottom: 10 }}
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
                    paddingVertical: 10,
                    paddingHorizontal: 18,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: selected ? colors.brand[700] : colors.border.DEFAULT,
                    backgroundColor: selected ? colors.brand[700] : colors.surface.DEFAULT,
                    minWidth: 58,
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
                    }}
                  >
                    KM
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <EditFooter>
        <CoralButton
          label="Save changes"
          onPress={onSave}
          disabled={!region || radius === null}
          loading={save.isPending}
        />
      </EditFooter>
    </View>
  );
}
