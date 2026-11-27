import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/services/AuthContext';
import {
  assignmentService,
  type CaseOffer,
} from '@/services/assignmentService';

const COLORS = {
  background: '#081321',
  surface: '#122238',
  surfaceLight: '#1A304A',
  primary: '#E63946',
  white: '#FFFFFF',
  muted: '#9FB0C3',
  green: '#35C98A',
  border: '#263C54',
  yellow: '#F2C879',
};

type DriverAction = 'accept' | 'decline' | 'pickup' | 'arrive';

export default function DriverDashboard() {
  const router = useRouter();
  const { user, token, signOut } = useAuth();

  const [offers, setOffers] = useState<CaseOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionCaseId, setActionCaseId] = useState<number | null>(null);
  const [offerError, setOfferError] = useState('');

  const driverName = user?.name?.trim() || 'Driver';

  const initials = driverName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  const loadOffers = useCallback(
    async (showLoading = false) => {
      if (!token) {
        setOfferError('Your session has expired. Please log in again.');
        setLoadingOffers(false);
        return;
      }

      if (showLoading) {
        setLoadingOffers(true);
      }

      try {
        const data = await assignmentService.getMyOffers(token);
        setOffers(data);
        setOfferError('');
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to retrieve assignments.';
        setOfferError(message);
      } finally {
        setLoadingOffers(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      void loadOffers(true);
    }, 0);

    const interval = setInterval(() => {
      void loadOffers();
    }, 10000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [loadOffers]);

  const performAction = async (caseId: number, action: DriverAction) => {
    if (!token) {
      Alert.alert('Session expired', 'Please log in again.');
      return;
    }

    setActionCaseId(caseId);

    try {
      switch (action) {
        case 'accept':
          await assignmentService.acceptCase(caseId, token);
          break;
        case 'decline':
          await assignmentService.declineCase(caseId, token);
          break;
        case 'pickup':
          await assignmentService.markPickup(caseId, token);
          break;
        case 'arrive':
          await assignmentService.markArrived(caseId, token);
          break;
      }

      setOffers((current) =>
        current.filter((offer) => offer.id !== caseId || action !== 'decline'),
      );

      const successMessage: Record<DriverAction, string> = {
        accept: 'You have accepted this emergency assignment.',
        decline: 'The emergency request has been returned to hospital staff.',
        pickup: 'Patient pickup confirmed. Proceed to the hospital.',
        arrive: 'Arrival confirmed. Awaiting hospital handover.',
      };

      Alert.alert(
        action === 'accept'
          ? 'Case accepted'
          : action === 'decline'
            ? 'Case declined'
            : action === 'pickup'
              ? 'Pickup confirmed'
              : 'Arrival confirmed',
        successMessage[action],
      );

      await loadOffers();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to process this assignment.';
      Alert.alert('Assignment unsuccessful', message);
      await loadOffers();
    } finally {
      setActionCaseId(null);
    }
  };

  const confirmAction = (caseId: number, action: DriverAction) => {
    const isAccept = action === 'accept';
    const isDecline = action === 'decline';

    const titles: Record<DriverAction, string> = {
      accept: 'Accept emergency?',
      decline: 'Decline emergency?',
      pickup: 'Confirm patient pickup?',
      arrive: 'Confirm hospital arrival?',
    };

    const bodies: Record<DriverAction, string> = {
      accept: 'Are you ready to respond to this emergency?',
      decline:
        'Are you sure you want to return this request to hospital staff?',
      pickup: 'Confirm the patient is now on board your ambulance.',
      arrive: 'Confirm you have arrived at the hospital with the patient.',
    };

    const buttons: Record<DriverAction, string> = {
      accept: 'Accept Case',
      decline: 'Decline Case',
      pickup: 'Confirm Pickup',
      arrive: 'Confirm Arrival',
    };

    Alert.alert(titles[action], bodies[action], [
      { text: 'Cancel', style: 'cancel' },
      {
        text: buttons[action],
        style: isDecline ? 'destructive' : isAccept ? 'default' : 'default',
        onPress: () => {
          void performAction(caseId, action);
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/');
          } catch {
            Alert.alert(
              'Logout failed',
              'Unable to end your session. Please try again.',
            );
          }
        },
      },
    ]);
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    if (Number.isNaN(date.getTime())) return deadline;
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCoordinates = (
    latitude: number | string | null,
    longitude: number | string | null,
  ) => {
    if (latitude === null || longitude === null) {
      return 'Pickup coordinates unavailable';
    }
    return `${latitude}, ${longitude}`;
  };

  const renderActionButtons = (offer: CaseOffer) => {
    const status = (offer.status || 'assigned').toLowerCase();
    const busy = actionCaseId !== null;

    if (status === 'assigned' || status === 'pending') {
      return (
        <View style={styles.offerActions}>
          <TouchableOpacity
            style={[styles.acceptButton, busy && styles.disabledButton]}
            disabled={busy}
            onPress={() => confirmAction(offer.id, 'accept')}
          >
            {actionCaseId === offer.id ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.actionButtonText}>Accept Case</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.declineButton, busy && styles.disabledButton]}
            disabled={busy}
            onPress={() => confirmAction(offer.id, 'decline')}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (status === 'accepted') {
      return (
        <View style={styles.offerActions}>
          <TouchableOpacity
            style={[styles.acceptButton, busy && styles.disabledButton]}
            disabled={busy}
            onPress={() => confirmAction(offer.id, 'pickup')}
          >
            {actionCaseId === offer.id ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.actionButtonText}>Confirm Pickup</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    if (status === 'picked_up' || status === 'en_route') {
      return (
        <View style={styles.offerActions}>
          <TouchableOpacity
            style={[styles.acceptButton, busy && styles.disabledButton]}
            disabled={busy}
            onPress={() => confirmAction(offer.id, 'arrive')}
          >
            {actionCaseId === offer.id ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.actionButtonText}>Confirm Arrival</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.offerActions}>
        <View style={styles.statusOnlyBadge}>
          <Text style={styles.statusOnlyText}>
            {status.replace(/_/g, ' ').toUpperCase()}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>
              Medi<Text style={styles.brandAccent}>Rescue</Text>
            </Text>
            <Text style={styles.subtitle}>AMBULANCE DRIVER PORTAL</Text>
          </View>

          <TouchableOpacity
            style={styles.avatar}
            onPress={() => router.push('/profile')}
          >
            <Text style={styles.avatarText}>{initials || 'D'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.welcome}>
          <Text style={styles.welcomeTitle}>Welcome, {driverName} 🚑</Text>
          <Text style={styles.welcomeSubtitle}>
            Stay ready. Every second matters.
          </Text>
        </View>

        <View style={styles.availabilityCard}>
          <View>
            <Text style={styles.availabilityLabel}>DUTY STATUS</Text>
            <Text style={styles.availabilityTitle}>Ready for response</Text>
            <Text style={styles.availabilityDescription}>
              Your availability will sync with your hospital.
            </Text>
          </View>

          <View style={styles.availableBadge}>
            <View style={styles.availableDot} />
            <Text style={styles.availableText}>READY</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Emergency Assignments</Text>

            <TouchableOpacity
              onPress={() => {
                setRefreshing(true);
                void loadOffers();
              }}
              disabled={refreshing}
              style={styles.refreshButton}
            >
              {refreshing ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.refreshText}>↻ Refresh</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionHint}>
            Incoming emergency requests from your hospital
          </Text>
        </View>

        {loadingOffers && offers.length === 0 ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={styles.emptyText}>Loading your assignments...</Text>
          </View>
        ) : offerError && offers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>⚠️</Text>
            <Text style={styles.emptyTitle}>Unable to load assignments</Text>
            <Text style={styles.emptyText}>{offerError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                void loadOffers(true);
              }}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : offers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No incoming assignments</Text>
            <Text style={styles.emptyText}>
              New emergency requests will appear here automatically.
            </Text>
            <Text style={styles.pollingText}>
              Checking for new requests every 10 seconds.
            </Text>
          </View>
        ) : (
          offers.map((offer) => {
            const status = (offer.status || 'assigned').toLowerCase();
            const isPending = status === 'assigned' || status === 'pending';
            return (
              <View key={offer.id} style={styles.offerCard}>
                <View style={styles.offerHeader}>
                  <View>
                    <Text style={styles.caseNumber}>
                      EMERGENCY CASE #{offer.id}
                    </Text>
                    <Text style={styles.offerStatus}>
                      {isPending
                        ? 'AWAITING RESPONSE'
                        : status.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.severityBadge}>
                    <Text style={styles.severityText}>
                      {(offer.severity || 'UNSPECIFIED').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.emergencyLabel}>
                  EMERGENCY DESCRIPTION
                </Text>
                <Text style={styles.emergencyDescription}>
                  {offer.emergency_desc || 'No description provided.'}
                </Text>

                <View style={styles.offerDetail}>
                  <Text style={styles.detailLabel}>📍 PICKUP LOCATION</Text>
                  <Text style={styles.detailValue}>
                    {formatCoordinates(offer.pickup_lat, offer.pickup_lng)}
                  </Text>
                </View>

                <View style={styles.offerDetail}>
                  <Text style={styles.detailLabel}>⏱ RESPONSE DEADLINE</Text>
                  <Text style={styles.deadlineValue}>
                    {formatDeadline(offer.accept_deadline)}
                  </Text>
                </View>

                {renderActionButtons(offer)}
              </View>
            );
          })
        )}

        {offerError !== '' && offers.length > 0 && (
          <Text style={styles.backgroundError}>
            Refresh warning: {offerError}
          </Text>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Response Operations</Text>
          <Text style={styles.sectionHint}>Manage your ambulance duties</Text>
        </View>

        <TouchableOpacity
          style={styles.assignmentCard}
          onPress={() => router.push('/driver-assignments')}
        >
          <View style={styles.assignmentIcon}>
            <Text style={styles.iconText}>📋</Text>
          </View>
          <View style={styles.assignmentContent}>
            <Text style={styles.cardTitle}>My Assignments</Text>
            <Text style={styles.cardDescription}>
              View incoming and active emergency cases.
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.assignmentCard}
          onPress={() => router.push('/driver-patient-info')}
        >
          <View style={styles.assignmentIcon}>
            <Text style={styles.iconText}>🩺</Text>
          </View>
          <View style={styles.assignmentContent}>
            <Text style={styles.cardTitle}>Patient Information</Text>
            <Text style={styles.cardDescription}>
              Access essential information for assigned cases.
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.assignmentCard}
          onPress={() => router.push('/driver-navigation')}
        >
          <View style={styles.assignmentIcon}>
            <Text style={styles.iconText}>📍</Text>
          </View>
          <View style={styles.assignmentContent}>
            <Text style={styles.cardTitle}>Navigation & Tracking</Text>
            <Text style={styles.cardDescription}>
              View patient locations and ambulance routes.
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.assignmentCard}
          onPress={() => router.push('/driver-ambulance-status')}
        >
          <View style={styles.assignmentIcon}>
            <Text style={styles.iconText}>🚑</Text>
          </View>
          <View style={styles.assignmentContent}>
            <Text style={styles.cardTitle}>Ambulance Status</Text>
            <Text style={styles.cardDescription}>
              Update your vehicle&apos;s operational status.
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.emergencyNotice}>
          <Text style={styles.noticeIcon}>⚠️</Text>
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>
              Emergency response matters
            </Text>
            <Text style={styles.noticeDescription}>
              Keep your location services enabled and remain reachable while
              on duty.
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          MediRescue © 2026 • Saving lives through faster response.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 20, paddingBottom: 35 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  brand: { color: COLORS.white, fontSize: 27, fontWeight: '900' },
  brandAccent: { color: COLORS.primary },
  subtitle: {
    color: COLORS.muted,
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  welcome: { marginBottom: 25 },
  welcomeTitle: { color: COLORS.white, fontSize: 24, fontWeight: 'bold' },
  welcomeSubtitle: { color: COLORS.muted, fontSize: 13, marginTop: 7 },
  availabilityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 17,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  availabilityLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  availabilityTitle: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 8,
  },
  availabilityDescription: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 6,
    maxWidth: 200,
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#173E36',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },
  availableDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.green,
    marginRight: 6,
  },
  availableText: { color: COLORS.green, fontSize: 9, fontWeight: 'bold' },
  sectionHeader: { marginBottom: 15, marginTop: 5 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  sectionHint: { color: COLORS.muted, fontSize: 12, marginTop: 5 },
  refreshButton: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginLeft: 8,
  },
  refreshText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
    alignItems: 'center',
    marginBottom: 25,
  },
  emptyIcon: { fontSize: 28, marginBottom: 10 },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 9,
  },
  pollingText: { color: COLORS.green, fontSize: 10, marginTop: 13 },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 9,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 15,
  },
  retryText: { color: COLORS.white, fontSize: 12, fontWeight: 'bold' },
  offerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: 16,
    marginBottom: 15,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  caseNumber: { color: COLORS.white, fontSize: 13, fontWeight: '900' },
  offerStatus: {
    color: COLORS.yellow,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 5,
  },
  severityBadge: {
    backgroundColor: '#4B2931',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  severityText: { color: '#FF9CA4', fontSize: 9, fontWeight: '900' },
  emergencyLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  emergencyDescription: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
    marginBottom: 15,
  },
  offerDetail: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 9,
    padding: 11,
    marginBottom: 9,
  },
  detailLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '800' },
  detailValue: { color: COLORS.white, fontSize: 11, marginTop: 6 },
  deadlineValue: {
    color: COLORS.yellow,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 6,
  },
  offerActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  acceptButton: {
    flex: 1,
    backgroundColor: COLORS.green,
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  declineButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  actionButtonText: { color: '#071B17', fontSize: 12, fontWeight: '900' },
  declineButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  disabledButton: { opacity: 0.5 },
  statusOnlyBadge: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
  },
  statusOnlyText: {
    color: COLORS.yellow,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  backgroundError: {
    color: '#FF9CA4',
    fontSize: 11,
    marginBottom: 15,
  },
  assignmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    marginBottom: 12,
  },
  assignmentIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 21 },
  assignmentContent: { flex: 1, marginLeft: 13 },
  cardTitle: { color: COLORS.white, fontSize: 14, fontWeight: 'bold' },
  cardDescription: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 5,
  },
  arrow: { color: COLORS.muted, fontSize: 27, marginLeft: 8 },
  emergencyNotice: {
    flexDirection: 'row',
    backgroundColor: '#332C20',
    borderWidth: 1,
    borderColor: '#66502E',
    borderRadius: 14,
    padding: 15,
    marginTop: 15,
  },
  noticeIcon: { fontSize: 22, marginRight: 12 },
  noticeContent: { flex: 1 },
  noticeTitle: { color: '#F2C879', fontSize: 12, fontWeight: 'bold' },
  noticeDescription: {
    color: '#C5B99F',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 25,
  },
  logoutText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },
  footer: {
    color: '#687B90',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 25,
  },
});