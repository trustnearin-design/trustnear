import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFaqs, type FaqArticle } from '../../src/api/help';
import { colors } from '../../src/theme/colors';
import { BrandHero, MascotImage } from '../../src/components/ui';

/**
 * D8 pro help & support — Plum hero with Sevak Searcher, FAQ accordion,
 * support card pointing to pros@trustnear.in.
 */
export default function HelpScreen() {
  const router = useRouter();
  const { data, isPending, isError } = useFaqs();
  const [openId, setOpenId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const items = data?.items ?? [];
    const map = new Map<string, FaqArticle[]>();
    for (const f of items) {
      if (!map.has(f.category)) map.set(f.category, []);
      map.get(f.category)!.push(f);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.surface.muted }}>
      <StatusBar style="light" />

      <BrandHero onBack={() => router.back()} bottomGap={32}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 4,
          }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text
              style={{
                color: colors.support[300],
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              Help & support
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontSize: 26,
                fontWeight: '800',
                color: '#FFFFFF',
                letterSpacing: -0.4,
              }}
            >
              How can{'\n'}we help?
            </Text>
            <Text style={{ marginTop: 6, fontSize: 13, color: colors.brand[200] }}>
              Pro-specific answers + direct line to our team.
            </Text>
          </View>
          <MascotImage variant="searcher" tone="butter" size={100} />
        </View>
      </BrandHero>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {isPending ? (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 4,
              alignItems: 'center',
              padding: 32,
              backgroundColor: colors.surface.DEFAULT,
              borderRadius: 18,
            }}
          >
            <ActivityIndicator color={colors.brand.DEFAULT} />
          </View>
        ) : isError ? (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 4,
              alignItems: 'center',
              padding: 32,
              backgroundColor: colors.surface.DEFAULT,
              borderRadius: 18,
            }}
          >
            <Ionicons name="alert-circle" size={26} color={colors.danger} />
            <Text style={{ marginTop: 6, fontSize: 13, color: colors.danger }}>
              Could not load FAQs.
            </Text>
          </View>
        ) : grouped.length === 0 ? (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 4,
              alignItems: 'center',
              padding: 28,
              backgroundColor: colors.surface.DEFAULT,
              borderRadius: 18,
            }}
          >
            <MascotImage variant="apologizer" tone="coral" size={84} />
            <Text
              style={{ marginTop: 10, fontSize: 14, fontWeight: '800', color: colors.ink.DEFAULT }}
            >
              No articles yet
            </Text>
            <Text
              style={{ marginTop: 6, textAlign: 'center', fontSize: 12, color: colors.ink.muted }}
            >
              We&apos;re adding help content. Reach support directly below.
            </Text>
          </View>
        ) : (
          grouped.map(([cat, items]) => (
            <View key={cat}>
              <Text
                style={{
                  marginHorizontal: 20,
                  marginTop: 14,
                  fontSize: 11,
                  fontWeight: '800',
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  color: colors.ink.subtle,
                }}
              >
                {cat}
              </Text>
              <View
                style={{
                  marginHorizontal: 20,
                  marginTop: 8,
                  backgroundColor: colors.surface.DEFAULT,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: colors.border.DEFAULT,
                  overflow: 'hidden',
                }}
              >
                {items.map((f, idx) => {
                  const open = openId === f.id;
                  return (
                    <View key={f.id}>
                      <Pressable
                        onPress={() => setOpenId(open ? null : f.id)}
                        style={{ paddingHorizontal: 14, paddingVertical: 14 }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text
                            style={{
                              flex: 1,
                              fontSize: 14,
                              fontWeight: '700',
                              color: colors.ink.DEFAULT,
                            }}
                          >
                            {f.question}
                          </Text>
                          <View
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              backgroundColor: open ? colors.accent[100] : colors.brand[50],
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Ionicons
                              name={open ? 'remove' : 'add'}
                              size={16}
                              color={open ? colors.accent[700] : colors.brand[800]}
                            />
                          </View>
                        </View>
                        {open ? (
                          <Text
                            style={{
                              marginTop: 10,
                              fontSize: 13,
                              lineHeight: 20,
                              color: colors.ink.muted,
                            }}
                          >
                            {f.body}
                          </Text>
                        ) : null}
                      </Pressable>
                      {idx < items.length - 1 ? (
                        <View
                          style={{
                            marginLeft: 14,
                            height: 1,
                            backgroundColor: colors.border.DEFAULT,
                          }}
                        />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}

        <View
          style={{
            marginHorizontal: 20,
            marginTop: 24,
            borderRadius: 18,
            padding: 18,
            backgroundColor: colors.brand[900],
            overflow: 'hidden',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: colors.accent.DEFAULT,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '800',
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                  color: colors.support[300],
                }}
              >
                Still stuck?
              </Text>
              <Text style={{ marginTop: 2, fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>
                Contact pro support
              </Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: colors.brand[200] }}>
                pros@trustnear.in · 9 AM – 9 PM, all days
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
