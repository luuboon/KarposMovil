import * as SecureStore from 'expo-secure-store';

export class TokenManager {
  static async saveTokens(accessToken: string, refreshToken: string) {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
  }

  static async getAccessToken() {
    return await SecureStore.getItemAsync('accessToken');
  }

  static async getRefreshToken() {
    return await SecureStore.getItemAsync('refreshToken');
  }

  static async clearTokens() {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
  }
} 