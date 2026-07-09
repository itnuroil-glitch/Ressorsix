import { Platform } from 'react-native';

// For Web development, use the EXPO_PUBLIC_API_URL_WEB env variable.
// For Mobile devices/emulators, use the EXPO_PUBLIC_API_URL_MOBILE env variable.
export const API_URL = (() => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // If accessed via a local network IP (not localhost), dynamically point to port 5000 on that IP
    if (window.location.hostname !== 'localhost') {
      return `${window.location.protocol}//${window.location.hostname}:5000`;
    }
  }
  return Platform.OS === 'web'
    ? (process.env.EXPO_PUBLIC_API_URL_WEB || process.env.REACT_APP_API_URL || 'http://localhost:5000')
    : (process.env.EXPO_PUBLIC_API_URL_MOBILE || 'http://192.168.0.123:5000');
})();
