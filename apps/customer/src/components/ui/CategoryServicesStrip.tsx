import { View, ScrollView } from 'react-native';
import { SectionHeader } from './SectionHeader';
import { ServiceCard } from './ServiceCard';

interface ServiceLeaf {
  id: string;
  slug: string;
  name: string;
  heroImageUrl: string | null;
  professionalTitle?: string | null;
  basePrice: number;
  minDurationMinutes: number;
}

interface CategoryServicesStripProps {
  /** Section eyebrow shown above title, e.g. "TRENDING NOW". */
  eyebrow?: string;
  /** Section title, e.g. "Home Cleaning services". */
  title: string;
  /** Optional CTA label like "See all". */
  ctaLabel?: string;
  onCtaPress?: () => void;
  /** Service leaves to render as cards. */
  services: ServiceLeaf[];
  /** Optional fixed card width. Default 200. */
  cardWidth?: number;
  /** Optional badge string per card index — e.g. "Bestseller" on the first. */
  badgeForIndex?: (i: number) => string | undefined;
  onCardPress: (slug: string) => void;
}

/**
 * D6 category-services strip — section header + horizontal scroll of
 * ServiceCards for one category (or curated mix). Pattern source:
 * YesMadam "Most Booked / Trending Near You" recurring sliders.
 *
 * Use this multiple times on the home screen (one per major parent
 * category) to build the dense, scroll-heavy YM/UC feel.
 */
export function CategoryServicesStrip({
  eyebrow,
  title,
  ctaLabel,
  onCtaPress,
  services,
  cardWidth = 200,
  badgeForIndex,
  onCardPress,
}: CategoryServicesStripProps) {
  if (services.length === 0) {
    return null;
  }

  // Deterministic fake rating/count derived from id so they don't reshuffle
  // on every render — gives the UI a "real" feel until real data ships.
  const ratingFor = (id: string) => 4.5 + (Math.abs(id.charCodeAt(0)) % 5) * 0.1;
  const countFor = (id: string) => `${100 + (Math.abs(id.charCodeAt(1)) % 900)}+`;

  return (
    <View>
      <View style={{ paddingHorizontal: 20 }}>
        <SectionHeader
          eyebrow={eyebrow ?? ''}
          title={title}
          ctaLabel={ctaLabel ?? ''}
          onCtaPress={onCtaPress ?? (() => {})}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, gap: 12 }}
      >
        {services.map((s, i) => (
          <ServiceCard
            key={s.id}
            width={cardWidth}
            imageUrl={s.heroImageUrl}
            title={s.name}
            subtitle={s.professionalTitle ?? undefined}
            rating={ratingFor(s.id)}
            ratingCount={countFor(s.id)}
            pricePaise={s.basePrice}
            durationLabel={`${s.minDurationMinutes} min`}
            badge={badgeForIndex?.(i)}
            onPress={() => onCardPress(s.slug)}
            onAddPress={() => onCardPress(s.slug)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
