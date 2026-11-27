import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  background: '#081321',
  white: '#FFFFFF',
  muted: '#9FB0C3',
  border: '#263C54',
};

const CONTENT: Record<string, { title: string; body: string }> = {
  safety: {
    title: 'Safety Guide',
    body:
      '1. Stay calm and assess the situation.\n\n' +
      '2. If there is a fire or immediate danger, move to safety first.\n\n' +
      '3. Do not move a patient who has suffered a fall or trauma unless they are in immediate danger.\n\n' +
      '4. Keep the patient warm and comfortable while waiting for the ambulance.\n\n' +
      '5. Ensure your phone location is on so the driver can find you.',
  },
  help: {
    title: 'Help & Support',
    body:
      'Need assistance?\n\n' +
      'If you are experiencing a technical issue with the app, please contact our support team.\n\n' +
      'Email: support@medirescue.com\n' +
      'Phone: +254 700 000 000\n\n' +
      'Our team is available 24/7 to assist with account issues, app glitches, or payment problems.',
  },
  about: {
    title: 'About MediRescue',
    body:
      'MediRescue is an emergency medical response system connecting patients directly to the nearest available ambulance and hospital.\n\n' +
      'Our mission is to reduce response times and save lives by eliminating the friction in emergency dispatch.\n\n' +
      'Version: 1.0.0\n© 2026 MediRescue. All rights reserved.',
  },
  terms: {
    title: 'Terms & Privacy',
    body:
      'Privacy Policy:\n' +
      'We collect your location data solely to dispatch emergency services to your precise location. We do not sell your data to third parties.\n\n' +
      'Terms of Service:\n' +
      'By using this app, you agree to use the SOS feature only for genuine medical emergencies. Misuse of the SOS feature may result in account suspension.',
  },
};

export default function InfoScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();

  const pageData = CONTENT[type || 'about'] || CONTENT.about;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{pageData.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.bodyText}>{pageData.body}</Text>
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
  content: { padding: 20 },
  bodyText: { color: COLORS.muted, fontSize: 15, lineHeight: 24 },
});