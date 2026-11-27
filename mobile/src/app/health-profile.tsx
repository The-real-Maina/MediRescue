import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/services/AuthContext';
import { API_BASE_URL } from '@/constants/api';

const COLORS = {
  background: '#081321',
  surface: '#122238',
  surfaceLight: '#1A304A',
  primary: '#E63946',
  white: '#FFFFFF',
  muted: '#9FB0C3',
  green: '#35C98A',
  border: '#263C54',
  warning: '#F5B942',
};

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Male', 'Female', 'Other'];
const PREGNANCY = ['Not applicable', 'Not pregnant', 'Pregnant'];

interface Medication {
  name: string;
  dose: string;
  frequency: string;
}

interface Surgery {
  procedure: string;
  year: string;
}

interface Contact {
  name: string;
  relationship: string;
  phone: string;
}

const str = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value);

// The server may return a full ISO timestamp; the form only edits YYYY-MM-DD.
const toDateOnly = (value: unknown): string => {
  const s = str(value);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s;
};

// Empty string becomes null, anything else a number (accepts "72,5" too).
const toNumberOrNull = (value: string): number | null => {
  const clean = value.trim().replace(',', '.');
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
};

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'phone-pad';
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#718198"
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        autoCorrect={false}
      />
    </View>
  );
}

export default function HealthProfileScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const [phone, setPhone] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [allergies, setAllergies] = useState('');
  const [chronicConditions, setChronicConditions] = useState('');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [familyHistory, setFamilyHistory] = useState('');
  const [mobilityNeeds, setMobilityNeeds] = useState('');
  const [pregnancyStatus, setPregnancyStatus] = useState('');
  const [homeLandmark, setHomeLandmark] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insuranceMemberNo, setInsuranceMemberNo] = useState('');
  const [nextOfKinName, setNextOfKinName] = useState('');
  const [nextOfKinPhone, setNextOfKinPhone] = useState('');
  const [extraContacts, setExtraContacts] = useState<Contact[]>([]);
  const [shareWithResponders, setShareWithResponders] = useState(false);

  // Not editable on the phone, but the server replaces the whole profile on
  // save, so it is loaded and sent back unchanged.
  const [preferredHospitalId, setPreferredHospitalId] = useState<number | null>(null);

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      if (!token) {
        throw new Error('Your session has expired. Please log in again.');
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(options.headers as Record<string, string> | undefined),
        },
      });

      const responseText = await response.text();

      let data: any;

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(`Server returned an invalid response (${response.status}).`);
      }

      if (!response.ok) {
        throw new Error(
          data.error || data.message || `Request failed (${response.status}).`,
        );
      }

      return data;
    },
    [token],
  );

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const data = await authenticatedFetch(`${API_BASE_URL}/health-profile`);

      setPhone(str(data.phone));
      setBloodType(str(data.blood_type));
      setDateOfBirth(toDateOnly(data.date_of_birth));
      setGender(str(data.gender));
      setHeightCm(str(data.height_cm));
      setWeightKg(str(data.weight_kg));
      setAllergies(str(data.allergies));
      setChronicConditions(str(data.chronic_conditions));
      setFamilyHistory(str(data.family_history));
      setMobilityNeeds(str(data.mobility_needs));
      setPregnancyStatus(str(data.pregnancy_status));
      setHomeLandmark(str(data.home_landmark));
      setInsuranceProvider(str(data.insurance_provider));
      setInsuranceMemberNo(str(data.insurance_member_no));
      setNextOfKinName(str(data.next_of_kin_name));
      setNextOfKinPhone(str(data.next_of_kin_phone));
      setShareWithResponders(Boolean(data.share_with_responders));
      setPreferredHospitalId(
        data.preferred_hospital_id ? Number(data.preferred_hospital_id) : null,
      );

      setMedications(
        Array.isArray(data.medications)
          ? data.medications.map((m: any) => ({
              name: str(m?.name),
              dose: str(m?.dose),
              frequency: str(m?.frequency),
            }))
          : [],
      );

      setSurgeries(
        Array.isArray(data.past_surgeries)
          ? data.past_surgeries.map((s: any) => ({
              procedure: str(s?.procedure),
              year: str(s?.year),
            }))
          : [],
      );

      setExtraContacts(
        Array.isArray(data.extra_contacts)
          ? data.extra_contacts.map((c: any) => ({
              name: str(c?.name),
              relationship: str(c?.relationship),
              phone: str(c?.phone),
            }))
          : [],
      );
    } catch (error) {
      console.error('Load health profile error:', error);

      setLoadError(
        error instanceof Error ? error.message : 'Unable to load your health profile.',
      );
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateMedication = (index: number, key: keyof Medication, value: string) =>
    setMedications((items) =>
      items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );

  const updateSurgery = (index: number, key: keyof Surgery, value: string) =>
    setSurgeries((items) =>
      items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );

  const updateContact = (index: number, key: keyof Contact, value: string) =>
    setExtraContacts((items) =>
      items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );

  const handleSave = async () => {
    if (saving || loadError) return;

    const cleanDob = dateOfBirth.trim();

    if (cleanDob && !/^\d{4}-\d{2}-\d{2}$/.test(cleanDob)) {
      Alert.alert('Date of birth', 'Enter the date as YYYY-MM-DD, for example 2002-04-15.');
      return;
    }

    const height = toNumberOrNull(heightCm);
    const weight = toNumberOrNull(weightKg);

    if (
      (heightCm.trim() && height === null) ||
      (weightKg.trim() && weight === null)
    ) {
      Alert.alert('Height and weight', 'Enter numbers only, for example 172.');
      return;
    }

    setSaving(true);

    try {
      await authenticatedFetch(`${API_BASE_URL}/health-profile`, {
        method: 'PUT',
        body: JSON.stringify({
          blood_type: bloodType || null,
          date_of_birth: cleanDob || null,
          gender: gender || null,
          height_cm: height,
          weight_kg: weight,
          allergies,
          chronic_conditions: chronicConditions,
          medications: medications.filter((m) => m.name.trim()),
          past_surgeries: surgeries.filter((s) => s.procedure.trim()),
          family_history: familyHistory,
          mobility_needs: mobilityNeeds,
          pregnancy_status: pregnancyStatus || null,
          home_landmark: homeLandmark,
          insurance_provider: insuranceProvider,
          insurance_member_no: insuranceMemberNo,
          next_of_kin_name: nextOfKinName,
          next_of_kin_phone: nextOfKinPhone,
          extra_contacts: extraContacts.filter((c) => c.name.trim()),
          preferred_hospital_id: preferredHospitalId,
          share_with_responders: shareWithResponders,
        }),
      });

      Alert.alert('Saved', 'Your health profile has been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Unable to save', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>Health Profile</Text>
          <Text style={styles.subtitle}>Your medical information</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : loadError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Unable to load your profile</Text>
          <Text style={styles.errorText}>{loadError}</Text>

          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.shareCard}>
              <View style={styles.shareTextWrap}>
                <Text style={styles.shareTitle}>Share with my response team</Text>
                <Text style={styles.shareDescription}>
                  When on, the ambulance driver and hospital staff handling your emergency can
                  see your health summary. When off, they see nothing.
                </Text>
              </View>

              <Switch
                value={shareWithResponders}
                onValueChange={setShareWithResponders}
                trackColor={{ false: '#354960', true: COLORS.green }}
                thumbColor={COLORS.white}
              />
            </View>

            <Text style={styles.sectionLabel}>BASIC INFORMATION</Text>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Phone number (read only)</Text>
              <Text style={styles.readOnly}>{phone || 'Not available'}</Text>
            </View>

            <Text style={styles.label}>Blood group</Text>
            <View style={styles.chipRow}>
              {BLOOD_TYPES.map((type) => (
                <Chip
                  key={type}
                  label={type}
                  selected={bloodType === type}
                  onPress={() => setBloodType(bloodType === type ? '' : type)}
                />
              ))}
            </View>

            {/* 'numeric' keypads on iOS have no "-" key, so use the default keyboard. */}
            <Field
              label="Date of birth (YYYY-MM-DD)"
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              placeholder="2002-04-15"
              keyboardType="default"
            />

            <Text style={styles.label}>Gender</Text>
            <View style={styles.chipRow}>
              {GENDERS.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  selected={gender === option}
                  onPress={() => setGender(gender === option ? '' : option)}
                />
              ))}
            </View>

            <View style={styles.twoColumns}>
              <View style={styles.column}>
                <Field
                  label="Height (cm)"
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="172"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.column}>
                <Field
                  label="Weight (kg)"
                  value={weightKg}
                  onChangeText={setWeightKg}
                  placeholder="68"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <Text style={styles.label}>Pregnancy status</Text>
            <View style={styles.chipRow}>
              {PREGNANCY.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  selected={pregnancyStatus === option}
                  onPress={() => setPregnancyStatus(pregnancyStatus === option ? '' : option)}
                />
              ))}
            </View>

            <Text style={styles.sectionLabel}>MEDICAL DETAILS</Text>

            <Field
              label="Allergies"
              value={allergies}
              onChangeText={setAllergies}
              placeholder="For example penicillin, peanuts"
              multiline
            />

            <Field
              label="Chronic conditions"
              value={chronicConditions}
              onChangeText={setChronicConditions}
              placeholder="For example asthma, diabetes"
              multiline
            />

            <Text style={styles.label}>Medications</Text>
            {medications.map((item, index) => (
              <View key={`med-${index}`} style={styles.listCard}>
                <TextInput
                  style={styles.input}
                  value={item.name}
                  onChangeText={(value) => updateMedication(index, 'name', value)}
                  placeholder="Medication name"
                  placeholderTextColor="#718198"
                />
                <View style={styles.twoColumns}>
                  <TextInput
                    style={[styles.input, styles.column]}
                    value={item.dose}
                    onChangeText={(value) => updateMedication(index, 'dose', value)}
                    placeholder="Dose"
                    placeholderTextColor="#718198"
                  />
                  <TextInput
                    style={[styles.input, styles.column]}
                    value={item.frequency}
                    onChangeText={(value) => updateMedication(index, 'frequency', value)}
                    placeholder="How often"
                    placeholderTextColor="#718198"
                  />
                </View>
                <TouchableOpacity
                  onPress={() => setMedications((items) => items.filter((_, i) => i !== index))}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
            {medications.length < 20 && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() =>
                  setMedications((items) => [...items, { name: '', dose: '', frequency: '' }])
                }
              >
                <Text style={styles.addText}>+ Add medication</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.label}>Past surgeries</Text>
            {surgeries.map((item, index) => (
              <View key={`surgery-${index}`} style={styles.listCard}>
                <TextInput
                  style={styles.input}
                  value={item.procedure}
                  onChangeText={(value) => updateSurgery(index, 'procedure', value)}
                  placeholder="Procedure"
                  placeholderTextColor="#718198"
                />
                <TextInput
                  style={styles.input}
                  value={item.year}
                  onChangeText={(value) => updateSurgery(index, 'year', value)}
                  placeholder="Year"
                  placeholderTextColor="#718198"
                  keyboardType="numeric"
                  maxLength={4}
                />
                <TouchableOpacity
                  onPress={() => setSurgeries((items) => items.filter((_, i) => i !== index))}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
            {surgeries.length < 20 && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setSurgeries((items) => [...items, { procedure: '', year: '' }])}
              >
                <Text style={styles.addText}>+ Add surgery</Text>
              </TouchableOpacity>
            )}

            <Field
              label="Family medical history"
              value={familyHistory}
              onChangeText={setFamilyHistory}
              placeholder="Only hospital staff can see this"
              multiline
            />

            <Field
              label="Mobility needs"
              value={mobilityNeeds}
              onChangeText={setMobilityNeeds}
              placeholder="For example wheelchair, needs help on stairs"
              multiline
            />

            <Text style={styles.sectionLabel}>PICKUP AND INSURANCE</Text>

            <Field
              label="Home landmark"
              value={homeLandmark}
              onChangeText={setHomeLandmark}
              placeholder="A landmark near your home"
            />

            <Field
              label="Insurance provider"
              value={insuranceProvider}
              onChangeText={setInsuranceProvider}
              placeholder="Only hospital staff can see this"
            />

            <Field
              label="Insurance member number"
              value={insuranceMemberNo}
              onChangeText={setInsuranceMemberNo}
              placeholder="Only hospital staff can see this"
            />

            <Text style={styles.sectionLabel}>EMERGENCY CONTACTS</Text>

            <Field
              label="Next of kin name"
              value={nextOfKinName}
              onChangeText={setNextOfKinName}
              placeholder="Full name"
            />

            <Field
              label="Next of kin phone"
              value={nextOfKinPhone}
              onChangeText={setNextOfKinPhone}
              placeholder="0712 345 678"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Other contacts</Text>
            {extraContacts.map((item, index) => (
              <View key={`contact-${index}`} style={styles.listCard}>
                <TextInput
                  style={styles.input}
                  value={item.name}
                  onChangeText={(value) => updateContact(index, 'name', value)}
                  placeholder="Name"
                  placeholderTextColor="#718198"
                />
                <View style={styles.twoColumns}>
                  <TextInput
                    style={[styles.input, styles.column]}
                    value={item.relationship}
                    onChangeText={(value) => updateContact(index, 'relationship', value)}
                    placeholder="Relationship"
                    placeholderTextColor="#718198"
                  />
                  <TextInput
                    style={[styles.input, styles.column]}
                    value={item.phone}
                    onChangeText={(value) => updateContact(index, 'phone', value)}
                    placeholder="Phone"
                    placeholderTextColor="#718198"
                    keyboardType="phone-pad"
                  />
                </View>
                <TouchableOpacity
                  onPress={() => setExtraContacts((items) => items.filter((_, i) => i !== index))}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
            {extraContacts.length < 5 && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() =>
                  setExtraContacts((items) => [
                    ...items,
                    { name: '', relationship: '', phone: '' },
                  ])
                }
              >
                <Text style={styles.addText}>+ Add contact</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.disabledButton]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.saveText}>Save Health Profile</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  keyboard: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: COLORS.white, fontSize: 20 },
  title: { color: COLORS.white, fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  loader: { marginTop: 80 },
  container: { padding: 20, paddingBottom: 50 },
  shareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  shareTextWrap: { flex: 1 },
  shareTitle: { color: COLORS.white, fontSize: 14, fontWeight: 'bold' },
  shareDescription: { color: COLORS.muted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  sectionLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginTop: 26,
    marginBottom: 4,
  },
  fieldWrap: { marginTop: 4 },
  label: {
    color: '#B9C9D9',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 7,
  },
  input: {
    minHeight: 50,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#354960',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.white,
    fontSize: 14,
  },
  inputMultiline: { minHeight: 80 },
  readOnly: { color: COLORS.muted, fontSize: 14, paddingVertical: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#354960',
    backgroundColor: COLORS.surface,
  },
  chipSelected: { borderColor: COLORS.primary, backgroundColor: '#3A1E2C' },
  chipText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  chipTextSelected: { color: COLORS.white },
  twoColumns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1 },
  listCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 13,
    padding: 12,
    gap: 10,
    marginBottom: 10,
  },
  removeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  addButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#354960',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  saveButton: {
    height: 55,
    backgroundColor: COLORS.primary,
    borderRadius: 13,
    marginTop: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: COLORS.white, fontSize: 14, fontWeight: '900' },
  disabledButton: { opacity: 0.6 },
  errorCard: {
    margin: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: 'center',
  },
  errorTitle: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  errorText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    borderRadius: 11,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: { color: COLORS.white, fontWeight: 'bold', fontSize: 13 },
});