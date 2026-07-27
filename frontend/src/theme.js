import { Platform } from 'react-native';

export const COLORS = {
  primary: '#1B3E30',       // Rich dark forest green
  primaryLight: '#2A5D49',  // Lighter forest green for press state
  primaryTint: '#F0F5F2',   // Very soft green tint for banners
  textPrimary: '#1A202C',   // Charcoal for main headers/text
  textSecondary: '#4A5568', // Slate grey for labels
  textMuted: '#A0AEC0',     // Light grey for placeholders
  border: '#E2E8F0',        // Light grey border
  borderFocus: '#1B3E30',   // Green border on input focus
  background: '#F3F4F6',    // Soft off-white screen background (like the image)
  cardBg: '#FFFFFF',        // White background for the card
  white: '#FFFFFF',
  error: '#E53E3E',         // Premium soft red for errors
  success: '#38A169',       // Premium green for success
  info: '#2B6CB0',          // Premium blue for alerts
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const SHADOWS = {
  card: Platform.OS === 'web' ? {
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.08)',
  } : {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  button: Platform.OS === 'web' ? {
    boxShadow: '0px 2px 4px rgba(27, 62, 48, 0.15)',
  } : {
    shadowColor: '#1B3E30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
};

