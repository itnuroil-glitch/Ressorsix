import { Platform } from 'react-native';

const getApiUrl = () => {
  if (Platform.OS === 'web') {
    // Dynamically use the hostname of the browser to allow accessing the web app from other devices on the LAN
    const hostname = typeof window !== 'undefined' && window.location && window.location.hostname
      ? window.location.hostname
      : 'localhost';
    return `http://${hostname}:5000`;
  }

  // For mobile devices/emulators, we use the machine's current local IP.
  return 'http://192.168.0.14:5000';
};

export const API_URL = getApiUrl();
