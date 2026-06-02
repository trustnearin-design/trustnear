import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSearchCategories, type CategorySearchHit } from '../../src/api/discovery';
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
} from '../../src/lib/recentSearches';
import { useVoiceSearch } from '../../src/lib/useVoiceSearch';
import { formatRupees } from '../../src/lib/format';
import { colors } from '../../src/theme/colors';

const SUGGESTED: string[] = [
  'Home cleaning',
  'AC service',
  'Salon at home',
  'Pest control',
  'Plumber',
  'Electrician',
  'Maid',
  'Dog grooming',
];

/**
 * Free-text search across categories. Pearl background, debounced input,
 * recent searches + suggestions when query is empty, scored hits otherwise.
 * Tapping a result navigates to the category detail page.
 */
export default function SearchScreen() {
  const router = useRouter();
  const { voice: voiceParam } = useLocalSearchParams<{ voice?: string }>();
  const inputRef = useRef<TextInput>(null);
  const [raw, setRaw] = useState('');
  const [debounced, setDebounced] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  // Voice locale toggle — Indian English vs Hindi (Devanagari output).
  const [lang, setLang] = useState<'en-IN' | 'hi-IN'>('en-IN');
  const voice = useVoiceSearch();
  const autoStarted = useRef(false);

  useEffect(() => {
    void getRecentSearches().then(setRecent);
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  // Auto-start listening when arriving from the home mic button (?voice=1).
  useEffect(() => {
    if (voiceParam === '1' && !autoStarted.current) {
      autoStarted.current = true;
      void voice.start(lang);
    }
  }, [voiceParam, lang, voice]);

  // Pipe recognised speech into the search box → existing debounce/search.
  useEffect(() => {
    if (voice.finalText) setRaw(voice.finalText);
  }, [voice.finalText]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(raw.trim()), 250);
    return () => clearTimeout(t);
  }, [raw]);

  const toggleMic = () => {
    if (voice.isListening) void voice.stop();
    else void voice.start(lang);
  };

  const search = useSearchCategories(debounced);
  const isSearching = debounced.length >= 2;
  const results = search.data?.results ?? [];

  const commitTerm = async (term: string) => {
    const next = await addRecentSearch(term);
    setRecent(next);
  };

  const openCategory = async (slug: string, term: string) => {
    Keyboard.dismiss();
    await commitTerm(term);
    router.replace({ pathname: '/(app)/category/[slug]', params: { slug } });
  };

  const useSuggestion = (term: string) => {
    setRaw(term);
    inputRef.current?.focus();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.muted }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.surface.DEFAULT }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border.DEFAULT,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.ink.DEFAULT} />
          </Pressable>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surface.muted,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 10,
              marginLeft: 4,
            }}
          >
            <Ionicons name="search" size={18} color={colors.ink.subtle} />
            <TextInput
              ref={inputRef}
              value={raw}
              onChangeText={setRaw}
              placeholder="Search for cleaning, salon, AC…"
              placeholderTextColor={colors.ink.subtle}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => {
                // Only open when the results actually correspond to what's typed
                // now (debounce may not have fired yet on a fast enter), and pass
                // the term that produced them — not the raw input — to avoid
                // opening a stale/wrong category.
                if (debounced === raw.trim() && results[0]) {
                  void openCategory(results[0].slug, debounced);
                }
              }}
              style={{
                marginLeft: 10,
                flex: 1,
                fontSize: 15,
                color: colors.ink.DEFAULT,
                paddingVertical: 0,
              }}
            />
            {raw.length > 0 ? (
              <Pressable hitSlop={8} onPress={() => setRaw('')}>
                <Ionicons name="close-circle" size={18} color={colors.ink.subtle} />
              </Pressable>
            ) : null}
            {/* Voice language toggle */}
            <Pressable
              hitSlop={6}
              onPress={() => setLang((l) => (l === 'en-IN' ? 'hi-IN' : 'en-IN'))}
              style={{
                marginLeft: 8,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
                backgroundColor: colors.surface.DEFAULT,
                borderWidth: 1,
                borderColor: colors.border.DEFAULT,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.ink.muted }}>
                {lang === 'hi-IN' ? 'हिं' : 'EN'}
              </Text>
            </Pressable>
            {/* Mic — tap to start/stop voice search */}
            <Pressable
              hitSlop={8}
              onPress={toggleMic}
              style={{
                marginLeft: 8,
                width: 30,
                height: 30,
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: voice.isListening ? colors.accent.DEFAULT : 'transparent',
              }}
            >
              <Ionicons
                name={voice.isListening ? 'mic' : 'mic-outline'}
                size={18}
                color={voice.isListening ? '#FFFFFF' : colors.accent.DEFAULT}
              />
            </Pressable>
          </View>
        </View>
        {/* Voice status / error strip */}
        {voice.isListening || voice.error ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: voice.error ? colors.danger : colors.accent[700],
              }}
            >
              {voice.error ??
                (voice.partialText ? `“${voice.partialText}”` : 'Listening… speak now')}
            </Text>
          </View>
        ) : null}
      </SafeAreaView>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
        {isSearching ? (
          <ResultsBlock
            loading={search.isPending}
            error={search.isError}
            results={results}
            query={debounced}
            onPick={(slug) => void openCategory(slug, debounced)}
          />
        ) : (
          <EmptyState
            recent={recent}
            onPick={useSuggestion}
            onClear={async () => {
              await clearRecentSearches();
              setRecent([]);
            }}
          />
        )}
      </ScrollView>
    </View>
  );
}

function ResultsBlock({
  loading,
  error,
  results,
  query,
  onPick,
}: {
  loading: boolean;
  error: boolean;
  results: CategorySearchHit[];
  query: string;
  onPick: (slug: string) => void;
}) {
  if (loading) {
    return (
      <View style={{ paddingVertical: 32, alignItems: 'center' }}>
        <ActivityIndicator color={colors.brand.DEFAULT} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
        <Text style={{ color: colors.danger, fontSize: 14, fontWeight: '600' }}>
          Couldn&apos;t search right now. Check your connection.
        </Text>
      </View>
    );
  }
  if (results.length === 0) {
    return (
      <View style={{ paddingHorizontal: 20, paddingTop: 40, alignItems: 'center' }}>
        <Ionicons name="search-outline" size={40} color={colors.ink.subtle} />
        <Text
          style={{
            marginTop: 14,
            fontSize: 15,
            fontWeight: '700',
            color: colors.ink.DEFAULT,
          }}
        >
          No matches for &quot;{query}&quot;
        </Text>
        <Text
          style={{
            marginTop: 6,
            fontSize: 13,
            color: colors.ink.subtle,
            textAlign: 'center',
          }}
        >
          Try a different word, or browse our categories.
        </Text>
      </View>
    );
  }
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
      {results.map((r) => (
        <ResultRow key={r.id} hit={r} onPress={() => onPick(r.slug)} />
      ))}
    </View>
  );
}

function ResultRow({ hit, onPress }: { hit: CategorySearchHit; onPress: () => void }) {
  const isLeaf = hit.parentId !== null;
  const subtitleParts: string[] = [];
  if (hit.parent) subtitleParts.push(hit.parent.name);
  if (isLeaf && hit.basePrice > 0) {
    subtitleParts.push(`from ${formatRupees(hit.basePrice)}`);
  }
  if (!isLeaf) subtitleParts.push('Category');

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface.DEFAULT,
        borderRadius: 14,
        padding: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border.DEFAULT,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          backgroundColor: colors.brand[50],
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {hit.heroImageUrl ? (
          <Image
            source={{ uri: hit.heroImageUrl }}
            style={{ width: 56, height: 56 }}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="image-outline" size={22} color={colors.brand[400]} />
        )}
      </View>
      <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 15,
            fontWeight: '800',
            color: colors.ink.DEFAULT,
          }}
        >
          {hit.name}
        </Text>
        <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 12, color: colors.ink.muted }}>
          {subtitleParts.join(' · ')}
        </Text>
        {hit.shortPitch ? (
          <Text numberOfLines={1} style={{ marginTop: 4, fontSize: 11, color: colors.ink.subtle }}>
            {hit.shortPitch}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.ink.subtle} />
    </Pressable>
  );
}

function EmptyState({
  recent,
  onPick,
  onClear,
}: {
  recent: string[];
  onPick: (term: string) => void;
  onClear: () => void;
}) {
  return (
    <View>
      {recent.length > 0 ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: colors.ink.subtle,
              }}
            >
              Recent searches
            </Text>
            <Pressable onPress={onClear} hitSlop={8}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: colors.accent.DEFAULT,
                }}
              >
                Clear
              </Text>
            </Pressable>
          </View>
          {recent.map((term) => (
            <Pressable
              key={term}
              onPress={() => onPick(term)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
              }}
            >
              <Ionicons name="time-outline" size={18} color={colors.ink.subtle} />
              <Text
                style={{
                  marginLeft: 12,
                  flex: 1,
                  fontSize: 14,
                  color: colors.ink.DEFAULT,
                }}
              >
                {term}
              </Text>
              <Ionicons
                name="arrow-up-outline"
                size={16}
                color={colors.ink.subtle}
                style={{ transform: [{ rotate: '-45deg' }] }}
              />
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={{ paddingHorizontal: 20, paddingTop: recent.length > 0 ? 24 : 18 }}>
        <Text
          style={{
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: colors.ink.subtle,
            marginBottom: 12,
          }}
        >
          Popular searches
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {SUGGESTED.map((s) => (
            <Pressable
              key={s}
              onPress={() => onPick(s)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 999,
                backgroundColor: colors.surface.DEFAULT,
                borderWidth: 1,
                borderColor: colors.border.DEFAULT,
                marginRight: 8,
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 13, color: colors.ink.DEFAULT, fontWeight: '600' }}>
                {s}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
