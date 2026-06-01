import { useCallback, useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import Voice, { type SpeechResultsEvent, type SpeechErrorEvent } from '@react-native-voice/voice';

export interface VoiceSearch {
  isListening: boolean;
  /** Live partial transcript while the user is speaking. */
  partialText: string;
  /** Final recognised phrase (set once recognition completes). */
  finalText: string | null;
  error: string | null;
  /** Begin listening. locale: 'hi-IN' (Hindi) or 'en-IN' (Indian English). */
  start: (locale?: string) => Promise<void>;
  stop: () => Promise<void>;
}

/**
 * Native speech-to-text via @react-native-voice/voice. Requires a custom
 * dev/EAS build — the native module is NOT available in Expo Go. The
 * recognised text is fed into the existing category search (see search.tsx),
 * so there is no separate "voice search" path.
 */
export function useVoiceSearch(): VoiceSearch {
  const [isListening, setIsListening] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [finalText, setFinalText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Voice.onSpeechStart = () => {
      setIsListening(true);
      setError(null);
    };
    Voice.onSpeechEnd = () => setIsListening(false);
    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      const v = e.value?.[0];
      if (v) setPartialText(v);
    };
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const v = e.value?.[0];
      if (v) {
        setPartialText(v);
        setFinalText(v);
      }
    };
    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      setIsListening(false);
      setError(e.error?.message ?? 'Voice recognition failed. Please try again.');
    };

    return () => {
      void Voice.destroy().then(() => Voice.removeAllListeners());
    };
  }, []);

  const start = useCallback(async (locale = 'en-IN') => {
    setError(null);
    setPartialText('');
    setFinalText(null);

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone access',
          message: 'TrustNear needs your microphone to search by voice.',
          buttonPositive: 'Allow',
          buttonNegative: 'Cancel',
        },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        setError('Microphone permission denied');
        return;
      }
    }

    try {
      await Voice.start(locale);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start voice search');
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      await Voice.stop();
    } catch {
      /* stop can throw if not listening — safe to ignore */
    }
    setIsListening(false);
  }, []);

  return { isListening, partialText, finalText, error, start, stop };
}
