import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MascotImage } from '../../src/components/ui/MascotImage';
import { CoralButton } from '../../src/components/ui/CoralButton';
import {
  useOnboardingStatus,
  useSubmitForReview,
  type WizardStepKey,
} from '../../src/api/onboarding';
import { colors } from '../../src/theme/colors';

/**
 * Final wizard screen — Submit for Review. Shows the per-step status
 * grid, lets the pro jump back to any step to fix, and submits if all
 * required steps are done. Submit flips approval_status to
 * submitted_for_review → root guard moves to (pending).
 */

const STEP_META: Record<
  WizardStepKey,
  { label: string; route: string; icon: React.ComponentProps<typeof Ionicons>['name'] }
> = {
  personal: { label: 'Personal details', route: '/(onboarding)/personal', icon: 'person-outline' },
  photo: { label: 'Profile photo', route: '/(onboarding)/photo', icon: 'camera-outline' },
  services: {
    label: 'Services & pricing',
    route: '/(onboarding)/services',
    icon: 'briefcase-outline',
  },
  area: { label: 'Working area', route: '/(onboarding)/area', icon: 'location-outline' },
  schedule: { label: 'Schedule', route: '/(onboarding)/schedule', icon: 'calendar-outline' },
  aadhaar: {
    label: 'Aadhaar (photos)',
    route: '/(onboarding)/aadhaar',
    icon: 'shield-checkmark-outline',
  },
  pan: { label: 'PAN', route: '/(onboarding)/pan', icon: 'card-outline' },
  bank: { label: 'Bank account', route: '/(onboarding)/bank', icon: 'wallet-outline' },
  police: {
    label: 'Police verification (optional)',
    route: '/(onboarding)/bank',
    icon: 'document-outline',
  },
};

export default function ReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const onboarding = useOnboardingStatus();
  const submit = useSubmitForReview();

  const status = onboarding.data;
  const canSubmit = status?.canSubmit ?? false;
  const requiredRemaining = status?.progress.requiredRemaining ?? [];
  // Steps the admin flagged on rejection — highlight them so the pro knows
  // exactly what to re-do before resubmitting.
  const flagged = new Set(
    status?.approvalStatus === 'rejected' ? (status?.rejectionFields ?? []) : [],
  );

  const onSubmit = () => {
    if (!canSubmit) {
      Alert.alert('Cannot submit yet', `Please complete: ${requiredRemaining.join(', ')}`);
      return;
    }
    Alert.alert(
      'Submit for Review?',
      'Aapki details admin team ke paas review ke liye chali jayengi. Approval ke baad aap turant jobs accept kar paayenge (usually 24–48 hours).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'default',
          onPress: () => {
            submit.mutate(undefined, {
              onError: (e: Error) => Alert.alert('Submit failed', e.message),
              // On success, the root guard will redirect to /(pending) when
              // the next onboarding.status refetch sees submitted_for_review
            });
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.muted }}>
      {/* Header with back */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: colors.surface.DEFAULT,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.DEFAULT,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface.subtle,
          }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.ink.DEFAULT} />
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink.DEFAULT }}>
          Review & Submit
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 140,
        }}
      >
        {/* Mascot */}
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <MascotImage
            variant={canSubmit ? 'approved' : 'rejected'}
            size={140}
            tone={canSubmit ? 'butter' : 'plum'}
          />
        </View>

        <Text
          style={{
            fontSize: 22,
            fontWeight: '800',
            color: colors.ink.DEFAULT,
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          {canSubmit ? 'Almost there! 🎉' : 'Few steps remaining'}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: colors.ink.muted,
            textAlign: 'center',
            marginBottom: 28,
            lineHeight: 20,
          }}
        >
          {canSubmit
            ? 'Sab kuch ready hai. Submit karein aur 24-48 hours mein approval expect karein.'
            : `Complete karein: ${requiredRemaining.length} step bachi hain.`}
        </Text>

        {/* Progress card */}
        {status ? (
          <View
            style={{
              padding: 14,
              backgroundColor: colors.brand[700],
              borderRadius: 18,
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: 'rgba(255,255,255,0.7)',
                letterSpacing: 0.6,
              }}
            >
              REQUIRED PROGRESS
            </Text>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 4 }}>
              {status.progress.requiredDone} / {status.progress.requiredTotal}
            </Text>
            <View
              style={{
                height: 6,
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderRadius: 3,
                marginTop: 10,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${(status.progress.requiredDone / status.progress.requiredTotal) * 100}%`,
                  height: '100%',
                  backgroundColor: colors.support[500],
                }}
              />
            </View>
          </View>
        ) : null}

        {/* Step grid */}
        {(
          [
            'personal',
            'photo',
            'services',
            'area',
            'schedule',
            'aadhaar',
            'pan',
            'bank',
            // 'police' omitted — verification is manual/admin-side; there is no
            // wizard screen for it, so it must not render as a tappable row here.
          ] as WizardStepKey[]
        ).map((key) => {
          const meta = STEP_META[key];
          const step = status?.steps[key];
          const done = step?.done ?? false;
          const required = step?.required ?? false;
          const needsFix = flagged.has(key);
          return (
            <Pressable
              key={key}
              onPress={() => router.push(meta.route as never)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 14,
                paddingHorizontal: 14,
                backgroundColor: needsFix ? '#FDECEA' : colors.surface.DEFAULT,
                borderRadius: 14,
                borderWidth: needsFix ? 1.5 : 1,
                borderColor: needsFix
                  ? colors.danger
                  : done
                    ? colors.success
                    : colors.border.DEFAULT,
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: needsFix
                    ? colors.danger
                    : done
                      ? colors.success
                      : colors.brand[50],
                }}
              >
                <Ionicons
                  name={needsFix ? 'alert' : done ? 'checkmark' : meta.icon}
                  size={18}
                  color={needsFix || done ? '#fff' : colors.brand[700]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink.DEFAULT }}>
                  {meta.label}
                  {!required ? (
                    <Text style={{ fontSize: 11, color: colors.ink.subtle, fontWeight: '600' }}>
                      {' '}
                      · optional
                    </Text>
                  ) : null}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: needsFix ? colors.danger : done ? colors.success : colors.ink.subtle,
                    marginTop: 2,
                    fontWeight: '600',
                  }}
                >
                  {needsFix
                    ? 'Admin ne ye fix karne ko kaha — tap karein'
                    : done
                      ? 'Completed'
                      : required
                        ? 'Tap to complete'
                        : 'Tap to add (optional)'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.ink.subtle} />
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Floating submit CTA */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 16,
          paddingTop: 16,
          backgroundColor: colors.surface.DEFAULT,
          borderTopWidth: 1,
          borderTopColor: colors.border.DEFAULT,
        }}
      >
        <CoralButton
          label={
            canSubmit ? 'Submit for Review' : `Complete ${requiredRemaining.length} more steps`
          }
          onPress={onSubmit}
          disabled={!canSubmit}
          loading={submit.isPending}
          icon={canSubmit ? 'arrow-forward' : null}
        />
      </View>
    </View>
  );
}
