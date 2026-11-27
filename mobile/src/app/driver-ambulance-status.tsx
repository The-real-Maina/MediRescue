import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/services/AuthContext';
import { assignmentService } from '@/services/assignmentService';

// These exactly match the backend's validStatuses array
const STATUSES = [
  { label: 'Available / Ready', value: 'available', color: '#35C98A' },
  { label: 'On Call (Active Case)', value: 'on_call', color: '#F2C879' },
  { label: 'Under Repair', value: 'under_repair', color: '#E63946' },
  { label: 'Out of Service', value: 'out_of_service', color: '#9FB0C3' },
];

export default function AmbulanceStatus() {
  const router = useRouter();
  const { token } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState('available');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Send the correct backend value
      await assignmentService.updateAmbulanceStatus(token, selectedStatus);
      
      const statusLabel = STATUSES.find(s => s.value === selectedStatus)?.label || selectedStatus;
      Alert.alert('Status Updated', `Your vehicle is now marked as: ${statusLabel}`);
      
    } catch (err: any) {
      // The backend will return a 409 if they try to set 'available' while on a case
      Alert.alert('Update Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Ambulance Status</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>Select your current operational status:</Text>
        
        {STATUSES.map((status) => (
          <TouchableOpacity
            key={status.value}
            style={[
              styles.statusButton,
              selectedStatus === status.value && { borderColor: status.color, backgroundColor: `${status.color}15` }
            ]}
            onPress={() => setSelectedStatus(status.value)}
          >
            <View style={[styles.dot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, selectedStatus === status.value && { color: status.color }]}>
              {status.label}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.updateButton} onPress={handleUpdate} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.updateText}>Update Status</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#081321' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#263C54' },
  backText: { color: '#9FB0C3', fontSize: 16, marginRight: 15 },
  title: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  content: { padding: 20 },
  subtitle: { color: '#9FB0C3', fontSize: 14, marginBottom: 20 },
  statusButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#122238', padding: 18, borderRadius: 12, borderWidth: 1, borderColor: '#263C54', marginBottom: 12 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 15 },
  statusText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  updateButton: { backgroundColor: '#E63946', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  updateText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});