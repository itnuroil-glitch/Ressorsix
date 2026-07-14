import { Platform } from 'react-native';

// For Web development, localhost is preferred and extremely reliable.
// For mobile devices/emulators, we use the machine's current local IP.
export const API_URL = Platform.OS === 'web'
  ? 'http://localhost:5000'
  : 'http://192.168.0.104:5000';
