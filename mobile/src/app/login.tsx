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
import { useAuth } from '@/services/AuthContext';

type UserRole = 'patient' | 'driver';

const REQUEST_TIMEOUT_MS = 25000;
const STORAGE_TIMEOUT_MS = 10000;

// Rejects if a step takes too long, naming the step so we can see where
// the login stalls.
function withTimeout<T>(promise: Promise<T>, ms: number, step: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out while: ${step}`)),
      ms,
    );

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export default function LoginScreen() {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const params = useLocalSearchParams<{ role?: string }>();

  const role: UserRole = params.role === 'driver' ? 'driver' : 'patient';
  const isPatient = role === 'patient';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier || !password) {
      Alert.alert('Missing information', 'Please enter your login details.');
      return;
    }

    if (isPatient && !/^\+?[0-9]{9,15}$/.test(cleanIdentifier)) {
      Alert.alert(
        'Invalid phone number',
        'Enter a valid phone number, including the country code if necessary.',
      );
      return;
    }

    if (!isPatient && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanIdentifier)) {
      Alert.alert('Invalid email', 'Enter a valid driver email address.');
      return;
    }

    setLoading(true);

    const controller = new AbortController();
    const requestTimer = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

    let step = 'contacting the server';

    try {
      console.log('LOGIN: sending request to', `${API_BASE_URL}/auth/login`);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          ...(isPatient
            ? { phone: cleanIdentifier }
            : { email: cleanIdentifier }),
          password,
          role,
        }),
      });

      console.log('LOGIN: response status', response.status);

      step = 'reading the server response';

      // Read the response as text first so invalid JSON cannot crash silently.
      const responseText = await response.text();

      let data: any;

      try {
        data = JSON.parse(responseText);
      } catch {
        const preview = responseText
          ? responseText.substring(0, 400)
          : '[Empty response]';

        throw new Error(
          `The backend returned an invalid JSON response.\n\n` +
            `HTTP status: ${response.status}\n` +
            `Content-Type: ${response.headers.get('content-type') || 'Unknown'}\n` +
            `Server response: ${preview}`,
        );
      }

      if (!response.ok) {
        // The server reports problems as { error: "..." }, so read that first.
        throw new Error(
          data.error ||
            data.message ||
            `Login failed. HTTP ${response.status}.`,
        );
      }

      if (isPatient) {
        if (!data.token || !data.user) {
          throw new Error(
            'The server returned an incomplete patient login response.',
          );
        }

        step = 'saving your session on the phone';
        await withTimeout(
          authStorage.saveSession(data.token, data.user),
          STORAGE_TIMEOUT_MS,
          step,
        );

        // Load the freshly saved session into AuthContext so the dashboard
        // has the token as soon as it opens.
        step = 'loading your session';
        await withTimeout(refreshSession(), STORAGE_TIMEOUT_MS, step);

        console.log('LOGIN: success, opening dashboard');
        router.replace('/patient-dashboard');
        return;
      }

      if (data.requiresOtp && data.challengeId) {
        router.push({
          pathname: '/driver-otp',
          params: {
            challengeId: data.challengeId,
          },
        });
        return;
      }

      throw new Error(
        'The server did not return the expected driver OTP challenge.',
      );
    } catch (error) {
      console.error('LOGIN error at step:', step, error);

      let message: string;

      if (error instanceof Error && error.name === 'AbortError') {
        message =
          'The server did not answer within 25 seconds. If the server was ' +
          'asleep, wait a moment and try again.';
      } else if (error instanceof Error) {
        message = error.message;
      } else {
        message = 'Unable to connect to MediRescue.';
      }

      Alert.alert('Login unsuccessful', message);
    } finally {
      clearTimeout(requestTimer);
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
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>✚</Text>
            </View>

            <View>
              <Text style={styles.brandName}>MediRescue</Text>
              <Text style={styles.brandSubtitle}>EMERGENCY RESPONSE</Text>
            </View>
          </View>

          <View style={styles.hero}>
            <Text style={styles.eyebrow}>
              {isPatient ? 'PATIENT PORTAL' : 'AMBULANCE RESPONSE PORTAL'}
            </Text>

            <Text style={styles.title}>
              Welcome{'\n'}<Text style={styles.titleHighlight}>back.</Text>
            </Text>

            <Text style={styles.description}>
              {isPatient
                ? 'Sign in to access emergency assistance and your medical information.'
                : 'Sign in to access your ambulance assignments and response operations.'}
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>
              {isPatient ? 'PHONE NUMBER' : 'DRIVER EMAIL ADDRESS'}
            </Text>

            <TextInput
              style={styles.input}
              value={identifier}
              onChangeText={setIdentifier}
              placeholder={
                isPatient ? '+254 7XX XXX XXX' : 'driver@hospital.co.ke'
              }
              placeholderTextColor="#718198"
              keyboardType={isPatient ? 'phone-pad' : 'email-address'}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <Text style={styles.label}>PASSWORD</Text>

            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#718198"
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />

            <Pressable
              style={[
                styles.loginButton,
                loading && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Sign In</Text>
                  <Text style={styles.buttonArrow}>→</Text>
                </>
              )}
            </Pressable>

            {isPatient && (
              <Pressable
                onPress={() =>
                  Alert.alert(
                    'Password recovery',
                    'Patient password recovery will be connected in a later step.',
                  )
                }
              >
                <Text style={styles.forgotPassword}>Forgot password?</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              SECURE MEDICAL EMERGENCY ACCESS
            </Text>
            <Text style={styles.footerCopyright}>MEDIRESCUE © 2026</Text>
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
    marginTop: 32,
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
    marginTop: 55,
    marginBottom: 35,
  },
  eyebrow: {
    color: '#F06A73',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 15,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 43,
    lineHeight: 49,
    fontWeight: '900',
    letterSpacing: -1.5,
  },
  titleHighlight: {
    color: '#F05B66',
  },
  description: {
    color: '#AAB9CB',
    fontSize: 13,
    lineHeight: 22,
    marginTop: 15,
    maxWidth: 310,
  },
  form: {
    gap: 12,
  },
  label: {
    color: '#B9C9D9',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginTop: 8,
  },
  input: {
    height: 55,
    backgroundColor: '#1B2B40',
    borderWidth: 1,
    borderColor: '#354960',
    borderRadius: 13,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 14,
  },
  loginButton: {
    height: 55,
    backgroundColor: '#E63946',
    borderRadius: 13,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  buttonArrow: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '700',
  },
  forgotPassword: {
    color: '#F05B66',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    padding: 12,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 55,
    alignItems: 'center',
    gap: 9,
  },
  footerText: {
    color: '#91A3BA',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  footerCopyright: {
    color: '#667B94',
    fontSize: 9,
  },
});