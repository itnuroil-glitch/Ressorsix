import { Platform } from 'react-native';

// For Web development, use the EXPO_PUBLIC_API_URL_WEB env variable.
// For Mobile devices/emulators, use the EXPO_PUBLIC_API_URL_MOBILE env variable.
export const API_URL = Platform.OS === 'web'
  ? (process.env.EXPO_PUBLIC_API_URL_WEB || 'http://localhost:5000')
  : (process.env.EXPO_PUBLIC_API_URL_MOBILE || 'http://192.168.0.104:5000');
