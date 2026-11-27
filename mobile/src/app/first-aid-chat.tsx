import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/services/AuthContext';
import { API_BASE_URL } from '@/constants/api';

const COLORS = {
  background: '#081321',
  surface: '#122238',
  surfaceLight: '#1A304A',
  primary: '#E63946',
  white: '#FFFFFF',
  muted: '#9FB0C3',
  green: '#35C98A',
  border: '#263C54',
  warning: '#F5B942',
};

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  local?: boolean;
}

const GREETING: ChatMessage = {
  id: 'greeting',
  role: 'assistant',
  local: true,
  content:
    'Hello, I am the MediRescue first-aid assistant. I am not a doctor and I cannot diagnose. Tell me what is happening and I will give you basic first-aid steps while the ambulance is on its way.',
};

const QUICK_STARTS = [
  'Heavy bleeding',
  'Not breathing',
  'Choking',
  'Burn',
  'Seizure',
  'Fainted',
];

export default function FirstAidChat() {
  const router = useRouter();
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [source, setSource] = useState<'ai' | 'builtin' | null>(null);

  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    const timer = setTimeout(
      () => listRef.current?.scrollToEnd({ animated: true }),
      100,
    );
    return () => clearTimeout(timer);
  }, [messages, sending]);

  // Fixed: Wrapped in useCallback to prevent Date.now() in render warning
  const send = useCallback(async (rawText: string) => {
    const text = rawText.trim();

    if (!text || sending) return;

    if (!token) {
      setError('Your session has expired. Please log in again.');
      return;
    }

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
    };

    const next = [...messages, userMessage];

    setMessages(next);
    setInput('');
    setError('');
    setSending(true);

    try {
      const payload = next
        .filter((m) => !m.local)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: payload }),
      });

      const responseText = await response.text();
      let data: any = {};

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(
          `Server returned an invalid response (${response.status}).`,
        );
      }

      if (response.status === 429) {
        throw new Error(
          data.message ||
            'Too many messages. Please wait a few minutes. If this is an emergency, call 999 or 112.',
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message || data.error || `Request failed (${response.status}).`,
        );
      }

      if (typeof data.reply !== 'string' || !data.reply.trim()) {
        throw new Error('The assistant sent an empty reply. Please try again.');
      }

      setSource(data.source === 'ai' ? 'ai' : 'builtin');

      setMessages((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
        },
      ]);
    } catch (err) {
      setMessages((current) => current.filter((m) => m.id !== userMessage.id));
      setInput(text);
      setError(
        err instanceof Error
          ? err.message
          : 'Assistant unavailable. If this is an emergency, call 999 or 112.',
      );
    } finally {
      setSending(false);
    }
  }, [messages, sending, token]);

  const callEmergency = () => {
    Linking.openURL('tel:999').catch(() => {
      setError('Unable to open the phone dialer. Please dial 999 or 112.');
    });
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text style={styles.bubbleText}>{item.content}</Text>
      </View>
    );
  };

  const showQuickStarts = messages.length === 1 && !sending;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.roundButton} onPress={() => router.back()}>
          <Text style={styles.roundButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.topCenter}>
          <Text style={styles.topTitle}>First Aid Assistance</Text>
          <Text style={styles.topSubtitle}>
            {id ? `Case #${id}` : 'MediRescue'}
            {source ? `  •  ${source === 'ai' ? 'AI assistant' : 'Quick guide'}` : ''}
          </Text>
        </View>

        <View style={styles.roundButton} />
      </View>

      <TouchableOpacity style={styles.emergencyBanner} onPress={callEmergency}>
        <Text style={styles.emergencyBannerText}>
          Life-threatening? Tap to call 999 (or dial 112)
        </Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          ListFooterComponent={
            <>
              {showQuickStarts && (
                <View style={styles.chips}>
                  {QUICK_STARTS.map((label) => (
                    <TouchableOpacity
                      key={label}
                      style={styles.chip}
                      onPress={() => send(label)}
                    >
                      <Text style={styles.chipText}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {sending && (
                <View style={[styles.bubble, styles.assistantBubble]}>
                  <ActivityIndicator color={COLORS.muted} />
                </View>
              )}
            </>
          }
        />

        {error !== '' && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.disclaimer}>
          Basic first-aid guidance only. This is not medical advice.
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Describe what is happening..."
            placeholderTextColor={COLORS.muted}
            multiline
            maxLength={2000}
            editable={!sending}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (sending || !input.trim()) && styles.disabled,
            ]}
            onPress={() => send(input)}
            disabled={sending || !input.trim()}
          >
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  roundButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundButtonText: { color: COLORS.white, fontSize: 18 },
  topCenter: { alignItems: 'center' },
  topTitle: { color: COLORS.white, fontSize: 17, fontWeight: 'bold' },
  topSubtitle: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  emergencyBanner: {
    backgroundColor: '#3A1820',
    borderBottomWidth: 1,
    borderBottomColor: '#57303B',
    paddingVertical: 10,
    alignItems: 'center',
  },
  emergencyBannerText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  list: { padding: 16, paddingBottom: 8 },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { color: COLORS.white, fontSize: 14, lineHeight: 21 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  error: {
    color: COLORS.warning,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  disclaimer: {
    color: '#687B90',
    fontSize: 10,
    textAlign: 'center',
    paddingBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.white,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 18,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: COLORS.white, fontWeight: 'bold', fontSize: 14 },
  disabled: { opacity: 0.5 },
});