import { Platform } from 'react-native';

const getApiUrl = () => {
  // 1. Check explicitly set environment variables FIRST (for production cloud deployments like Render)
  if (process.env.EXPO_PUBLIC_API_URL_WEB) {
    return process.env.EXPO_PUBLIC_API_URL_WEB;
  }
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // 2. Local development dynamic hostname detection for Web
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location && window.location.hostname) {
    const protocol = window.location.protocol && window.location.protocol.startsWith('https') ? 'https:' : 'http:';
    const hostname = window.location.hostname;

    // If running on local network / localhost, route to port 5000
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      return `${protocol}//${hostname}:5000`;
    }

    return `${protocol}//${hostname}`;
  }

  return (
    process.env.EXPO_PUBLIC_API_URL_MOBILE ||
    'http://192.168.0.14:5000'
  );
};

export const API_URL = getApiUrl();
