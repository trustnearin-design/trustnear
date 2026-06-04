import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  View,
  Text,
  Image,
  Animated,
  Linking,
  Dimensions,
  type ScrollView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useBanners, type Banner } from '../api/banners';
import { colors } from '../theme/colors';
import { Gradient } from './ui/Gradient';
import { AnimatedPressable, usePressScale } from './ui/pressScale';

const SCREEN_W = Dimensions.get('window').width;
const SLIDE_W = SCREEN_W - 40; // 20px padding each side
const SLIDE_H = 160;
const AUTO_ROTATE_MS = 5000;

/**
 * Home hero banner carousel. Shows admin-managed banners with auto-rotate
 * + pagination dots + tap-action routing. Hidden entirely while loading
 * or if no banners are returned — the page should never show an empty
 * banner slot.
 */
export function BannerSlider({ placement = 'home_hero' }: { placement?: Banner['placement'] }) {
  const router = useRouter();
  const banners = useBanners(placement);
  const scrollRef = useRef<ComponentRef<typeof Animated.ScrollView>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [active, setActive] = useState(0);

  const list = banners.data ?? [];

  // Auto-rotate. Skips if only one banner or if user is mid-touch.
  useEffect(() => {
    if (list.length <= 1) return;
    const handle = setInterval(() => {
      setActive((prev) => {
        const next = (prev + 1) % list.length;
        (scrollRef.current as ScrollView | null)?.scrollTo({ x: next * SLIDE_W, animated: true });
        return next;
      });
    }, AUTO_ROTATE_MS);
    return () => clearInterval(handle);
  }, [list.length]);

  if (banners.isPending || list.length === 0) return null;

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / SLIDE_W);
    if (i !== active) setActive(i);
  }

  function handleTap(b: Banner) {
    if (b.linkKind === 'none' || !b.linkTarget) return;
    switch (b.linkKind) {
      case 'category':
        router.push({
          pathname: '/(app)/category/[slug]',
          params: { slug: b.linkTarget },
        });
        return;
      case 'external':
        void Linking.openURL(b.linkTarget);
        return;
      case 'promo':
        // Deep-link to wallet so users see their balance + applied credits.
        // The actual promo code apply lives in the booking flow; this
        // tap is a discovery cue ("offers exist, here's your balance").
        router.push('/(app)/wallet' as never);
        return;
    }
  }

  return (
    <View className="mt-5">
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={SLIDE_W}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 20 }}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: true,
        })}
        onMomentumScrollEnd={onScroll}
      >
        {list.map((b, i) => (
          <Slide key={b.id} banner={b} index={i} scrollX={scrollX} onPress={() => handleTap(b)} />
        ))}
      </Animated.ScrollView>

      {list.length > 1 && (
        <View className="mt-3 flex-row items-center justify-center">
          {list.map((b, i) => (
            <View
              key={b.id}
              style={{
                width: i === active ? 18 : 6,
                height: 6,
                borderRadius: 3,
                marginHorizontal: 3,
                backgroundColor: i === active ? colors.brand.DEFAULT : colors.ink.subtle,
                opacity: i === active ? 1 : 0.4,
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function Slide({
  banner,
  index,
  scrollX,
  onPress,
}: {
  banner: Banner;
  index: number;
  scrollX: Animated.Value;
  onPress: () => void;
}) {
  const press = usePressScale(0.97);
  // Carousel depth — the centred slide is full size, neighbours shrink
  // slightly so the active banner pops (Yes Madam / Swiggy hero feel).
  const inputRange = [(index - 1) * SLIDE_W, index * SLIDE_W, (index + 1) * SLIDE_W];
  const focusScale = scrollX.interpolate({
    inputRange,
    outputRange: [0.93, 1, 0.93],
    extrapolate: 'clamp',
  });
  const dim = scrollX.interpolate({
    inputRange,
    outputRange: [0.5, 0, 0.5],
    extrapolate: 'clamp',
  });
  const hasText = banner.title || banner.subtitle || banner.ctaText;
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      disabled={banner.linkKind === 'none'}
      style={{
        width: SLIDE_W,
        height: SLIDE_H,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: colors.brand[100],
        transform: [{ scale: Animated.multiply(focusScale, press.scale) }],
      }}
    >
      <Image
        source={{ uri: banner.imageUrl }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />
      {/* Inactive slides dim slightly so the focused one reads as "live". */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#000',
          opacity: dim,
        }}
      />
      {/* Premium bottom gradient for text legibility — only when there IS
          text. Pure-image banners (full-bleed photos) skip it. */}
      {hasText && (
        <>
          <Gradient
            colors={['rgba(11,31,58,0)', 'rgba(11,31,58,0.72)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: SLIDE_H * 0.7,
            }}
          />
          <View className="absolute inset-0 flex-1 justify-end p-5">
            {banner.ctaText && (
              <View className="self-start rounded-pill bg-accent px-2.5 py-1">
                <Text className="text-[10px] font-bold uppercase tracking-[1px] text-ink-inverse">
                  {banner.ctaText}
                </Text>
              </View>
            )}
            {banner.title && (
              <Text className="mt-2 text-[18px] font-bold text-ink-inverse" numberOfLines={2}>
                {banner.title}
              </Text>
            )}
            {banner.subtitle && (
              <Text
                className="mt-0.5 text-[13px] font-medium text-ink-inverse"
                style={{ opacity: 0.9 }}
                numberOfLines={2}
              >
                {banner.subtitle}
              </Text>
            )}
          </View>
        </>
      )}
    </AnimatedPressable>
  );
}
