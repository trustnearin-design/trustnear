import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'sevalink.search.recent';
const MAX = 8;

export async function getRecentSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX);
  } catch {
    return [];
  }
}

export async function addRecentSearch(term: string): Promise<string[]> {
  const t = term.trim();
  if (t.length < 2) return getRecentSearches();
  const existing = await getRecentSearches();
  const next = [t, ...existing.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function clearRecentSearches(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
