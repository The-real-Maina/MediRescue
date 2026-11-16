
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'medirescue_auth_token';
const USER_KEY = 'medirescue_auth_user';

export interface AuthUser {
  id: number;
  name: string;
  role: string;
  hospital_id: number | null;
  must_change_password?: boolean | number;
}

export const authStorage = {
  async saveSession(token: string, user: AuthUser): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  },

  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
  },

  async getUser(): Promise<AuthUser | null> {
    const user = await SecureStore.getItemAsync(USER_KEY);

    if (!user) {
      return null;
    }

    try {
      return JSON.parse(user) as AuthUser;
    } catch {
      await SecureStore.deleteItemAsync(USER_KEY);
      return null;
    }
  },

  async clearSession(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  },
};
