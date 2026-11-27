import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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

const EMERGENCY_TYPES = ['Accident', 'Medical Emergency', 'Injury', 'Other'];

const SEVERITIES = [
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

interface Coordinates {
  lat: number;
  lng: number;
}

interface NearestHospital {
  name: string;
  location: string;
  distance_km: number;
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
  no_available_ambulance: boolean;
}

type LocationState = 'loading' | 'ready' | 'error';
type HospitalState = 'idle' | 'loading' | 'ready' | 'error';

export default function RequestEmergencyScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [emergencyType, setEmergencyType] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('moderate');
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [locationState, setLocationState] = useState<LocationState>('loading');
  const [locationError, setLocationError] = useState('');
  const [hospital, setHospital] = useState<NearestHospital | null>(null);
  const [hospitalState, setHospitalState] = useState<HospitalState>('idle');
  const [submitting, setSubmitting] = useState(false);

  const loadNearestHospital = useCallback(
    async (position: Coordinates) => {
      if (!token) {
        setHospitalState('error');
        return;
      }

      setHospitalState('loading');
      setHospital(null);

      try {
        const response = await fetch(`${API_BASE_URL}/cases/nearest-hospital`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            pickup_lat: position.lat,
            pickup_lng: position.lng,
          }),
        });

        const responseText = await response.text();

        let data: any;

        try {
          data = responseText ? JSON.parse(responseText) : {};
        } catch {
          throw new Error(`Invalid server response (${response.status}).`);
        }

        if (!response.ok || !data.hospital) {
          throw new Error(data.error || `Request failed (${response.status}).`);
        }

        setHospital({
          name: data.hospital.name,
          location: data.hospital.location,
          distance_km: Number(data.distance_km),
        });
        setHospitalState('ready');
      } catch (error) {
        console.error('Nearest hospital error:', error);
        setHospitalState('error');
      }
    },
    [token],
  );

  const detectLocation = useCallback(async () => {
    setLocationState('loading');
    setLocationError('');
    setHospital(null);
    setHospitalState('idle');

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setLocationState('error');
        setLocationError(
          'Location permission is required so the nearest hospital can be found. Allow location for this app in your phone settings, then try again.',
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const detected = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      setCoords(detected);
      setLocationState('ready');

      loadNearestHospital(detected);
    } catch (error) {
      console.error('Location error:', error);

      setLocationState('error');
      setLocationError(
        'Your current location could not be determined. Make sure location is turned on and try again.',
      );
    }
  }, [loadNearestHospital]);

  // Fixed: Wrapped in setTimeout to prevent synchronous setState warning
  useEffect(() => {
    const timer = setTimeout(() => {
      detectLocation();
    }, 0);
    return () => clearTimeout(timer);
  }, [detectLocation]);

  const submitRequest = async () => {
    if (submitting) return;

    if (!emergencyType) {
      Alert.alert('Emergency type', 'Please select the type of emergency.');
      return;
    }

    if (!coords) {
      Alert.alert(
        'Location needed',
        'Please wait for your location to be detected, or tap "Try again".',
      );
      return;
    }

    if (!token) {
      Alert.alert(
        'Session expired',
        'Your session has expired. Please log in again.',
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/cases`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          emergency_type: emergencyType,
          emergency_desc: description.trim(),
          severity,
          pickup_lat: coords.lat,
          pickup_lng: coords.lng,
        }),
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

      const result = data as EmergencyResponse;

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
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (error) {
      console.error('Emergency request error:', error);

      Alert.alert(
        'Emergency request failed',
        error instanceof Error
          ? error.message
          : 'Unable to send your emergency request. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>Request Emergency Help</Text>
          <Text style={styles.subtitle}>Tell us what has happened</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel}>01  EMERGENCY DETAILS</Text>

          <Text style={styles.label}>Emergency type</Text>
          <View style={styles.chipRow}>
            {EMERGENCY_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.chip,
                  emergencyType === type && styles.chipSelected,
                ]}
                onPress={() => setEmergencyType(type)}
              >
                <Text
                  style={[
                    styles.chipText,
                    emergencyType === type && styles.chipTextSelected,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.textarea}
            value={description}
            onChangeText={setDescription}
            placeholder="Briefly describe what happened..."
            placeholderTextColor="#718198"
            multiline
            maxLength={500}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Severity</Text>
          <View style={styles.chipRow}>
            {SEVERITIES.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.chip,
                  severity === item.value && styles.chipSelected,
                ]}
                onPress={() => setSeverity(item.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    severity === item.value && styles.chipTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.helpText}>
            Choose the level that best describes the emergency. Hospital staff
            will assess your actual urgency.
          </Text>

          <Text style={[styles.sectionLabel, styles.sectionSpacing]}>
            02  YOUR LOCATION
          </Text>

          <View style={styles.locationCard}>
            {locationState === 'loading' && (
              <View style={styles.locationRow}>
                <ActivityIndicator color={COLORS.white} />
                <Text style={styles.locationText}>
                  Detecting your current location...
                </Text>
              </View>
            )}

            {locationState === 'ready' && coords && (
              <>
                <View style={styles.locationRow}>
                  <View style={styles.readyDot} />
                  <Text style={styles.locationReady}>Location detected</Text>
                </View>
                <Text style={styles.coordsText}>
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </Text>
              </>
            )}

            {locationState === 'error' && (
              <Text style={styles.locationErrorText}>{locationError}</Text>
            )}

            {locationState !== 'loading' && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={detectLocation}
              >
                <Text style={styles.retryText}>
                  {locationState === 'ready' ? 'Refresh location' : 'Try again'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {locationState === 'ready' && (
            <View style={styles.hospitalCard}>
              <Text style={styles.hospitalLabel}>NEAREST HOSPITAL</Text>

              {hospitalState === 'loading' && (
                <View style={styles.locationRow}>
                  <ActivityIndicator color={COLORS.white} />
                  <Text style={styles.locationText}>
                    Finding the nearest hospital...
                  </Text>
                </View>
              )}

              {hospitalState === 'ready' && hospital && (
                <>
                  <View style={styles.hospitalRow}>
                    <Text style={styles.hospitalIcon}>🏥</Text>

                    <View style={styles.hospitalInfo}>
                      <Text style={styles.hospitalName}>{hospital.name}</Text>
                      {!!hospital.location && (
                        <Text style={styles.hospitalLocation}>
                          {hospital.location}
                        </Text>
                      )}
                    </View>

                    <View style={styles.distanceBadge}>
                      <Text style={styles.distanceText}>
                        {hospital.distance_km} km
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.hospitalNote}>
                    Your request may be sent to another nearby hospital if this
                    one has no ambulance ready. You will see the final hospital
                    once the request is sent.
                  </Text>
                </>
              )}

              {hospitalState === 'error' && (
                <>
                  <Text style={styles.locationErrorText}>
                    Could not find the nearest hospital right now. You can still
                    send your request.
                  </Text>

                  {coords && (
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={() => loadNearestHospital(coords)}
                    >
                      <Text style={styles.retryText}>Try again</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              (submitting || locationState !== 'ready') &&
                styles.disabledButton,
            ]}
            onPress={submitRequest}
            disabled={submitting || locationState !== 'ready'}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitText}>SEND EMERGENCY REQUEST</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.note}>
            This creates a real emergency request. Only use it for genuine
            medical emergencies.
          </Text>
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  container: {
    padding: 20,
    paddingBottom: 50,
  },
  sectionLabel: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  sectionSpacing: {
    marginTop: 30,
  },
  label: {
    color: '#B9C9D9',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#354960',
    backgroundColor: COLORS.surface,
  },
  chipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#3A1E2C',
  },
  chipText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: COLORS.white,
  },
  textarea: {
    minHeight: 100,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#354960',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.white,
    fontSize: 14,
  },
  helpText: {
    color: '#71869D',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 10,
  },
  locationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginTop: 8,
    gap: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  readyDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.green,
  },
  locationReady: {
    color: COLORS.green,
    fontSize: 13,
    fontWeight: '700',
  },
  coordsText: {
    color: COLORS.muted,
    fontSize: 12,
  },
  locationErrorText: {
    color: COLORS.warning,
    fontSize: 12,
    lineHeight: 19,
  },
  retryButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#354960',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  hospitalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginTop: 12,
    gap: 12,
  },
  hospitalLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  hospitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hospitalIcon: {
    fontSize: 28,
  },
  hospitalInfo: {
    flex: 1,
  },
  hospitalName: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  hospitalLocation: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  distanceBadge: {
    backgroundColor: '#173E36',
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  distanceText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
  },
  hospitalNote: {
    color: '#71869D',
    fontSize: 11,
    lineHeight: 17,
  },
  submitButton: {
    height: 58,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    marginTop: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  disabledButton: {
    opacity: 0.5,
  },
  note: {
    color: '#71869D',
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 14,
  },
});