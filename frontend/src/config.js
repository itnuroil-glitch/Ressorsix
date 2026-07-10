import { Platform } from 'react-native';

export const API_URL =
  Platform.OS === 'web'
    ? process.env.EXPO_PUBLIC_API_URL_WEB ||
      process.env.REACT_APP_API_URL ||
      'http://localhost:5000'
    : process.env.EXPO_PUBLIC_API_URL_MOBILE ||
      'http://192.168.0.123:5000';
