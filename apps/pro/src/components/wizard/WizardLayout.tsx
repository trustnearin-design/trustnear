import { ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MascotImage } from '../ui/MascotImage';
import { CoralButton } from '../ui/CoralButton';
import { colors } from '../../theme/colors';

/**
 * Shared wizard chrome — every onboarding step screen wraps its content
 * in <WizardLayout> so the progress bar, mascot, back button, header,
 * and the bottom CTA all stay visually consistent.
 *
 * Layout:
 *   [back]  [progress bar  ●●●○○○○○]  [step N of M]
 *   [TITLE]
 *   [subtitle]
 *   [SCROLLABLE BODY ...children...]
 *   [floating CTA at bottom]
 *   [tiny mascot in top-right corner]
 */
interface WizardLayoutProps {
  // 1-8 — current step index in the required-steps sequence
  stepIndex: number;
  stepTotal: number;
  title: string;
  subtitle?: string;
  mascotVariant:
    | 'welcome'
    | 'personal'
    | 'photo'
    | 'services'
    | 'area'
    | 'schedule'
    | 'kyc'
    | 'submitted'
    | 'approved'
    | 'rejected';
  ctaLabel: string;
  onCta: () => void;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  // Hide the mascot in the corner (e.g. when content is dense)
  hideCornerMascot?: boolean;
  // Back hides on welcome screen
  canGoBack?: boolean;
  children: ReactNode;
}

export function WizardLayout({
  stepIndex,
  stepTotal,
  title,
  subtitle,
  mascotVariant,
  ctaLabel,
  onCta,
  ctaDisabled,
  ctaLoading,
  hideCornerMascot,
  canGoBack = true,
  children,
}: WizardLayoutProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const progress = Math.max(0, Math.min(1, stepIndex / stepTotal));

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface.muted }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header — back + progress + step count */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 12,
          backgroundColor: colors.surface.DEFAULT,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.DEFAULT,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {canGoBack ? (
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
          ) : (
            <View style={{ width: 36 }} />
          )}

          {/* Progress bar */}
          <View
            style={{
              flex: 1,
              height: 8,
              backgroundColor: colors.surface.subtle,
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${progress * 100}%`,
                height: '100%',
                backgroundColor: colors.brand[700],
                borderRadius: 4,
              }}
            />
          </View>

          <Text
            style={{
              color: colors.ink.muted,
              fontSize: 12,
              fontWeight: '700',
              minWidth: 44,
              textAlign: 'right',
            }}
          >
            {stepIndex} / {stepTotal}
          </Text>
        </View>
      </View>

      {/* Body */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 28,
          paddingBottom: 140,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title row with corner mascot */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 26,
                fontWeight: '800',
                color: colors.ink.DEFAULT,
                letterSpacing: -0.4,
                lineHeight: 32,
              }}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={{
                  fontSize: 15,
                  color: colors.ink.muted,
                  marginTop: 8,
                  lineHeight: 22,
                }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          {!hideCornerMascot ? (
            <View style={{ marginTop: -4 }}>
              <MascotImage variant={mascotVariant} size={72} withHalo />
            </View>
          ) : null}
        </View>

        <View style={{ marginTop: 24 }}>{children}</View>
      </ScrollView>

      {/* Floating CTA */}
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
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowOffset: { width: 0, height: -2 },
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <CoralButton
          label={ctaLabel}
          onPress={onCta}
          disabled={ctaDisabled ?? false}
          loading={ctaLoading ?? false}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
