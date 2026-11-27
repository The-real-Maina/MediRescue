import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
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
  green: '#35C98A',
};

interface MenuItemProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  onPress: () => void;
  last?: boolean;
}

const MenuItem = ({ icon, title, subtitle, onPress, last }: MenuItemProps) => (
  <TouchableOpacity
    style={[styles.menuItem, last && styles.menuItemLast]}
    onPress={onPress}
  >
    <View style={styles.menuIconContainer}>
      <Ionicons name={icon} size={22} color={COLORS.muted} />
    </View>
    <View style={styles.menuTextContainer}>
      <Text style={styles.menuTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const go = (path: string) => router.push(path as any);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } finally {
            router.replace('/');
          }
        },
      },
    ]);
  };

  const handleFeature = (feature: string) => {
    Alert.alert(feature, 'This feature is coming soon in the next update.');
  };

  const initials =
    (user?.name || 'User')
      .split(' ')
      .filter(Boolean)
      .map((n: string) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'U';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={() => handleFeature('Settings')}>
            <Ionicons name="settings-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.userInfoContainer}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.nameText}>{user?.name || 'MediRescue User'}</Text>
          {/* Fixed TS error by casting to any */}
          <Text style={styles.emailText}>{(user as any)?.email || 'user@medirescue.com'}</Text>

          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={COLORS.green} />
            <Text style={styles.verifiedText}>Account Verified</Text>
          </View>
        </View>

        <View style={styles.menuContainer}>
          <MenuItem
            icon="person-outline"
            title="Edit Profile"
            subtitle="Name, email and phone number"
            onPress={() => go('/edit-profile')}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            title="Security"
            subtitle="Password and account security"
            onPress={() => go('/security')}
          />
          <MenuItem
            icon="medkit-outline"
            title="Safety Guide"
            subtitle="Emergency protocols and guidance"
            onPress={() => go('/info?type=safety')}
          />
          <MenuItem
            icon="help-buoy-outline"
            title="Help & Support"
            subtitle="FAQs and contact support"
            onPress={() => go('/info?type=help')}
          />
          <MenuItem
            icon="information-circle-outline"
            title="About MediRescue"
            subtitle="Application and project information"
            onPress={() => go('/info?type=about')}
          />
          <MenuItem
            icon="document-text-outline"
            title="Terms & Privacy"
            subtitle="How we protect your information"
            onPress={() => go('/info?type=terms')}
            last
          />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>MediRescue v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  headerTitle: { color: COLORS.white, fontSize: 24, fontWeight: 'bold' },
  userInfoContainer: { alignItems: 'center', marginBottom: 30 },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  avatarText: { color: COLORS.white, fontSize: 32, fontWeight: 'bold' },
  nameText: { color: COLORS.white, fontSize: 22, fontWeight: 'bold' },
  emailText: { color: COLORS.muted, fontSize: 14, marginTop: 5 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#173E36',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 15,
  },
  verifiedText: { color: COLORS.green, fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
  menuContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 25,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  menuTextContainer: { flex: 1 },
  menuTitle: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  menuSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  logoutButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  logoutText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 16 },
  versionText: { color: '#4A5D75', textAlign: 'center', marginTop: 20, fontSize: 12 },
});