import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
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

const POLL_INTERVAL_MS = 5000;
const MAX_LENGTH = 500;

interface CaseMessage {
  id: number;
  sender_role: 'patient' | 'driver';
  body: string;
  created_at: string;
}

interface ChatInfo {
  caseStatus: string;
  chatOpen: boolean;
  myRole: 'patient' | 'driver' | null;
  partnerName: string | null;
}

export default function CaseChat() {
  const router = useRouter();
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const caseId = Number(id);

  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [info, setInfo] = useState<ChatInfo>({
    caseStatus: '',
    chatOpen: false,
    myRole: null,
    partnerName: null,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sendError, setSendError] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const listRef = useRef<FlatList<CaseMessage>>(null);
  const lastIdRef = useRef(0);
  const fetchingRef = useRef(false);

  const request = useCallback(
    async (path: string, options: RequestInit = {}) => {
      if (!token) {
        throw new Error('Your session has expired. Please log in again.');
      }

      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await response.text();
      let data: any = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          `Server returned an invalid response (${response.status}).`,
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error || data.message || `Request failed (${response.status}).`,
        );
      }

      return data;
    },
    [token],
  );

  // Adds new messages, skipping any we already have, and remembers the
  // highest id so the next poll only asks for newer ones.
  const mergeMessages = useCallback((incoming: CaseMessage[]) => {
    if (incoming.length === 0) return;

    setMessages((current) => {
      const known = new Set(current.map((m) => m.id));
      const fresh = incoming.filter((m) => !known.has(m.id));
      return fresh.length === 0 ? current : [...current, ...fresh];
    });

    const highest = Math.max(...incoming.map((m) => m.id));
    if (highest > lastIdRef.current) lastIdRef.current = highest;
  }, []);

  const loadMessages = useCallback(
    async (isFirstLoad: boolean) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      try {
        const data = await request(
          `/messages/case/${caseId}?after=${lastIdRef.current}`,
        );

        setInfo({
          caseStatus: data.case_status || '',
          chatOpen: Boolean(data.chat_open),
          myRole: data.my_role || null,
          partnerName: data.partner_name || null,
        });

        mergeMessages(Array.isArray(data.messages) ? data.messages : []);
        setLoadError('');
      } catch (err) {
        // Only block the screen if the very first load fails. A failed
        // background poll just shows a small notice and tries again.
        setLoadError(
          err instanceof Error ? err.message : 'Unable to load messages.',
        );
      } finally {
        fetchingRef.current = false;
        if (isFirstLoad) setLoading(false);
      }
    },
    [request, caseId, mergeMessages],
  );

  // Poll only while this screen is focused.
  useFocusEffect(
    useCallback(() => {
      loadMessages(lastIdRef.current === 0);

      const timer = setInterval(() => loadMessages(false), POLL_INTERVAL_MS);

      return () => clearInterval(timer);
    }, [loadMessages]),
  );

  useEffect(() => {
    if (messages.length === 0) return;

    const timer = setTimeout(
      () => listRef.current?.scrollToEnd({ animated: true }),
      100,
    );

    return () => clearTimeout(timer);
  }, [messages.length]);

  const send = async () => {
    const text = input.trim();

    if (!text || sending || !info.chatOpen) return;

    setSending(true);
    setSendError('');

    try {
      const data = await request(`/messages/case/${caseId}`, {
        method: 'POST',
        body: JSON.stringify({ body: text }),
      });

      if (data.message) mergeMessages([data.message]);

      setInput('');
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : 'Unable to send your message.',
      );

      // A 409 means the chat just closed. Refresh so the screen updates.
      loadMessages(false);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: string) => {
    const parsed = new Date(date);

    return Number.isNaN(parsed.getTime())
      ? ''
      : parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: CaseMessage }) => {
    const mine = info.myRole !== null && item.sender_role === info.myRole;

    return (
      <View
        style={[
          styles.bubble,
          mine ? styles.mineBubble : styles.theirsBubble,
        ]}
      >
        {!mine && (
          <Text style={styles.sender}>
            {info.partnerName ||
              (item.sender_role === 'driver' ? 'Driver' : 'Patient')}
          </Text>
        )}
        <Text style={styles.bubbleText}>{item.body}</Text>
        <Text style={styles.time}>{formatTime(item.created_at)}</Text>
      </View>
    );
  };

  const partnerLabel =
    info.partnerName ||
    (info.myRole === 'driver' ? 'Patient' : 'Ambulance driver');

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.centerText}>Loading messages...</Text>
        </View>
      );
    }

    // First load failed and we have nothing to show
    if (loadError && !info.myRole) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Chat unavailable</Text>
          <Text style={styles.centerText}>{loadError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              loadMessages(true);
            }}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {info.chatOpen
                ? 'No messages yet. Say hello to your driver.'
                : 'No messages were sent on this case.'}
            </Text>
          }
        />

        {loadError !== '' && (
          <Text style={styles.warning}>
            Connection problem. Retrying... ({loadError})
          </Text>
        )}

        {sendError !== '' && <Text style={styles.warning}>{sendError}</Text>}

        {info.chatOpen ? (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type a message..."
              placeholderTextColor={COLORS.muted}
              multiline
              maxLength={MAX_LENGTH}
              editable={!sending}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (sending || !input.trim()) && styles.disabled,
              ]}
              onPress={send}
              disabled={sending || !input.trim()}
            >
              {sending ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.sendText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.closedBar}>
            <Text style={styles.closedText}>
              Chat is closed. It is only available while the ambulance is on
              its way.
            </Text>
          </View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.roundButton} onPress={() => router.back()}>
          <Text style={styles.roundButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.topCenter}>
          <Text style={styles.topTitle}>{partnerLabel}</Text>
          <Text style={styles.topSubtitle}>
            Case #{id}
            {info.chatOpen ? '  •  Live' : info.caseStatus ? '  •  Closed' : ''}
          </Text>
        </View>

        <View style={styles.roundButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {renderBody()}
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  centerText: {
    color: COLORS.muted,
    marginTop: 12,
    fontSize: 13,
    textAlign: 'center',
  },
  errorTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  retryButton: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  retryText: { color: COLORS.primary, fontWeight: 'bold' },
  list: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 40,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginBottom: 10,
  },
  mineBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  theirsBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  sender: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  bubbleText: { color: COLORS.white, fontSize: 14, lineHeight: 20 },
  time: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  warning: {
    color: COLORS.warning,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
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
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: COLORS.white, fontWeight: 'bold', fontSize: 14 },
  disabled: { opacity: 0.5 },
  closedBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 14,
  },
  closedText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});