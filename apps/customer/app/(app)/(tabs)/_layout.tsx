import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../src/theme/colors';

/**
 * Filled icon when the tab is focused, outlined otherwise — matches
 * Urban Company / Snabbit tab pattern and gives a stronger active state
 * than just changing the tint color.
 */
function tabIcon(
  outline: React.ComponentProps<typeof Ionicons>['name'],
  filled: React.ComponentProps<typeof Ionicons>['name'],
) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? filled : outline} size={size} color={color} />
  );
}

export default function TabsLayout() {
  // Android gesture-nav devices (OnePlus, Pixel, etc) put a swipe-bar at the
  // bottom that overlaps our tab bar if we use a fixed height. Add the OS
  // bottom inset on top of our base height so icons + labels stay tappable
  // above the gesture bar. iOS handles its own home-indicator via 84px.
  const insets = useSafeAreaInsets();
  const baseHeight = Platform.OS === 'ios' ? 84 : 64;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.DEFAULT,
        tabBarInactiveTintColor: colors.ink.subtle,
        tabBarStyle: {
          borderTopColor: colors.border.DEFAULT,
          backgroundColor: colors.surface.DEFAULT,
          height: baseHeight + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
          elevation: 12,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarItemStyle: { paddingTop: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: tabIcon('home-outline', 'home'),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Services',
          tabBarIcon: tabIcon('grid-outline', 'grid'),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: tabIcon('receipt-outline', 'receipt'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: tabIcon('person-outline', 'person'),
        }}
      />
    </Tabs>
  );
}
