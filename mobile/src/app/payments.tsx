import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
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

interface PatientCase {
  id: number;
  emergency_desc: string;
  status: string;
  severity: string;
  payment_amount: number | null;
  hospital_name: string;
  requested_at: string;
}

interface FeedbackMessage {
  type: 'success' | 'info' | 'error';
  text: string;
}

// Safaricom expects 2547XXXXXXXX / 2541XXXXXXXX.
const normalizePhone = (value: string): string | null => {
  const digits = value.replace(/\D/g, '');
  let normalized: string;

  if (digits.startsWith('254') && digits.length === 12) {
    normalized = digits;
  } else if (digits.startsWith('0') && digits.length === 10) {
    normalized = `254${digits.slice(1)}`;
  } else if (digits.length === 9 && /^[17]/.test(digits)) {
    normalized = `254${digits}`;
  } else {
    return null;
  }

  return /^254[17]\d{8}$/.test(normalized) ? normalized : null;
};

const formatAmount = (amount: number | string | null | undefined) =>
  amount == null || Number.isNaN(Number(amount))
    ? 'Not set'
    : `KES ${Number(amount).toLocaleString()}`;

export default function PaymentsScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [cases, setCases] = useState<PatientCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [phone, setPhone] = useState('');
  const [paying, setPaying] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [message, setMessage] = useState<FeedbackMessage | null>(null);

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      if (!token) {
        throw new Error('Your session has expired. Please log in again.');
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });

      const responseText = await response.text();

      let data: any;

      try {
        data = responseText ? JSON.parse(responseText) : {};
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

  const loadCases = useCallback(async () => {
    try {
      const data = await authenticatedFetch(`${API_BASE_URL}/cases`);

      if (!Array.isArray(data)) {
        throw new Error('Unexpected case response from server.');
      }

      setCases(data);

      const payable = (data as PatientCase[]).filter(
        (item) => item.status === 'payment_pending',
      );

      setSelectedId((current) =>
        current !== null && payable.some((item) => item.id === current)
          ? current
          : payable.length > 0
            ? payable[0].id
            : null,
      );
    } catch (error) {
      console.error('Load payable cases error:', error);

      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Unable to load your cases.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authenticatedFetch]);

  useFocusEffect(
    useCallback(() => {
      loadCases();
    }, [loadCases]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadCases();
  };

  const payableCases = cases.filter((item) => item.status === 'payment_pending');
  const selectedCase =
    payableCases.find((item) => item.id === selectedId) ?? null;

  const handlePay = async () => {
    if (!selectedCase || paying || simulating) return;

    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      setMessage({
        type: 'error',
        text: 'Enter a valid Safaricom number, for example 0712345678.',
      });
      return;
    }

    setPaying(true);
    setMessage(null);

    try {
      const data = await authenticatedFetch(`${API_BASE_URL}/mpesa/initiate`, {
        method: 'POST',
        body: JSON.stringify({
          case_id: selectedCase.id,
          phone_number: normalizedPhone,
        }),
      });

      setMessage({
        type: 'info',
        text:
          data.message ||
          'M-Pesa request sent. Check your phone and enter your PIN to complete the payment.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Unable to start the M-Pesa payment.',
      });
    } finally {
      setPaying(false);
    }
  };

  const runSimulation = async () => {
    if (!selectedCase) return;

    setSimulating(true);
    setMessage(null);

    try {
      const data = await authenticatedFetch(`${API_BASE_URL}/mpesa/simulate`, {
        method: 'POST',
        body: JSON.stringify({
          case_id: selectedCase.id,
          outcome: 'success',
        }),
      });

      setMessage({
        type: 'success',
        text:
          `Payment successful via M-Pesa (simulated) for Case #${selectedCase.id}: ` +
          `${formatAmount(data.amount ?? selectedCase.payment_amount)}. ` +
          'No money was transferred. The case is now paid and ready for hospital staff to close.',
      });

      await loadCases();
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Payment simulation failed.',
      });
    } finally {
      setSimulating(false);
    }
  };

  const handleSimulate = () => {
    if (!selectedCase || paying || simulating) return;

    Alert.alert(
      'Simulate payment',
      `This is for testing only. No money moves. Mark Case #${selectedCase.id} as paid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Simulate', onPress: runSimulation },
      ],
    );
  };

  const messageColor =
    message?.type === 'success'
      ? COLORS.green
      : message?.type === 'info'
        ? COLORS.warning
        : COLORS.primary;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          <View>
            <Text style={styles.title}>Payments</Text>
            <Text style={styles.subtitle}>Pay for your emergency care</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.white}
            />
          }
        >
          {loading ? (
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
              style={styles.loader}
            />
          ) : payableCases.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>💳</Text>
              <Text style={styles.emptyTitle}>Nothing to pay right now</Text>
              <Text style={styles.emptyText}>
                A case appears here once the hospital has finished treatment and
                is waiting for payment. Pull down to refresh.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionLabel}>CASES AWAITING PAYMENT</Text>

              {payableCases.map((item) => {
                const selected = item.id === selectedId;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.caseCard, selected && styles.caseCardSelected]}
                    onPress={() => {
                      setSelectedId(item.id);
                      setMessage(null);
                    }}
                  >
                    <View style={styles.caseRow}>
                      <Text style={styles.caseNumber}>CASE #{item.id}</Text>
                      <Text style={styles.caseAmount}>
                        {formatAmount(item.payment_amount)}
                      </Text>
                    </View>

                    <Text style={styles.caseDetail}>
                      {item.emergency_desc || 'Medical Emergency'}
                    </Text>
                    <Text style={styles.caseDetail}>
                      Hospital: {item.hospital_name}
                    </Text>
                    <Text style={styles.caseDetail}>
                      Severity: {item.severity?.toUpperCase() || 'Not specified'}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <Text style={styles.sectionLabel}>M-PESA PHONE NUMBER</Text>

              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="0712 345 678"
                placeholderTextColor="#718198"
                keyboardType="phone-pad"
                autoCorrect={false}
                editable={!paying && !simulating}
              />

              <TouchableOpacity
                style={[
                  styles.payButton,
                  (paying || simulating || !selectedCase) &&
                    styles.disabledButton,
                ]}
                onPress={handlePay}
                disabled={paying || simulating || !selectedCase}
              >
                {paying ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.payText}>
                    Pay {selectedCase ? formatAmount(selectedCase.payment_amount) : ''} with M-Pesa
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.simulateButton,
                  (paying || simulating || !selectedCase) &&
                    styles.disabledButton,
                ]}
                onPress={handleSimulate}
                disabled={paying || simulating || !selectedCase}
              >
                {simulating ? (
                  <ActivityIndicator color={COLORS.warning} />
                ) : (
                  <Text style={styles.simulateText}>
                    Simulate Payment (For Testing)
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={styles.note}>
                Simulated payments do not move real money.
              </Text>
            </>
          )}

          {message && (
            <View
              style={[
                styles.messageBox,
                { borderColor: messageColor, backgroundColor: `${messageColor}15` },
              ]}
            >
              <Text style={[styles.messageText, { color: messageColor }]}>
                {message.text}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboard: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: COLORS.white,
    fontSize: 20,
  },
  title: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  loader: {
    marginTop: 60,
  },
  sectionLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginTop: 8,
    marginBottom: 10,
  },
  caseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  caseCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceLight,
  },
  caseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  caseNumber: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  caseAmount: {
    color: COLORS.green,
    fontWeight: '900',
    fontSize: 16,
  },
  caseDetail: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 20,
  },
  input: {
    height: 55,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#354960',
    borderRadius: 13,
    paddingHorizontal: 16,
    color: COLORS.white,
    fontSize: 14,
  },
  payButton: {
    height: 55,
    backgroundColor: COLORS.green,
    borderRadius: 13,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payText: {
    color: '#06231A',
    fontSize: 14,
    fontWeight: '900',
  },
  simulateButton: {
    height: 50,
    borderRadius: 13,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: COLORS.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simulateText: {
    color: COLORS.warning,
    fontSize: 13,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.5,
  },
  note: {
    color: '#71869D',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 12,
  },
  messageBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 28,
    alignItems: 'center',
    marginTop: 30,
  },
  emptyIcon: {
    fontSize: 42,
    marginBottom: 12,
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: 'bold',
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },
});