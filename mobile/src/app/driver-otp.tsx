
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { API_BASE_URL } from '@/constants/api';
import { authStorage } from '@/services/authStorage';

export default function DriverOtpScreen() {
  const router = useRouter();
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code)) {
      Alert.alert(
        'Invalid verification code',
        'Enter the six-digit code from your MediRescue server terminal.',
      );
      return;
    }

    if (!challengeId) {
      Alert.alert(
        'Session expired',
        'Please return to the login screen and sign in again.',
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/staff-otp/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            challengeId,
            code,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'OTP verification failed.');
      }

      if (!data.token || !data.user) {
        throw new Error('The server returned an incomplete login response.');
      }

      if (data.user.role !== 'driver') {
        throw new Error('The authenticated account is not a driver account.');
      }

      await authStorage.saveSession(data.token, data.user);

      router.replace('/driver-dashboard');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to verify your code.';

      Alert.alert('Verification unsuccessful', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backText}>Back to login</Text>
          </Pressable>

          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>✚</Text>
            </View>

            <View>
              <Text style={styles.brandName}>MediRescue</Text>
              <Text style={styles.brandSubtitle}>
                EMERGENCY RESPONSE
              </Text>
            </View>
          </View>

          <View style={styles.hero}>
            <View style={styles.iconCircle}>
              <Text style={styles.shieldIcon}>🔐</Text>
            </View>

            <Text style={styles.eyebrow}>DRIVER ACCOUNT SECURITY</Text>

            <Text style={styles.title}>
              Verify your{'\n'}
              <Text style={styles.titleHighlight}>identity.</Text>
            </Text>

            <Text style={styles.description}>
              Enter the six-digit verification code displayed in your
              MediRescue backend terminal.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>SIX-DIGIT VERIFICATION CODE</Text>

            <TextInput
              style={styles.input}
              value={code}
              onChangeText={(value) =>
                setCode(value.replace(/[^0-9]/g, '').slice(0, 6))
              }
              placeholder="000000"
              placeholderTextColor="#718198"
              keyboardType="number-pad"
              maxLength={6}
              textContentType="oneTimeCode"
              editable={!loading}
            />

            <Pressable
              onPress={verifyCode}
              disabled={loading}
              style={[
                styles.verifyButton,
                loading && styles.buttonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.verifyButtonText}>
                    Verify and Continue
                  </Text>
                  <Text style={styles.buttonArrow}>→</Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>
              <Text style={styles.noticeIcon}>ℹ </Text>
              Development mode
            </Text>
            <Text style={styles.noticeText}>
              Your current backend development configuration prints the
              OTP in the server terminal. This will later be replaced
              with secure SMS delivery.
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              SECURE MEDICAL EMERGENCY ACCESS
            </Text>
            <Text style={styles.footerCopyright}>
              MEDIRESCUE © 2026
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#101D32',
  },
  keyboard: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingTop: 15,
    paddingBottom: 30,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 9,
    paddingVertical: 8,
  },
  backArrow: {
    color: '#FFFFFF',
    fontSize: 23,
  },
  backText: {
    color: '#AAB9CB',
    fontSize: 13,
    fontWeight: '600',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginTop: 28,
  },
  logo: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#E63946',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  brandSubtitle: {
    color: '#91A3BA',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 3,
  },
  hero: {
    marginTop: 48,
    marginBottom: 34,
  },
  iconCircle: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: '#263E59',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 27,
  },
  shieldIcon: {
    fontSize: 30,
  },
  eyebrow: {
    color: '#F06A73',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 14,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 39,
    lineHeight: 46,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  titleHighlight: {
    color: '#F05B66',
  },
  description: {
    color: '#AAB9CB',
    fontSize: 13,
    lineHeight: 22,
    marginTop: 14,
  },
  form: {
    gap: 14,
  },
  label: {
    color: '#B9C9D9',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  input: {
    height: 62,
    backgroundColor: '#1B2B40',
    borderWidth: 1,
    borderColor: '#354960',
    borderRadius: 13,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: 12,
    textAlign: 'center',
  },
  verifyButton: {
    height: 55,
    backgroundColor: '#E63946',
    borderRadius: 13,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  buttonArrow: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '700',
  },
  notice: {
    backgroundColor: '#1B3049',
    borderWidth: 1,
    borderColor: '#354960',
    borderRadius: 13,
    padding: 15,
    marginTop: 30,
  },
  noticeTitle: {
    color: '#F2C879',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  noticeIcon: {
    fontSize: 15,
  },
  noticeText: {
    color: '#AAB9CB',
    fontSize: 11,
    lineHeight: 18,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 45,
    alignItems: 'center',
    gap: 9,
  },
  footerText: {
    color: '#91A3BA',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  footerCopyright: {
    color: '#667B94',
    fontSize: 9,
  },
});
