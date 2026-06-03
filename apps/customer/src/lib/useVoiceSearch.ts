import { useCallback, useState } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

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
 * Native speech-to-text via expo-speech-recognition. Replaces the old
 * @react-native-voice/voice, whose native module came back null under the
 * New Architecture ("Cannot read property 'startSpeech' of null"). This
 * module is New-Arch + Expo compatible. Requires a custom dev/EAS build —
 * the native module isn't in Expo Go. Recognised text feeds the existing
 * category search (search.tsx), so there's no separate voice-search path.
 */
export function useVoiceSearch(): VoiceSearch {
  const [isListening, setIsListening] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [finalText, setFinalText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setError(null);
  });
  useSpeechRecognitionEvent('end', () => setIsListening(false));
  useSpeechRecognitionEvent('result', (e) => {
    const transcript = e.results?.[0]?.transcript;
    if (transcript) {
      setPartialText(transcript);
      if (e.isFinal) setFinalText(transcript);
    }
  });
  useSpeechRecognitionEvent('error', (e) => {
    setIsListening(false);
    setError(e.message ?? 'Voice recognition failed. Please try again.');
  });

  const start = useCallback(async (locale = 'en-IN') => {
    setError(null);
    setPartialText('');
    setFinalText(null);
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        setError('Microphone permission denied');
        return;
      }
      // start() is fire-and-forget; results arrive via the listeners above.
      ExpoSpeechRecognitionModule.start({
        lang: locale,
        interimResults: true,
        continuous: false,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start voice search');
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      /* stop can throw if not listening — safe to ignore */
    }
    setIsListening(false);
  }, []);

  return { isListening, partialText, finalText, error, start, stop };
}
