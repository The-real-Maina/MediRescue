import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { useAuth } from '@/services/AuthContext';
import { assignmentService, CaseOffer } from '@/services/assignmentService';

export default function DriverAssignments() {
  const router = useRouter();
  const { token } = useAuth();

  const [cases, setCases] = useState<CaseOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadCases = useCallback(async () => {
    if (!token) {
      setError('Your session has expired. Please log in again.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const data = await assignmentService.getMyOffers(token);
      setCases(Array.isArray(data) ? data : []);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Unable to load assignments.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  // Reload every time the screen comes back into focus.
  useFocusEffect(
    useCallback(() => {
      loadCases();
    }, [loadCases]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadCases();
  };

  const renderCase = ({ item }: { item: CaseOffer }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.caseId}>CASE #{item.id}</Text>
        <Text style={styles.status}>
          {String(item.status ?? 'unknown').replace(/_/g, ' ').toUpperCase()}
        </Text>
      </View>
      <Text style={styles.desc}>{item.emergency_desc || 'Medical Emergency'}</Text>
      <Text style={styles.severity}>Severity: {item.severity || 'Not specified'}</Text>
    </View>
  );

  const renderBody = () => {
    if (loading) {
      return <ActivityIndicator size="large" color="#E63946" style={{ marginTop: 50 }} />;
    }

    if (error && cases.length === 0) {
      return (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              loadCases();
            }}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={cases}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderCase}
        contentContainerStyle={{ padding: 20, flexGrow: 1 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No assignments found.</Text>}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FFFFFF" />
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Assignments</Text>
      </View>

      {renderBody()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#081321' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#263C54',
  },
  backText: { color: '#9FB0C3', fontSize: 16, marginRight: 15 },
  title: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  emptyText: { color: '#9FB0C3', textAlign: 'center', marginTop: 50 },
  errorWrap: { padding: 24, alignItems: 'center', marginTop: 40 },
  errorText: { color: '#F5B942', textAlign: 'center', fontSize: 14, lineHeight: 21 },
  retryButton: {
    marginTop: 18,
    backgroundColor: '#E63946',
    borderRadius: 11,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  card: {
    backgroundColor: '#122238',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#263C54',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  caseId: { color: '#FFF', fontWeight: 'bold' },
  status: { color: '#F2C879', fontSize: 12, fontWeight: 'bold' },
  desc: { color: '#D1D9E6', fontSize: 14, marginBottom: 10 },
  severity: { color: '#E63946', fontSize: 12, fontWeight: 'bold' },
});