import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/services/AuthContext';
import { assignmentService, CaseOffer } from '@/services/assignmentService';

export default function PatientInfo() {
  const router = useRouter();
  const { token } = useAuth();
  const [activeCase, setActiveCase] = useState<CaseOffer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCase = async () => {
      if (!token) return;
      try {
        const data = await assignmentService.getMyOffers(token);
        // Get the most recent active case
        const active = data.find((c) => c.status !== 'completed' && c.status !== 'cancelled');
        setActiveCase(active || null);
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCase();
  }, [token]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Patient Information</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#E63946" style={{ marginTop: 50 }} />
      ) : !activeCase ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No active patient assigned right now.</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.label}>PATIENT NAME</Text>
            <Text style={styles.value}>{activeCase.patient_name || 'Unknown Patient'}</Text>
            
            <Text style={styles.label}>PHONE NUMBER</Text>
            <Text style={styles.value}>{activeCase.patient_phone || 'Not provided'}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>EMERGENCY DESCRIPTION</Text>
            <Text style={styles.value}>{activeCase.emergency_desc}</Text>

            <Text style={styles.label}>SEVERITY LEVEL</Text>
            <Text style={[styles.value, { color: '#E63946' }]}>{activeCase.severity.toUpperCase()}</Text>
          </View>
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
  content: { padding: 20, gap: 15 },
  card: { backgroundColor: '#122238', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#263C54' },
  label: { color: '#9FB0C3', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 5, marginTop: 10 },
  value: { color: '#FFF', fontSize: 16, fontWeight: '600', marginBottom: 10 },
});