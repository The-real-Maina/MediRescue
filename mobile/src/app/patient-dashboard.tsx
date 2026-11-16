
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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
  hospital_id: number;
  hospital_name: string;
  hospital_location: string;
  requested_at: string;
  dispute_status?: string | null;
}

interface EmergencyResponse {
  message: string;
  case_id: number;
  status: string;
  severity: string;
  payment_amount: number | null;
  hospital: {
    id: number;
    name: string;
    location: string;
  };
  distance_km: number;
  rerouted: boolean;
  original_nearest_hospital?: {
    id: number;
    name: string;
    location: string;
    distance_km: number;
  };
  no_available_ambulance: boolean;
}

export default function PatientDashboard() {
  const router = useRouter();
  const { user, token, signOut } = useAuth();

  const [cases, setCases] = useState<PatientCase[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingSOS, setSendingSOS] = useState(false);
  const [casesVisible, setCasesVisible] = useState(false);
  const [latestEmergency, setLatestEmergency] =
    useState<EmergencyResponse | null>(null);

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
        throw new Error('Unexpected case-history response from server.');
      }

      setCases(data);
    } catch (error) {
      console.error('Load patient cases error:', error);

      Alert.alert(
        'Unable to load cases',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setLoadingCases(false);
      setRefreshing(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadCases();
  };

  const submitSOS = async () => {
    if (sendingSOS) return;

    setSendingSOS(true);

    try {
      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        Alert.alert(
          'Location permission required',
          'MediRescue needs access to your phone location to send an ambulance to the correct pickup point.',
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const pickupLat = location.coords.latitude;
      const pickupLng = location.coords.longitude;

      const result = (await authenticatedFetch(`${API_BASE_URL}/cases`, {
        method: 'POST',
        body: JSON.stringify({
          emergency_type: 'Medical Emergency',
          emergency_desc: 'Patient requested emergency ambulance',
          pickup_lat: pickupLat,
          pickup_lng: pickupLng,
          severity: 'moderate',
        }),
      })) as EmergencyResponse;

      setLatestEmergency(result);

      await loadCases();

      Alert.alert(
        'Emergency request recorded',
        [
          `Case number: #${result.case_id}`,
          `Hospital: ${result.hospital.name}`,
          `Distance: ${result.distance_km} km`,
          `Status: ${result.status.replace(/_/g, ' ').toUpperCase()}`,
          '',
          result.rerouted
            ? 'Your request was redirected to a hospital with a dispatch-ready ambulance.'
            : '',
          result.no_available_ambulance
            ? 'WARNING: No hospital currently has a dispatch-ready ambulance. Urgent control-room assistance is required.'
            : '',
          result.message,
        ]
          .filter(Boolean)
          .join('\n'),
        [{ text: 'OK' }],
      );
    } catch (error) {
      console.error('SOS request error:', error);

      Alert.alert(
        'Emergency request failed',
        error instanceof Error
          ? error.message
          : 'Unable to send your emergency request. Please try again.',
      );
    } finally {
      setSendingSOS(false);
    }
  };

  const handleSOS = () => {
    if (sendingSOS) return;

    Alert.alert(
      'Confirm Emergency SOS',
      'This will obtain your current GPS location and create a REAL emergency request in MediRescue. Only continue if you genuinely need emergency assistance.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send Emergency SOS',
          style: 'destructive',
          onPress: submitSOS,
        },
      ],
    );
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
          } catch (error) {
            Alert.alert(
              'Logout failed',
              'Unable to clear your session. Please try again.',
            );
          }
        },
      },
    ]);
  };

  const formatStatus = (status: string) =>
    status.replace(/_/g, ' ').toUpperCase();

  const formatDate = (date: string) => {
    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return 'Date unavailable';

    return parsed.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    if (['paid', 'closed'].includes(status)) return COLORS.green;

    if (
      ['dispatched', 'picked_up', 'arrived_at_hospital'].includes(status)
    ) {
      return COLORS.warning;
    }

    return COLORS.primary;
  };

  const latestCase = cases.length > 0 ? cases[0] : null;

  const renderCase = (item: PatientCase) => (
    <View key={item.id} style={styles.caseCard}>
      <View style={styles.caseHeader}>
        <Text style={styles.caseNumber}>CASE #{item.id}</Text>

        <View
          style={[
            styles.caseStatusBadge,
            { backgroundColor: `${getStatusColor(item.status)}20` },
          ]}
        >
          <Text
            style={[
              styles.caseStatusText,
              { color: getStatusColor(item.status) },
            ]}
          >
            {formatStatus(item.status)}
          </Text>
        </View>
      </View>

      <Text style={styles.caseDescription}>
        {item.emergency_desc || 'Medical Emergency'}
      </Text>

      <Text style={styles.caseDetail}>
        Hospital: {item.hospital_name}
      </Text>

      <Text style={styles.caseDetail}>
        Location: {item.hospital_location || 'Not available'}
      </Text>

      <Text style={styles.caseDetail}>
        Severity: {item.severity?.toUpperCase() || 'Not specified'}
      </Text>

      <Text style={styles.caseDetail}>
        Payment: {item.payment_amount == null
          ? 'Not set'
          : `KES ${Number(item.payment_amount).toLocaleString()}`}
      </Text>

      <Text style={styles.caseDate}>
        Requested: {formatDate(item.requested_at)}
      </Text>

      {item.dispute_status === 'open' && (
        <Text style={styles.disputeNotice}>You have an open dispute.</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

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
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>
              Medi<Text style={styles.brandAccent}>Rescue</Text>
            </Text>
            <Text style={styles.subtitle}>PATIENT PORTAL</Text>
          </View>

          <TouchableOpacity
            style={styles.profileButton}
            onPress={() =>
              Alert.alert(
                'My Profile',
                `Name: ${user?.name || 'Patient'}\nRole: ${user?.role || 'patient'}`,
              )
            }
          >
            <Text style={styles.profileInitial}>
              {(user?.name || 'P').charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.welcome}>
          <Text style={styles.welcomeTitle}>
            Hello, {user?.name || 'Patient'} 👋
          </Text>
          <Text style={styles.welcomeSubtitle}>
            Your health and safety come first.
          </Text>
        </View>

        <View style={styles.emergencyCard}>
          <View style={styles.emergencyHeader}>
            <View>
              <Text style={styles.emergencyTitle}>
                Need emergency help?
              </Text>
              <Text style={styles.emergencySubtitle}>
                Request an ambulance using your phone's GPS location.
              </Text>
            </View>

            <Text style={styles.emergencyIcon}>🚑</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.sosButton,
              sendingSOS && styles.disabledButton,
            ]}
            onPress={handleSOS}
            disabled={sendingSOS}
          >
            {sendingSOS ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.sosText}>
                SOS  •  REQUEST AMBULANCE
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.emergencyNote}>
            Only use SOS for genuine medical emergencies.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <Text style={styles.sectionHint}>
            Your MediRescue services
          </Text>
        </View>

        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => setCasesVisible(true)}
          >
            <Text style={styles.featureIcon}>📋</Text>
            <Text style={styles.featureTitle}>My Cases</Text>
            <Text style={styles.featureDescription}>
              View emergency requests
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureCard}
            onPress={() =>
              Alert.alert(
                'Live Tracking',
                'Ambulance live tracking will be connected in the next stage.',
              )
            }
          >
            <Text style={styles.featureIcon}>📍</Text>
            <Text style={styles.featureTitle}>Live Tracking</Text>
            <Text style={styles.featureDescription}>
              Track your ambulance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureCard}
            onPress={() =>
              Alert.alert(
                'Health Profile',
                'Your health profile will be connected in the next stage.',
              )
            }
          >
            <Text style={styles.featureIcon}>🩺</Text>
            <Text style={styles.featureTitle}>Health Profile</Text>
            <Text style={styles.featureDescription}>
              Your medical information
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureCard}
            onPress={() =>
              Alert.alert(
                'Payments',
                'Payment records will be connected in the next stage.',
              )
            }
          >
            <Text style={styles.featureIcon}>💳</Text>
            <Text style={styles.featureTitle}>Payments</Text>
            <Text style={styles.featureDescription}>
              View payment records
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Emergency Status</Text>

            <View
              style={[
                styles.statusBadge,
                latestCase
                  ? { backgroundColor: `${getStatusColor(latestCase.status)}20` }
                  : null,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: latestCase
                      ? getStatusColor(latestCase.status)
                      : COLORS.green,
                  },
                ]}
              />

              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color: latestCase
                      ? getStatusColor(latestCase.status)
                      : COLORS.green,
                  },
                ]}
              >
                {latestCase
                  ? formatStatus(latestCase.status)
                  : 'READY'}
              </Text>
            </View>
          </View>

          {loadingCases ? (
            <ActivityIndicator
              color={COLORS.white}
              style={styles.statusLoader}
            />
          ) : latestCase ? (
            <>
              <Text style={styles.statusDescription}>
                Latest case: #{latestCase.id}
              </Text>
              <Text style={styles.statusDescription}>
                Hospital: {latestCase.hospital_name}
              </Text>
            </>
          ) : (
            <Text style={styles.statusDescription}>
              You currently have no emergency requests.
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          MediRescue © 2026 • Emergency care, connected.
        </Text>
      </ScrollView>

      <Modal
        visible={casesVisible}
        animationType="slide"
        onRequestClose={() => setCasesVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>My Cases</Text>
              <Text style={styles.modalSubtitle}>
                Your emergency request history
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setCasesVisible(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loadingCases ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading your cases...</Text>
            </View>
          ) : cases.length === 0 ? (
            <View style={styles.centerContent}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No cases found</Text>
              <Text style={styles.emptyText}>
                Your emergency requests will appear here.
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.caseList}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={COLORS.white}
                />
              }
            >
              {cases.map(renderCase)}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 20,
    paddingBottom: 35,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  brand: {
    color: COLORS.white,
    fontSize: 27,
    fontWeight: '900',
  },
  brandAccent: {
    color: COLORS.primary,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 3,
  },
  profileButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileInitial: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  welcome: {
    marginBottom: 25,
  },
  welcomeTitle: {
    color: COLORS.white,
    fontSize: 25,
    fontWeight: 'bold',
  },
  welcomeSubtitle: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 7,
  },
  emergencyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#57303B',
    marginBottom: 30,
  },
  emergencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  emergencyTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    maxWidth: 230,
  },
  emergencySubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
    maxWidth: 240,
  },
  emergencyIcon: {
    fontSize: 35,
  },
  sosButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 17,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 54,
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  sosText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  emergencyNote: {
    color: COLORS.muted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 12,
  },
  sectionHeader: {
    marginBottom: 15,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: 'bold',
  },
  sectionHint: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  featureCard: {
    width: '48%',
    minHeight: 145,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureIcon: {
    fontSize: 25,
    marginBottom: 13,
  },
  featureTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  featureDescription: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },
  statusCard: {
    backgroundColor: COLORS.surface,
    padding: 17,
    borderRadius: 16,
    marginTop: 25,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#173E36',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    maxWidth: '100%',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusDescription: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 13,
  },
  statusLoader: {
    marginTop: 15,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 25,
  },
  logoutText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  footer: {
    color: '#687B90',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 25,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: 23,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: COLORS.white,
    fontSize: 18,
  },
  caseList: {
    padding: 18,
    paddingBottom: 40,
  },
  caseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  caseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  caseNumber: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  caseStatusBadge: {
    borderRadius: 15,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  caseStatusText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  caseDescription: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 10,
  },
  caseDetail: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 20,
  },
  caseDate: {
    color: '#71869D',
    fontSize: 10,
    marginTop: 12,
  },
  disputeNotice: {
    color: COLORS.warning,
    fontSize: 11,
    marginTop: 10,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    color: COLORS.muted,
    marginTop: 15,
    fontSize: 13,
  },
  emptyIcon: {
    fontSize: 45,
    marginBottom: 15,
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyText: {
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 8,
    fontSize: 13,
  },
});
