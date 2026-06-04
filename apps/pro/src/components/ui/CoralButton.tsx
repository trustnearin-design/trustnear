import { View, Text, ActivityIndicator, ViewStyle } from 'react-native';
import { Gradient } from './Gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { AnimatedPressable, usePressScale } from './pressScale';

interface CoralButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'] | null;
  suffix?: string;
  solid?: boolean;
  style?: ViewStyle;
}

export function CoralButton({
  label,
  onPress,
  disabled,
  loading,
  icon = 'arrow-forward',
  suffix,
  solid = false,
  style,
}: CoralButtonProps) {
  const inactive = disabled || loading;

  const inner = (
    <>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 }}>
            {label}
          </Text>
          {suffix ? (
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginLeft: 8 }}>
              {suffix}
            </Text>
          ) : null}
          {icon ? (
            <Ionicons name={icon} size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
          ) : null}
        </>
      )}
    </>
  );

  const press = usePressScale();
  return (
    <AnimatedPressable
      disabled={inactive}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        {
          opacity: inactive ? 0.5 : 1,
          shadowColor: colors.accent.DEFAULT,
          shadowOpacity: inactive ? 0 : 0.32,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
          borderRadius: 18,
          transform: [{ scale: press.scale }],
        },
        style,
      ]}
    >
      {solid ? (
        <View
          style={{
            backgroundColor: colors.accent.DEFAULT,
            paddingVertical: 16,
            paddingHorizontal: 24,
            borderRadius: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {inner}
        </View>
      ) : (
        <Gradient
          colors={colors.gradient.coralCta}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingVertical: 16,
            paddingHorizontal: 24,
            borderRadius: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {inner}
        </Gradient>
      )}
    </AnimatedPressable>
  );
}

export function OutlineButton({
  label,
  onPress,
  disabled,
  loading,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  style?: ViewStyle;
}) {
  const inactive = disabled || loading;
  const press = usePressScale();
  return (
    <AnimatedPressable
      disabled={inactive}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        {
          paddingVertical: 15,
          paddingHorizontal: 24,
          borderRadius: 18,
          borderWidth: 1.5,
          borderColor: colors.brand[700],
          backgroundColor: 'transparent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: inactive ? 0.5 : 1,
          transform: [{ scale: press.scale }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.brand[700]} />
      ) : (
        <>
          {icon ? (
            <Ionicons name={icon} size={18} color={colors.brand[700]} style={{ marginRight: 8 }} />
          ) : null}
          <Text
            style={{
              color: colors.brand[700],
              fontSize: 15,
              fontWeight: '700',
              letterSpacing: 0.2,
            }}
          >
            {label}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}
