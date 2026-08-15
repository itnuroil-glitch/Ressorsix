import { Platform } from 'react-native';

const getApiUrl = () => {
  // 1. Check environment variables FIRST
  if (process.env.EXPO_PUBLIC_API_URL_WEB) {
    return process.env.EXPO_PUBLIC_API_URL_WEB;
  }
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // 2. Dynamic environment detection for Web
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location && window.location.hostname) {
    const protocol = window.location.protocol && window.location.protocol.startsWith('https') ? 'https:' : 'http:';
    const hostname = window.location.hostname;

    // If running locally (localhost / 127.0.0.1 / local IP), connect to port 5000
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      return `${protocol}//${hostname}:5000`;
    }

    // Default for live production site on Render
    return 'https://ressoxis-backend.onrender.com';
  }

  return (
    process.env.EXPO_PUBLIC_API_URL_MOBILE ||
    'https://ressoxis-backend.onrender.com'
  );
};

export const API_URL = getApiUrl();
