import { View, Text, Image } from 'react-native';
import { avatarColor, initials } from '../lib/imagery';

interface Props {
  fullName: string;
  photoUrl?: string | null | undefined;
  size?: number;
  borderColor?: string;
}

/**
 * Circular avatar. Renders the user's photo if provided, otherwise initials
 * on a deterministic colored background derived from the name.
 */
export function Avatar({ fullName, photoUrl, size = 56, borderColor }: Props) {
  const radius = size / 2;
  const fontSize = Math.round(size * 0.38);
  const ring = borderColor ? { borderWidth: 2, borderColor } : {};

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: '#E2E8F0',
          ...ring,
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: avatarColor(fullName),
        alignItems: 'center',
        justifyContent: 'center',
        ...ring,
      }}
    >
      <Text style={{ color: 'white', fontSize, fontWeight: '700' }}>{initials(fullName)}</Text>
    </View>
  );
}
