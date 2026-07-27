import { Platform } from 'react-native';

const getApiUrl = () => {
  // On Web platform, dynamically use browser window location hostname so LAN & external IP access always routes API calls to host server
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location && window.location.hostname) {
    const protocol = window.location.protocol && window.location.protocol.startsWith('https') ? 'https:' : 'http:';
    const hostname = window.location.hostname;

    // If deployed on cloud environments (like Render or standard HTTPS domains), do NOT append port 5000
    if (hostname.includes('onrender.com') || (protocol === 'https:' && !hostname.includes('localhost') && !hostname.match(/^\d+\.\d+\.\d+\.\d+$/))) {
      return `${protocol}//${hostname}`;
    }

    return `${protocol}//${hostname}:5000`;
  }

  if (Platform.OS === 'web') {
    if (process.env.EXPO_PUBLIC_API_URL_WEB) {
      return process.env.EXPO_PUBLIC_API_URL_WEB;
    }
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
    return 'http://localhost:5000';
  }

  return (
    process.env.EXPO_PUBLIC_API_URL_MOBILE ||
    'http://192.168.0.14:5000'
  );
};

export const API_URL = getApiUrl();
