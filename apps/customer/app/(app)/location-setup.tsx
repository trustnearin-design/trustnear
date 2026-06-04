import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useMe, useUpdateProfile } from '../../src/api/profile';
import { getCurrentCoords } from '../../src/lib/location';
import { CoralButton, MascotImage } from '../../src/components/ui';
import { colors } from '../../src/theme/colors';

/**
 * Post-login location step. New users land here after OTP; returning users
 * (who already have a saved city) are bounced straight to the app. Two paths:
 * one-tap GPS (reverse-geocoded → city/area/lat/lng) or manual entry.
 */
export default function LocationSetupScreen() {
  const router = useRouter();
  const me = useMe();
  const update = useUpdateProfile();
  const [mode, setMode] = useState<'choose' | 'manual'>('choose');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [locating, setLocating] = useState(false);

  // Returning users already have a location — skip this screen entirely.
  useEffect(() => {
    if (me.data?.city) router.replace('/(app)');
  }, [me.data?.city, router]);

  const goHome = () => router.replace('/(app)');

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const coords = await getCurrentCoords();
      if (!coords) {
        Alert.alert(
          'Location off',
          'Location permission nahi mili. Aap manually enter kar sakte hain.',
        );
        setMode('manual');
        return;
      }
      // Open the map centred on the GPS fix so the user can fine-tune the pin.
      router.push({
        pathname: '/(app)/location-pin',
        params: { lat: String(coords.lat), lng: String(coords.lng) },
      });
    } catch {
      Alert.alert('Could not detect location', 'Please try manual entry.');
      setMode('manual');
    } finally {
      setLocating(false);
    }
  };

  const saveManual = async () => {
    if (city.trim().length < 2) {
      Alert.alert('Add your city', 'Kam se kam city zaroor daalein.');
      return;
    }
    try {
      await update.mutateAsync({
        city: city.trim(),
        ...(area.trim().length >= 2 ? { area: area.trim() } : {}),
      });
      goHome();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.muted }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 8 }}>
          {/* Skip */}
          <View style={{ alignItems: 'flex-end' }}>
            <Pressable onPress={goHome} hitSlop={12} style={{ padding: 8 }}>
              <Text style={{ color: colors.ink.subtle, fontSize: 13, fontWeight: '700' }}>
                Skip
              </Text>
            </Pressable>
          </View>

          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <MascotImage variant="searcher" tone="plum" size={150} />
            </View>
            <Text
              className="font-display"
              style={{
                fontSize: 26,
                fontWeight: '800',
                color: colors.ink.DEFAULT,
                letterSpacing: -0.4,
              }}
            >
              What&apos;s your location?
            </Text>
            <Text style={{ marginTop: 8, fontSize: 14, color: colors.ink.muted, lineHeight: 20 }}>
              Aapke aas-paas ke verified pros dikhane ke liye hume aapki location chahiye.
            </Text>

            {mode === 'manual' ? (
              <View style={{ marginTop: 24 }}>
                <Text style={labelStyle}>CITY</Text>
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="e.g. Jaipur"
                  placeholderTextColor={colors.ink.subtle}
                  autoCapitalize="words"
                  style={inputStyle}
                />
                <Text style={[labelStyle, { marginTop: 16 }]}>AREA / LOCALITY (optional)</Text>
                <TextInput
                  value={area}
                  onChangeText={setArea}
                  placeholder="e.g. Malviya Nagar"
                  placeholderTextColor={colors.ink.subtle}
                  autoCapitalize="words"
                  style={inputStyle}
                />
                <View style={{ marginTop: 22 }}>
                  <CoralButton
                    label="Save location"
                    onPress={() => void saveManual()}
                    loading={update.isPending}
                    icon="checkmark"
                  />
                </View>
                <Pressable
                  onPress={() => setMode('choose')}
                  style={{ marginTop: 14, alignItems: 'center' }}
                >
                  <Text style={{ color: colors.brand[700], fontSize: 13, fontWeight: '700' }}>
                    Use current location instead
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ marginTop: 28 }}>
                <Pressable
                  onPress={() => void useCurrentLocation()}
                  disabled={locating || update.isPending}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 16,
                    paddingVertical: 16,
                    backgroundColor: colors.brand[700],
                    opacity: locating || update.isPending ? 0.7 : 1,
                  }}
                >
                  {locating || update.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="locate" size={18} color="#fff" />
                      <Text
                        style={{ marginLeft: 8, fontSize: 16, fontWeight: '800', color: '#fff' }}
                      >
                        Use current location
                      </Text>
                    </>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setMode('manual')}
                  style={{ marginTop: 16, alignItems: 'center' }}
                >
                  <Text style={{ color: colors.brand[700], fontSize: 15, fontWeight: '800' }}>
                    Enter location manually
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const labelStyle = {
  fontSize: 12,
  fontWeight: '700' as const,
  color: colors.ink.muted,
  marginBottom: 8,
  letterSpacing: 0.4,
};
const inputStyle = {
  backgroundColor: colors.surface.DEFAULT,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border.DEFAULT,
  paddingHorizontal: 14,
  paddingVertical: 13,
  fontSize: 15,
  color: colors.ink.DEFAULT,
};
