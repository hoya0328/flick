import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
};

const webStorage = {
  getItem: (key: string) =>
    typeof window === 'undefined' ? Promise.resolve(null) : AsyncStorage.getItem(key),
  removeItem: (key: string) =>
    typeof window === 'undefined' ? Promise.resolve() : AsyncStorage.removeItem(key),
  setItem: (key: string, value: string) =>
    typeof window === 'undefined' ? Promise.resolve() : AsyncStorage.setItem(key, value),
};

export const authStorage = Platform.OS === 'web' ? webStorage : secureStorage;
