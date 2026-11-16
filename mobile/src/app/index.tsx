
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

type UserRole = 'patient' | 'driver';

export default function HomeScreen() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');
  const router = useRouter();

  const continueToApp = () => {
    router.push({
      pathname: '/login',
      params: { role: selectedRole },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoIcon}>✚</Text>
            </View>

            <View>
              <Text style={styles.brandName}>MediRescue</Text>
              <Text style={styles.brandTagline}>EMERGENCY RESPONSE</Text>
            </View>
          </View>

          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>READY TO HELP</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>YOUR SAFETY. OUR PRIORITY.</Text>

          <Text style={styles.heroTitle}>
            Help is closer{'\n'}
            <Text style={styles.heroHighlight}>than you think.</Text>
          </Text>

          <Text style={styles.heroDescription}>
            Connecting patients, ambulance drivers and emergency
            medical services when every second matters.
          </Text>

          <View style={styles.emergencyVisual}>
            <View style={styles.outerCircle}>
              <View style={styles.middleCircle}>
                <View style={styles.innerCircle}>
                  <Text style={styles.ambulanceIcon}>🚑</Text>
                </View>
              </View>
            </View>

            <View style={styles.visualLabel}>
              <View style={styles.visualDot} />
              <Text style={styles.visualLabelText}>
                EMERGENCY CARE CONNECTED
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.selectionSection}>
          <Text style={styles.sectionTitle}>
            How will you use MediRescue?
          </Text>

          <Text style={styles.sectionSubtitle}>
            Select your account type to continue.
          </Text>

          <Pressable
            onPress={() => setSelectedRole('patient')}
            style={[
              styles.roleCard,
              selectedRole === 'patient' && styles.selectedCard,
            ]}
          >
            <View style={styles.patientIcon}>
              <Text style={styles.roleIconText}>♡</Text>
            </View>

            <View style={styles.roleInfo}>
              <Text style={styles.roleTitle}>I’m a Patient</Text>
              <Text style={styles.roleDescription}>
                Request emergency assistance, track ambulances and
                manage your medical information.
              </Text>
            </View>

            <View
              style={[
                styles.radio,
                selectedRole === 'patient' && styles.radioSelected,
              ]}
            >
              {selectedRole === 'patient' && (
                <View style={styles.radioInner} />
              )}
            </View>
          </Pressable>

          <Pressable
            onPress={() => setSelectedRole('driver')}
            style={[
              styles.roleCard,
              selectedRole === 'driver' && styles.selectedCard,
            ]}
          >
            <View style={styles.driverIcon}>
              <Text style={styles.roleIconText}>🚑</Text>
            </View>

            <View style={styles.roleInfo}>
              <Text style={styles.roleTitle}>I’m an Ambulance Driver</Text>
              <Text style={styles.roleDescription}>
                Receive emergency assignments, navigate to patients
                and update response progress.
              </Text>
            </View>

            <View
              style={[
                styles.radio,
                selectedRole === 'driver' && styles.radioSelected,
              ]}
            >
              {selectedRole === 'driver' && (
                <View style={styles.radioInner} />
              )}
            </View>
          </Pressable>

          <Pressable
            onPress={continueToApp}
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.continueButtonText}>
              Continue as {selectedRole === 'patient' ? 'Patient' : 'Driver'}
            </Text>
            <Text style={styles.arrow}>→</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>MEDIRESCUE © 2026</Text>
          <Text style={styles.footerSubtext}>
            Emergency response made smarter.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#101D32',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 42,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  logo: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#E63946',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIcon: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandTagline: {
    color: '#91A3BA',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1D3045',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: '#45D483',
  },
  statusText: {
    color: '#B9C9D9',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hero: {
    marginBottom: 34,
  },
  eyebrow: {
    color: '#F06A73',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 13,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 38,
    lineHeight: 45,
    fontWeight: '900',
    letterSpacing: -1.5,
  },
  heroHighlight: {
    color: '#F05B66',
  },
  heroDescription: {
    color: '#AAB9CB',
    fontSize: 14,
    lineHeight: 23,
    marginTop: 13,
    maxWidth: 330,
  },
  emergencyVisual: {
    height: 155,
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    width: 135,
    height: 135,
    borderRadius: 70,
    backgroundColor: '#1B3049',
    alignItems: 'center',
    justifyContent: 'center',
  },
  middleCircle: {
    width: 105,
    height: 105,
    borderRadius: 55,
    backgroundColor: '#263E59',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: '#E63946',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambulanceIcon: {
    fontSize: 37,
  },
  visualLabel: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  visualDot: {
    width: 6,
    height: 6,
    borderRadius: 4,
    backgroundColor: '#45D483',
  },
  visualLabelText: {
    color: '#91A3BA',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  selectionSection: {
    gap: 13,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    color: '#91A3BA',
    fontSize: 12,
    marginTop: -7,
    marginBottom: 5,
  },
  roleCard: {
    backgroundColor: '#1B2B40',
    borderWidth: 1.5,
    borderColor: '#2B3D53',
    borderRadius: 17,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedCard: {
    borderColor: '#F05B66',
    backgroundColor: '#263246',
  },
  patientIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#4A2736',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#243F59',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconText: {
    fontSize: 25,
    color: '#FFFFFF',
  },
  roleInfo: {
    flex: 1,
    gap: 5,
  },
  roleTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  roleDescription: {
    color: '#AAB9CB',
    fontSize: 10,
    lineHeight: 16,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#74869B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#F05B66',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: '#F05B66',
  },
  continueButton: {
    height: 55,
    backgroundColor: '#E63946',
    borderRadius: 14,
    marginTop: 7,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  arrow: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
    gap: 5,
  },
  footerText: {
    color: '#74869B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  footerSubtext: {
    color: '#667B94',
    fontSize: 10,
  },
});
