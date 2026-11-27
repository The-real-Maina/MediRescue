import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/services/AuthContext';

const COLORS = {
  background: '#081321',
  surface: '#122238',
  surfaceLight: '#1A304A',
  primary: '#E63946',
  white: '#FFFFFF',
  muted: '#9FB0C3',
  border: '#263C54',
};

export default function EditProfile() {
  const router = useRouter();
  const auth: any = useAuth();
  const user = auth.user;

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }
    setLoading(true);
    try {
      const token = auth.token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to update profile.');

      if (typeof auth.refreshSession === 'function') {
        await auth.refreshSession();
      }

      Alert.alert('Success', 'Profile updated successfully.');
      router.back();
    } catch (err: any) {
      console.log("🔥 EDIT PROFILE ERROR:", err.message); 
      Alert.alert('Update Failed', err?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>FULL NAME</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
          placeholderTextColor={COLORS.muted}
        />

        <Text style={styles.label}>PHONE NUMBER</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Enter your phone number"
          placeholderTextColor={COLORS.muted}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>EMAIL ADDRESS</Text>
        <TextInput
          style={[styles.input, styles.disabledInput]}
          value={user?.email || 'No email linked to this account'}
          editable={false}
        />
        <Text style={styles.helperText}>Email cannot be changed here.</Text>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          {loading
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.saveText}>Save Changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backButton: { padding: 5 },
  headerTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  content: { padding: 20 },
  label: { color: COLORS.muted, fontSize: 12, fontWeight: 'bold', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 15, color: COLORS.white, fontSize: 16 },
  disabledInput: { opacity: 0.5, backgroundColor: COLORS.surfaceLight },
  helperText: { color: COLORS.muted, fontSize: 12, marginTop: 8 },
  saveButton: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 40 },
  saveText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
});