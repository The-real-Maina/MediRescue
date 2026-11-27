import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
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
  blue: '#3A86FF',
};

interface PatientCase {
  id: number;
  emergency_desc: string;
  status: string;
  severity: string;
  payment_amount: number | null;
  hospital_id: number;
  hospital_name: string;
  hospital_location: string;
  requested_at: string;
  dispute_status?: string | null;
}

// Statuses after which first aid help is no longer needed
const FINISHED_STATUSES = ['paid', 'closed', 'cancelled'];

export default function CaseDetails() {
  const router = useRouter();
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const caseId = Number(id);

  const [item, setItem] = useState<PatientCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadCase = useCallback(async () => {
    try {
      if (!token) {
        throw new Error('Your session has expired. Please log in again.');
      }

      if (!Number.isFinite(caseId)) {
        throw new Error('Invalid case number.');
      }

      const response = await fetch(`${API_BASE_URL}/cases`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await response.text();
      let data: any;

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Server returned an invalid response (${response.status}).`);
      }

      if (!response.ok) {
        throw new Error(
          data.error || data.message || `Request failed (${response.status}).`,
        );
      }

      if (!Array.isArray(data)) {
        throw new Error('Unexpected case response from server.');
      }

      const found = data.find((c: PatientCase) => Number(c.id) === caseId);

      if (!found) {
        throw new Error('This case could not be found.');
      }

      setItem(found);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load this case.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, caseId]);

  useFocusEffect(
    useCallback(() => {
      loadCase();
    }, [loadCase]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadCase();
  };

  const formatStatus = (status: string) =>
    String(status ?? '').replace(/_/g, ' ').toUpperCase();

  const formatDate = (date: string) => {
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime())
      ? 'Date unavailable'
      : parsed.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    if (['paid', 'closed'].includes(status)) return COLORS.green;
    if (['dispatched', 'picked_up', 'arrived_at_hospital'].includes(status)) {
      return COLORS.warning;
    }
    return COLORS.primary;
  };

  // Routes are cast to any so TypeScript typed-routes never blocks the build.
  const goTo = (pathname: string, withId = true) =>
    router.push(
      (withId
        ? { pathname, params: { id: String(caseId) } }
        : pathname) as any,
    );

  const renderRow = (label: string, value: string) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.centerText}>Loading case...</Text>
        </View>
      );
    }

    if (error && !item) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Unable to load case</Text>
          <Text style={styles.centerText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              loadCase();
            }}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!item) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Case not found</Text>
        </View>
      );
    }

    const color = getStatusColor(item.status);
    const isOngoing = !FINISHED_STATUSES.includes(item.status);
    const isDispatched = item.status === 'dispatched';
    const isPaymentPending = item.status === 'payment_pending';
    const showMessages = item.status !== 'requested';

    return (
      <>
        {!!error && <Text style={styles.inlineError}>{error}</Text>}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.caseNumber}>CASE #{item.id}</Text>
            <View style={[styles.badge, { backgroundColor: `${color}20` }]}>
              <Text style={[styles.badgeText, { color }]}>
                {formatStatus(item.status)}
              </Text>
            </View>
          </View>

          <Text style={styles.description}>
            {item.emergency_desc || 'Medical Emergency'}
          </Text>

          {renderRow('Severity', item.severity?.toUpperCase() || 'Not specified')}
          {renderRow('Hospital', item.hospital_name || 'Not available')}
          {renderRow('Location', item.hospital_location || 'Not available')}
          {renderRow(
            'Payment',
            item.payment_amount == null
              ? 'Not set'
              : `KES ${Number(item.payment_amount).toLocaleString()}`,
          )}
          {renderRow('Requested', formatDate(item.requested_at))}

          {item.dispute_status === 'open' && (
            <Text style={styles.dispute}>You have an open dispute.</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Actions</Text>

        {isDispatched && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.blue }]}
            onPress={() => goTo('/live-tracking', false)}
          >
            <Text style={styles.actionText}>📍  Track ambulance</Text>
          </TouchableOpacity>
        )}

        {isPaymentPending && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.green }]}
            onPress={() => goTo('/payments', false)}
          >
            <Text style={styles.actionText}>💳  Pay now</Text>
          </TouchableOpacity>
        )}

        {isOngoing && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
            onPress={() => goTo('/first-aid-chat')}
          >
            <Text style={styles.actionText}>🩹  First Aid Assistance</Text>
          </TouchableOpacity>
        )}

        {showMessages && (
          <TouchableOpacity
            style={[styles.actionButton, styles.outlineButton]}
            onPress={() => goTo('/case-chat')}
          >
            <Text style={styles.actionText}>
              💬  {isDispatched ? 'Message driver' : 'View messages'}
            </Text>
          </TouchableOpacity>
        )}

        {!isOngoing && !isPaymentPending && (
          <Text style={styles.note}>
            This case is complete. No further action is needed.
          </Text>
        )}

        {item.status === 'requested' && (
          <Text style={styles.note}>
            Your request is waiting for an ambulance to be dispatched. Pull
            down to refresh.
          </Text>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Case Details</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.white}
          />
        }
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: COLORS.white, fontSize: 18 },
  topTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  container: { padding: 20, paddingBottom: 40, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  centerText: { color: COLORS.muted, marginTop: 12, fontSize: 13, textAlign: 'center' },
  errorTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  inlineError: { color: COLORS.warning, fontSize: 12, marginBottom: 12 },
  retryButton: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  retryText: { color: COLORS.primary, fontWeight: 'bold' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  caseNumber: { color: COLORS.white, fontWeight: 'bold', fontSize: 15 },
  badge: { borderRadius: 15, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  description: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  rowLabel: { color: COLORS.muted, fontSize: 12 },
  rowValue: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  dispute: { color: COLORS.warning, fontSize: 12, marginTop: 12 },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 26,
    marginBottom: 12,
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionText: { color: COLORS.white, fontSize: 14, fontWeight: 'bold' },
  note: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },
});