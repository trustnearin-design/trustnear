import { useState } from 'react';
import { View, Text, Image, Pressable, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WizardLayout } from '../../src/components/wizard/WizardLayout';
import {
  useOnboardingStatus,
  useUploadAadhaarDoc,
  type AadhaarSlot,
} from '../../src/api/onboarding';
import { colors } from '../../src/theme/colors';

/**
 * Step 6 — Aadhaar verification, Phase-1 MANUAL flow. The pro uploads three
 * photos (Aadhaar front, Aadhaar back, a selfie); the admin visually matches
 * them at approval time. (Setu DigiLocker auto-verify is deferred to Phase-2
 * and its hooks in src/api/kyc.ts stay in place but unused here.)
 */

const SLOTS: { key: AadhaarSlot; label: string; hint: string; selfie?: boolean }[] = [
  { key: 'front', label: 'Aadhaar — Front', hint: 'Photo/QR side, all 4 corners visible' },
  { key: 'back', label: 'Aadhaar — Back', hint: 'Address side, clear & readable' },
  { key: 'selfie', label: 'Your selfie', hint: 'Front camera, plain background', selfie: true },
];

export default function AadhaarWizardScreen() {
  const router = useRouter();
  const status = useOnboardingStatus();
  const upload = useUploadAadhaarDoc();

  // Per-slot local preview + uploaded flag for this session.
  const [uris, setUris] = useState<Record<AadhaarSlot, string | null>>({
    front: null,
    back: null,
    selfie: null,
  });
  const [done, setDone] = useState<Record<AadhaarSlot, boolean>>({
    front: false,
    back: false,
    selfie: false,
  });
  // Per-slot soft Rekognition hint: false = didn't look like Aadhaar/a face.
  const [warn, setWarn] = useState<Record<AadhaarSlot, boolean>>({
    front: false,
    back: false,
    selfie: false,
  });
  const [busySlot, setBusySlot] = useState<AadhaarSlot | null>(null);

  // Server already has all three (e.g. returning pro) → treat step as complete.
  const serverDone = status.data?.steps.aadhaar.done ?? false;
  const allUploaded = serverDone || (done.front && done.back && done.selfie);

  const capture = async (slot: AadhaarSlot, source: 'camera' | 'library', selfie?: boolean) => {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission denied', `Need ${source} permission to continue.`);
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: !selfie,
    };
    if (selfie) {
      opts.cameraType = ImagePicker.CameraType.front;
      opts.aspect = [1, 1];
    }
    const res =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    setUris((u) => ({ ...u, [slot]: asset.uri }));
    setDone((d) => ({ ...d, [slot]: false }));
    setBusySlot(slot);

    upload.mutate(
      { uri: asset.uri, slot, mime: asset.mimeType ?? 'image/jpeg' },
      {
        onSuccess: (res) => {
          setDone((d) => ({ ...d, [slot]: true }));
          // autoOk === false → image didn't look like an Aadhaar / a face.
          // Soft warning only — upload still succeeded, pro can re-take.
          setWarn((w) => ({ ...w, [slot]: res.autoOk === false }));
          setBusySlot(null);
          if (res.autoOk === false) {
            const what = slot === 'selfie' ? 'chehra' : 'Aadhaar card';
            Alert.alert(
              'Photo check',
              `Is photo mein ${what} saaf nazar nahi aaya. Behtar hai sahi photo dobara lein — warna admin verification mein reject ho sakta hai.`,
              [{ text: 'Theek hai' }],
            );
          }
        },
        onError: (e: Error) => {
          setBusySlot(null);
          Alert.alert('Upload failed', e.message);
        },
      },
    );
  };

  const onContinue = () => {
    if (!allUploaded) {
      Alert.alert('Aadhaar incomplete', 'Please upload front, back and a selfie to continue.');
      return;
    }
    router.push('/(onboarding)/review');
  };

  return (
    <WizardLayout
      stepIndex={6}
      stepTotal={8}
      title="Aadhaar verification"
      subtitle="Apne Aadhaar ki front, back aur ek selfie upload karein. Hamari team manually verify karegi — approve hote hi aap bookings le sakte hain."
      mascotVariant="kyc"
      ctaLabel={allUploaded ? 'Continue' : 'Upload all 3 to continue'}
      onCta={onContinue}
      ctaDisabled={!allUploaded}
      ctaLoading={busySlot !== null}
    >
      {SLOTS.map((s) => {
        const uri = uris[s.key];
        const isDone = serverDone || done[s.key];
        const isBusy = busySlot === s.key;
        const isWarn = warn[s.key];
        return (
          <View
            key={s.key}
            style={{
              marginBottom: 14,
              padding: 14,
              backgroundColor: colors.surface.DEFAULT,
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: isWarn ? colors.danger : isDone ? colors.success : colors.border.DEFAULT,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {/* Thumbnail */}
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  overflow: 'hidden',
                  backgroundColor: colors.surface.muted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {uri ? (
                  <Image
                    source={{ uri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons
                    name={s.selfie ? 'person' : 'card'}
                    size={26}
                    color={colors.ink.subtle}
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink.DEFAULT }}>
                    {s.label}
                  </Text>
                  {isWarn ? (
                    <Ionicons name="warning" size={16} color={colors.danger} />
                  ) : isDone ? (
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  ) : null}
                </View>
                <Text
                  style={{
                    marginTop: 2,
                    fontSize: 11.5,
                    color: isWarn ? colors.danger : colors.ink.muted,
                    lineHeight: 16,
                    fontWeight: isWarn ? '700' : '400',
                  }}
                >
                  {isBusy
                    ? 'Uploading…'
                    : isWarn
                      ? s.selfie
                        ? 'Chehra saaf nahi — dobara lein'
                        : 'Aadhaar saaf nahi — dobara lein'
                      : isDone
                        ? 'Uploaded'
                        : s.hint}
                </Text>
              </View>
            </View>

            {/* Capture buttons */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <CaptureBtn
                icon="camera"
                label={s.selfie ? 'Selfie' : 'Camera'}
                onPress={() => void capture(s.key, 'camera', s.selfie)}
              />
              <CaptureBtn
                icon="image"
                label="Gallery"
                onPress={() => void capture(s.key, 'library', s.selfie)}
              />
            </View>
          </View>
        );
      })}

      <View
        style={{
          marginTop: 6,
          padding: 14,
          backgroundColor: colors.brand[50],
          borderRadius: 12,
          flexDirection: 'row',
          gap: 8,
        }}
      >
        <Ionicons name="lock-closed" size={18} color={colors.brand[700]} />
        <Text style={{ flex: 1, fontSize: 12, color: colors.brand[800], lineHeight: 18 }}>
          Aapke documents sirf verification ke liye hain — secure rakhe jaate hain, customers ko
          kabhi nahi dikhte. PAN aur bank baad mein bhi add kar sakte hain.
        </Text>
      </View>
    </WizardLayout>
  );
}

function CaptureBtn({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: colors.surface.muted,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.border.DEFAULT,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      <Ionicons name={icon} size={18} color={colors.brand[700]} />
      <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink.DEFAULT }}>{label}</Text>
    </Pressable>
  );
}
