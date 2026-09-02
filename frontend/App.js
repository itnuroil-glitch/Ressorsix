import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, Text } from 'react-native';
import LoginScreen from './src/components/LoginScreen';
import DashboardScreen from './src/components/DashboardScreen';
import { COLORS } from './src/theme';
import { API_URL } from './src/config';

// Polyfill crypto.randomUUID for non-secure HTTP / IP contexts
if (typeof window !== 'undefined') {
  if (!window.crypto) {
    window.crypto = {};
  }
  if (!window.crypto.randomUUID) {
    window.crypto.randomUUID = function () {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };
  }
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("App Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{flex: 1, padding: 20, backgroundColor: '#fff', justifyContent: 'center'}}>
          <Text style={{fontSize: 20, color: 'red', marginBottom: 10}}>App Crashed!</Text>
          <Text style={{fontSize: 14, color: '#333'}}>{this.state.error?.toString()}</Text>
          <Text style={{fontSize: 12, color: '#666', marginTop: 10}}>{this.state.errorInfo?.componentStack}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user session from server-side Authentik OIDC session on initial render
  useEffect(() => {
    async function checkAuthSession() {
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.user) {
            setUser(data.user);
            if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
              localStorage.setItem('trakio_user', JSON.stringify(data.user));
            }
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
          if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
            localStorage.removeItem('trakio_user');
          }
        }
      } catch (error) {
        console.warn('Session verification error:', error);
        // Fallback to stored user if offline
        try {
          if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
            const storedUser = localStorage.getItem('trakio_user');
            if (storedUser) {
              setUser(JSON.parse(storedUser));
            }
          }
        } catch (e) {}
      } finally {
        setLoading(false);
      }
    }

    checkAuthSession();
  }, []);

  // Authentication callbacks
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem('trakio_user', JSON.stringify(userData));
      }
    } catch (error) { }
  };

  const handleSignOut = () => {
    setUser(null);
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.removeItem('trakio_user');
      }
    } catch (error) { }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = `${API_URL}/auth/logout`;
    }
  };

  if (loading) {
    return (
      <View style={[styles.appContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View style={styles.appContainer}>
        {user ? (
          <DashboardScreen user={user} onSignOut={handleSignOut} />
        ) : (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        )}
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
