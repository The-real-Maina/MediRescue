import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/services/AuthContext';
import { assignmentService, CaseOffer } from '@/services/assignmentService';

export default function NavigationTracking() {
  const router = useRouter();
  const { token } = useAuth();
  const [activeCase, setActiveCase] = useState<CaseOffer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCase = async () => {
      if (!token) return;
      try {
        const data = await assignmentService.getMyOffers(token);
        const active = data.find((c) => c.status === 'accepted' || c.status === 'assigned');
        setActiveCase(active || null);
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCase();
  }, [token]);

  const openMaps = () => {
    if (!activeCase || !activeCase.pickup_lat || !activeCase.pickup_lng) {
      Alert.alert('Error', 'Pickup coordinates are not available.');
      return;
    }
    const lat = activeCase.pickup_lat;
    const lng = activeCase.pickup_lng;
    
    // Opens Google Maps on Android and Apple Maps on iOS
    const url = Platform.select({
      ios: `maps://?daddr=${lat},${lng}`,
      android: `google.navigation:q=${lat},${lng}`,
    });

    Linking.canOpenURL(url as string).then((supported) => {
      if (supported) {
        Linking.openURL(url as string);
      } else {
        // Fallback to browser maps
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Navigation</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#E63946" style={{ marginTop: 50 }} />
      ) : !activeCase ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No active navigation route.</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapIcon}>📍</Text>
            <Text style={styles.mapText}>Pickup Location</Text>
            <Text style={styles.coords}>
              {activeCase.pickup_lat || 'N/A'}, {activeCase.pickup_lng || 'N/A'}
            </Text>
          </View>

          <TouchableOpacity style={styles.navButton} onPress={openMaps}>
            <Text style={styles.navButtonText}>Start Turn-by-Turn Navigation</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#081321' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#263C54' },
  backText: { color: '#9FB0C3', fontSize: 16, marginRight: 15 },
  title: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#9FB0C3', fontSize: 16 },
  content: { padding: 20 },
  mapPlaceholder: { backgroundColor: '#122238', height: 250, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#263C54', marginBottom: 20 },
  mapIcon: { fontSize: 50, marginBottom: 10 },
  mapText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  coords: { color: '#9FB0C3', fontSize: 14, marginTop: 5 },
  navButton: { backgroundColor: '#E63946', padding: 18, borderRadius: 12, alignItems: 'center' },
  navButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});