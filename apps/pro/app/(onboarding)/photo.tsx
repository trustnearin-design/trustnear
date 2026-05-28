import { useState } from 'react';
import { View, Text, Image, Pressable, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WizardLayout } from '../../src/components/wizard/WizardLayout';
import { useUploadPhoto } from '../../src/api/onboarding';
import { colors } from '../../src/theme/colors';

/**
 * Step 2 — Profile photo. Uses expo-image-picker (camera + gallery) for
 * MVP; the full in-app oval-guide selfie capture is Sprint 4 polish.
 * Upload happens immediately on selection → photo URL persisted on
 * User.profilePhoto so the next step's progress includes it.
 */

export default function PhotoScreen() {
  const router = useRouter();
  const upload = useUploadPhoto();
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);

  const pickFrom = async (source: 'camera' | 'library') => {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission denied', `Need ${source} permission to continue.`);
      return;
    }
    const res =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            cameraType: ImagePicker.CameraType.front,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    setLocalUri(asset.uri);
    setServerUrl(null);

    upload.mutate(
      { uri: asset.uri, mime: asset.mimeType ?? 'image/jpeg' },
      {
        onSuccess: (data) => setServerUrl(data.url),
        onError: (e: Error) => Alert.alert('Upload failed', e.message),
      },
    );
  };

  const onContinue = () => {
    if (!serverUrl) {
      Alert.alert('Photo required', 'Please add a profile photo to continue.');
      return;
    }
    router.push('/(onboarding)/services' as never);
  };

  return (
    <WizardLayout
      stepIndex={2}
      stepTotal={8}
      title="Profile photo"
      subtitle="Aapka chehra dikhana zaroori hai — customers trust karte hain verified profiles ko."
      mascotVariant="photo"
      ctaLabel={!serverUrl ? 'Upload photo to continue' : 'Continue'}
      onCta={onContinue}
      ctaDisabled={!serverUrl}
      ctaLoading={upload.isPending}
    >
      {/* Preview circle */}
      <View style={{ alignItems: 'center', marginTop: 16 }}>
        <View
          style={{
            width: 200,
            height: 200,
            borderRadius: 100,
            borderWidth: 4,
            borderColor: serverUrl ? colors.success : colors.border.DEFAULT,
            backgroundColor: colors.surface.muted,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {localUri ? (
            <Image
              source={{ uri: localUri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="person" size={80} color={colors.ink.subtle} />
          )}
        </View>
        {serverUrl ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 }}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.success }}>Uploaded</Text>
          </View>
        ) : upload.isPending ? (
          <Text style={{ marginTop: 12, fontSize: 13, color: colors.ink.muted }}>Uploading…</Text>
        ) : null}
      </View>

      {/* Source buttons */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 28 }}>
        <SourceButton icon="camera" label="Take selfie" onPress={() => pickFrom('camera')} />
        <SourceButton icon="image" label="From gallery" onPress={() => pickFrom('library')} />
      </View>

      <View
        style={{
          marginTop: 24,
          padding: 14,
          backgroundColor: colors.brand[50],
          borderRadius: 12,
          flexDirection: 'row',
          gap: 8,
        }}
      >
        <Ionicons name="information-circle" size={18} color={colors.brand[700]} />
        <Text style={{ flex: 1, fontSize: 12, color: colors.brand[800], lineHeight: 18 }}>
          Tips: front camera, achi roshni, plain background, clear chehra. Customers ye photo
          dekhenge.
        </Text>
      </View>
    </WizardLayout>
  );
}

function SourceButton({
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
        backgroundColor: colors.surface.DEFAULT,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: colors.border.DEFAULT,
        paddingVertical: 18,
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Ionicons name={icon} size={24} color={colors.brand[700]} />
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink.DEFAULT }}>{label}</Text>
    </Pressable>
  );
}
