import { View, Text, Pressable, Alert, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { EditHeader } from '../../../src/components/edit/EditChrome';
import { KeyboardAwareScrollView } from '../../../src/components/ui/KeyboardAwareScrollView';
import {
  useMyProfile,
  useUploadPortfolioPhoto,
  useDeletePortfolioPhoto,
} from '../../../src/api/me';
import { colors } from '../../../src/theme/colors';

/**
 * Post-approval editor — "Recent work" gallery. Pros upload their own work
 * photos which replace the placeholder category imagery on the customer
 * expert screen. Each pick uploads immediately (no batch save); deletes are
 * confirmed. Capped at 12 server-side. No re-review.
 */

const PORTFOLIO_MAX = 12;
const TILE = 104;

export default function EditPortfolioScreen() {
  const router = useRouter();
  const profile = useMyProfile();
  const upload = useUploadPortfolioPhoto();
  const remove = useDeletePortfolioPhoto();

  const shots = profile.data?.portfolioUrls ?? [];
  const full = shots.length >= PORTFOLIO_MAX;

  const pickAndUpload = async () => {
    if (full) {
      Alert.alert('Limit reached', `Aap zyada se zyada ${PORTFOLIO_MAX} photos rakh sakte hain.`);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Gallery access chahiye photo upload karne ke liye.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.7,
    });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    upload.mutate(
      { uri: asset.uri, mime: asset.mimeType ?? 'image/jpeg' },
      { onError: (e: Error) => Alert.alert('Upload failed', e.message) },
    );
  };

  const confirmDelete = (url: string) => {
    Alert.alert('Remove photo?', 'Yeh photo aapke profile se hata di jayegi.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          remove.mutate(url, {
            onError: (e: Error) => Alert.alert('Could not remove', e.message),
          }),
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.muted }}>
      <EditHeader title="Recent work" onBack={() => router.back()} />

      <KeyboardAwareScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 }}
      >
        <Text style={{ fontSize: 13, color: colors.ink.muted, lineHeight: 19 }}>
          Apne kaam ki real photos add karein — saaf-suthri before/after, finished work, ya setup.
          Customers asli kaam dekhkar 2× zyada book karte hain.
        </Text>

        {profile.isPending ? (
          <View style={{ marginTop: 32, alignItems: 'center' }}>
            <ActivityIndicator color={colors.brand.DEFAULT} />
          </View>
        ) : (
          <View
            style={{
              marginTop: 18,
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            {shots.map((uri) => (
              <View key={uri} style={{ width: TILE, height: TILE * 1.25 }}>
                <Image
                  source={{ uri }}
                  style={{
                    width: TILE,
                    height: TILE * 1.25,
                    borderRadius: 14,
                    backgroundColor: colors.surface.DEFAULT,
                  }}
                  resizeMode="cover"
                />
                <Pressable
                  onPress={() => confirmDelete(uri)}
                  hitSlop={8}
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    height: 26,
                    width: 26,
                    borderRadius: 13,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.55)',
                  }}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </Pressable>
              </View>
            ))}

            {!full ? (
              <Pressable
                onPress={pickAndUpload}
                disabled={upload.isPending}
                style={{
                  width: TILE,
                  height: TILE * 1.25,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                  borderColor: colors.border.DEFAULT,
                  backgroundColor: colors.surface.DEFAULT,
                }}
              >
                {upload.isPending ? (
                  <ActivityIndicator color={colors.brand.DEFAULT} />
                ) : (
                  <>
                    <Ionicons name="camera" size={24} color={colors.brand.DEFAULT} />
                    <Text
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        fontWeight: '700',
                        color: colors.brand[700],
                      }}
                    >
                      Add photo
                    </Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>
        )}

        <View
          style={{
            marginTop: 24,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 8,
            padding: 12,
            borderRadius: 12,
            backgroundColor: colors.brand[50],
          }}
        >
          <Ionicons name="information-circle" size={16} color={colors.brand[700]} />
          <Text style={{ flex: 1, fontSize: 12, color: colors.ink.muted }}>
            {shots.length}/{PORTFOLIO_MAX} photos. Sirf apne kaam ki photos daalein — galat ya
            misleading photos aapke account ko risk mein daal sakti hain.
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
