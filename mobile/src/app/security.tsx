import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

import { useAuth } from '@/services/AuthContext';
import { API_BASE_URL } from '@/constants/api';

const COLORS = {
  background: '#081321',
  surface: '#122238',
  surfaceLight: '#1A304A',
  primary: '#E63946',
  white: '#FFFFFF',
  muted: '#9FB0C3',
  border: '#263C54',
  green: '#35C98A',
};

const BIOMETRIC_KEY = 'biometricsEnabled';

async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Server returned an invalid response (${res.status}).`);
  }
}

export default function SecurityScreen() {
  const router = useRouter();
  const auth: any = useAuth();
  const token: string | undefined = auth?.token;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);

  const [biometrics, setBiometrics] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        const saved = await SecureStore.getItemAsync(BIOMETRIC_KEY);

        if (!active) return;

        setBiometricSupported(hasHardware && isEnrolled);
        setBiometrics(saved === 'true');

        const user = auth?.user;
        if (user) {
          setTwoFactor(Boolean(user.twoFactorEnabled ?? user.two_factor_enabled));
        }
      } catch (error) {
        console.error('Biometric check error:', error);
      }
    };

    // Fixed: Wrap in setTimeout to prevent setState-in-effect warning
    const timer = setTimeout(loadSettings, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [auth?.user]);

  const handleUpdatePassword = async () => {
    if (loading) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      if (!token) throw new Error('Your session has expired. Please log in again.');

      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await readJson(res);

      if (!res.ok) {
        throw new Error(data.error || data.message || `Failed to update password (${res.status}).`);
      }

      Alert.alert('Success', 'Password updated successfully.');
      router.back();
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  const toggleBiometrics = async (value: boolean) => {
    try {
      if (value) {
        if (!biometricSupported) {
          Alert.alert('Not Supported', 'Your device does not support biometric authentication.');
          return;
        }

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to enable biometric login',
          fallbackLabel: 'Use passcode',
        });

        if (result.success) {
          await SecureStore.setItemAsync(BIOMETRIC_KEY, 'true');
          setBiometrics(true);
          Alert.alert('Success', 'Biometric login enabled.');
        } else {
          setBiometrics(false);
        }
      } else {
        await SecureStore.setItemAsync(BIOMETRIC_KEY, 'false');
        setBiometrics(false);
      }
    } catch (error) {
      console.error('Biometric toggle error:', error);
      setBiometrics(false);
      Alert.alert('Error', 'Could not change the biometric setting.');
    }
  };

  const toggle2FA = async (value: boolean) => {
    if (twoFactorBusy) return;

    setTwoFactorBusy(true);
    setTwoFactor(value);

    try {
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${API_BASE_URL}/auth/toggle-2fa`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: value }),
      });

      if (!res.ok) {
        const data = await readJson(res).catch(() => ({}));
        throw new Error(data.error || data.message || 'Failed to update 2FA');
      }

      Alert.alert('Success', `Two-Factor Authentication ${value ? 'enabled' : 'disabled'}.`);
    } catch (error) {
      console.error('2FA toggle error:', error);
      setTwoFactor(!value);
      Alert.alert('Error', 'Could not update 2FA settings. Check your connection.');
    } finally {
      setTwoFactorBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Change Password</Text>

        <Text style={styles.label}>CURRENT PASSWORD</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
            placeholderTextColor={COLORS.muted}
            secureTextEntry={!showCurrent}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeIcon}>
            <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.muted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>NEW PASSWORD</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="At least 6 characters"
            placeholderTextColor={COLORS.muted}
            secureTextEntry={!showNew}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeIcon}>
            <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.muted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter new password"
            placeholderTextColor={COLORS.muted}
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeIcon}>
            <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.muted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabled]}
          onPress={handleUpdatePassword}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveText}>Update Password</Text>}
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Additional Security</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Biometric Login</Text>
            <Text style={styles.settingSubtitle}>
              {biometricSupported ? 'Use Face ID or Fingerprint to log in' : 'Not supported on this device'}
            </Text>
          </View>
          <Switch
            value={biometrics}
            onValueChange={toggleBiometrics}
            disabled={!biometricSupported}
            trackColor={{ false: COLORS.surfaceLight, true: COLORS.green }}
            thumbColor={COLORS.white}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Two-Factor Authentication</Text>
            <Text style={styles.settingSubtitle}>Receive a code via SMS when logging in</Text>
          </View>
          <Switch
            value={twoFactor}
            onValueChange={toggle2FA}
            disabled={twoFactorBusy}
            trackColor={{ false: COLORS.surfaceLight, true: COLORS.green }}
            thumbColor={COLORS.white}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: { padding: 5 },
  headerTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  label: { color: COLORS.muted, fontSize: 12, fontWeight: 'bold', marginBottom: 8, marginTop: 15 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  input: { flex: 1, padding: 15, color: COLORS.white, fontSize: 16 },
  eyeIcon: { padding: 15 },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
  },
  disabled: { opacity: 0.6 },
  saveText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  settingTextContainer: { flex: 1, paddingRight: 10 },
  settingTitle: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  settingSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
});