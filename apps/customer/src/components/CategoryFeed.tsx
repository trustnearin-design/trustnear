import { View } from 'react-native';
import type { CategoryTreeParent } from '../api/discovery';
import {
  SectionTitle,
  PromoBanner,
  CircleLabelGrid,
  DealCardGrid,
  TwoRowCategorySlider,
} from './ui';
import { synthDeal } from '../lib/pricing';
import { colors } from '../theme/colors';

interface CategoryFeedProps {
  parent: CategoryTreeParent;
  onOpenCategory: (slug: string) => void;
}

/**
 * Per-parent home feed (Myntra: content after you tap a top tab). Dense,
 * image-driven rhythm: hero banner → labelled circle grid → deal cards →
 * banner → 2-row slider. Reuses the shared design-system primitives.
 */
export function CategoryFeed({ parent, onOpenCategory }: CategoryFeedProps) {
  const children = parent.children;
  const heroImg = parent.bannerUrl ?? parent.heroImageUrl ?? children[0]?.heroImageUrl ?? null;
  const secondImg = children[children.length - 1]?.heroImageUrl ?? parent.heroImageUrl ?? heroImg;

  const dealItems = children.map((c) => {
    const deal = synthDeal(c.id, c.basePrice);
    return {
      slug: c.slug,
      name: c.name,
      imageUrl: c.heroImageUrl,
      pricePaise: c.basePrice,
      mrpPaise: deal.mrpPaise,
      discountLabel: deal.discountLabel,
    };
  });

  const circleItems = children.map((c) => ({
    slug: c.slug,
    name: c.name,
    imageUrl: c.heroImageUrl,
    caption: `₹${Math.round(c.basePrice / 100)}`,
  }));

  const sliderItems = children.map((c) => ({
    slug: c.slug,
    name: c.name,
    imageUrl: c.heroImageUrl,
    pricePaise: c.basePrice,
  }));

  return (
    <View>
      {/* Hero banner */}
      {heroImg ? (
        <View style={{ marginTop: 16 }}>
          <PromoBanner
            imageUrl={heroImg}
            eyebrow={parent.name}
            title={parent.shortPitch ?? parent.name}
            subtitle="Verified pros · upfront pricing · near you"
            ctaLabel="Explore"
            tint="plum"
            onPress={() => onOpenCategory(parent.slug)}
          />
        </View>
      ) : null}

      {/* Labelled circle grid of all children */}
      <View style={{ marginTop: 24 }}>
        <SectionTitle kicker="Explore" title={`All in ${parent.name}`} />
        <View style={{ marginTop: 6 }}>
          <CircleLabelGrid items={circleItems} columns={4} onPress={onOpenCategory} />
        </View>
      </View>

      {/* Deal cards */}
      <View style={{ marginTop: 24 }}>
        <SectionTitle kicker="Best prices" title={`Top deals in ${parent.name}`} />
        <View style={{ marginTop: 14 }}>
          <DealCardGrid items={dealItems} onPress={onOpenCategory} />
        </View>
      </View>

      {/* Coral promo */}
      {secondImg ? (
        <View style={{ marginTop: 28 }}>
          <PromoBanner
            imageUrl={secondImg}
            eyebrow="Limited time"
            title={`Save on your first\n${parent.name} booking`}
            subtitle="Book in 60 seconds"
            ctaLabel="Book now"
            tint="coral"
            onPress={() => onOpenCategory(parent.slug)}
          />
        </View>
      ) : null}

      {/* 2-row slider (only when enough leaves to justify it) */}
      {children.length >= 5 ? (
        <View style={{ marginTop: 28 }}>
          <SectionTitle kicker="Quick book" title={`More ${parent.name} services`} />
          <TwoRowCategorySlider items={sliderItems} onPress={onOpenCategory} />
        </View>
      ) : null}

      <View style={{ height: 16, backgroundColor: colors.surface.muted }} />
    </View>
  );
}
