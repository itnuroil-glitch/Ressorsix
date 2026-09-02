import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { API_URL } from '../config';

export default function LoginScreen({ onLoginSuccess }) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 480;

  // Flow State: 'IDLE' | 'ENTER_EMAIL' | 'WAITING_APPROVAL' | 'SUCCESS' | 'ERROR' | 'NORMAL_LOGIN'
  const [approvalStage, setApprovalStage] = useState('IDLE');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [challengeId, setChallengeId] = useState(null);
  const [matchCode, setMatchCode] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(90);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const pollIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      stopPollingAndTimer();
    };
  }, []);

  const stopPollingAndTimer = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Check URL query parameters for access denied / error state from Authentik redirect
  const isAccessDenied = typeof window !== 'undefined' &&
    (window.location.search.includes('access_denied') || window.location.pathname.includes('/403'));

  const handleSignInWithAuthentik = () => {
    setLoading(true);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = `${API_URL}/auth/login`;
    }
  };

  // Initiate Push Approval Flow
  const handleStartApproval = async () => {
    if (!emailInput || !emailInput.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch(`${API_URL}/api/auth/approval/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim() }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        setLoading(false);
        setErrorMessage(data.message || 'Failed to send approval request to mobile device.');
        setApprovalStage('ERROR');
        return;
      }

      setChallengeId(data.challengeId);
      setMatchCode(data.matchCode);
      setTimerSeconds(90);
      setApprovalStage('WAITING_APPROVAL');
      setLoading(false);

      // Start Countdown Timer
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            stopPollingAndTimer();
            setApprovalStage('ERROR');
            setErrorMessage('Approval request timed out after 90 seconds. Please try again.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start Polling Status every 2.5 seconds
      pollIntervalRef.current = setInterval(() => {
        pollStatus(data.challengeId);
      }, 2500);

    } catch (err) {
      setLoading(false);
      setErrorMessage('Network error while connecting to server. Please try again.');
      setApprovalStage('ERROR');
    }
  };

  // Poll Approval Challenge Status
  const pollStatus = async (cId) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/approval/status/${cId}`, {
        credentials: 'include',
      });
      const data = await res.json();

      if (data.status === 'approved') {
        stopPollingAndTimer();
        setApprovalStage('WAITING_APPROVAL');
        setLoading(true);
        verifyCode(data.code);
      } else if (data.status === 'denied') {
        stopPollingAndTimer();
        setApprovalStage('ERROR');
        setErrorMessage('Sign-in request was denied on your mobile device.');
      } else if (data.status === 'expired') {
        stopPollingAndTimer();
        setApprovalStage('ERROR');
        setErrorMessage('Approval challenge has expired. Please try again.');
      }
    } catch (err) {
      console.warn('Status polling error:', err);
    }
  };

  // Verify Code & Create Session
  const verifyCode = async (code) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/approval/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
        credentials: 'include',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setApprovalStage('SUCCESS');
        if (onLoginSuccess && data.user) {
          onLoginSuccess(data.user);
        } else if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      } else {
        setLoading(false);
        setApprovalStage('ERROR');
        setErrorMessage(data.message || 'Verification failed. Could not verify mobile approval token.');
      }
    } catch (err) {
      setLoading(false);
      setApprovalStage('ERROR');
      setErrorMessage('Server error during token verification.');
    }
  };

  const handleNormalLogin = async () => {
    if (!emailInput || !emailInput.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!passwordInput) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim(), password: passwordInput }),
        credentials: 'include',
      });

      const data = await res.json();

      if (res.ok && data.user) {
        setLoading(false);
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        } else if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      } else {
        setLoading(false);
        setErrorMessage(data.message || 'Invalid email or password.');
      }
    } catch (err) {
      setLoading(false);
      setErrorMessage('Network error while connecting to server.');
    }
  };

  const handleResetApproval = () => {
    stopPollingAndTimer();
    setApprovalStage('IDLE');
    setErrorMessage('');
    setPasswordInput('');
    setLoading(false);
  };

  if (isAccessDenied) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.centeredContent}>
          <View style={[styles.card, isLargeScreen && styles.cardWeb]}>
            <View style={styles.cardHeader}>
              <View style={styles.headerTitleContainer}>
                <MaterialCommunityIcons name="cube-outline" size={24} color={COLORS.white} />
                <Text style={styles.headerTitle}>Trakio</Text>
              </View>
            </View>

            <View style={[styles.cardBody, styles.centeredBody]}>
              <View style={styles.deniedIconContainer}>
                <Ionicons name="close-circle" size={54} color={COLORS.error} />
              </View>

              <Text style={styles.title}>Access Denied</Text>
              <Text style={styles.deniedMessage}>
                Access to this application has not been provisioned. Contact your administrator.
              </Text>

              <TouchableOpacity
                style={[styles.button, styles.shadowBtn]}
                onPress={() => {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/';
                  }
                }}
              >
                <Text style={styles.buttonText}>Return to Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.centeredContent}>
        <View style={[styles.card, isLargeScreen && styles.cardWeb]}>
          {/* Header Bar */}
          <View style={styles.cardHeader}>
            <View style={styles.headerTitleContainer}>
              <MaterialCommunityIcons name="cube-outline" size={24} color={COLORS.white} />
              <Text style={styles.headerTitle}>Trakio</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            {/* Welcome Title */}
            <Text style={styles.title}>Welcome to Trakio</Text>
            <Text style={styles.subtitle}>
              Enterprise asset management — choose your preferred sign-in method
            </Text>

            {/* STAGE 1: IDLE / METHOD SELECTION */}
            {approvalStage === 'IDLE' && (
              <View style={styles.methodContainer}>
                {/* Option A: OrbisHub Mobile Push Approval */}
                <TouchableOpacity
                  style={[styles.button, styles.shadowBtn, styles.orbisButton]}
                  onPress={() => setApprovalStage('ENTER_EMAIL')}
                  activeOpacity={0.85}
                >
                  <View style={styles.btnContent}>
                    <Ionicons name="phone-portrait-outline" size={22} color={COLORS.white} style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Approve with OrbisHub app</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Option B: Standard Authentik OIDC SSO */}
                <TouchableOpacity
                  style={[styles.button, styles.shadowBtn, styles.ssoButton]}
                  onPress={handleSignInWithAuthentik}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <View style={styles.btnContent}>
                      <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                      <Text style={styles.buttonText}>Sign in with Authentik SSO</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Option C: Standard Normal Email & Password Login */}
                <TouchableOpacity
                  style={[styles.button, styles.shadowBtn, styles.normalButton]}
                  onPress={() => {
                    setErrorMessage('');
                    setApprovalStage('NORMAL_LOGIN');
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.btnContent}>
                    <Ionicons name="key-outline" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Sign in with Email & Password</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* STAGE: NORMAL EMAIL & PASSWORD LOGIN */}
            {approvalStage === 'NORMAL_LOGIN' && (
              <View style={styles.stageContainer}>
                <Text style={styles.inputLabel}>Email Address:</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. admin@example.com"
                  placeholderTextColor="#94A3B8"
                  value={emailInput}
                  onChangeText={setEmailInput}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoFocus
                />

                <Text style={styles.inputLabel}>Password:</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#94A3B8"
                  value={passwordInput}
                  onChangeText={setPasswordInput}
                  secureTextEntry
                />

                {errorMessage ? (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.button, styles.shadowBtn, styles.normalButton]}
                  onPress={handleNormalLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <View style={styles.btnContent}>
                      <Ionicons name="log-in-outline" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                      <Text style={styles.buttonText}>Sign In</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.backBtn} onPress={handleResetApproval}>
                  <Text style={styles.backBtnText}>← Back to all sign-in options</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STAGE 2: ENTER EMAIL FOR PUSH APPROVAL */}
            {approvalStage === 'ENTER_EMAIL' && (
              <View style={styles.stageContainer}>
                <Text style={styles.inputLabel}>Enter your work email address:</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. john.smith@company.com"
                  placeholderTextColor="#94A3B8"
                  value={emailInput}
                  onChangeText={setEmailInput}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoFocus
                />

                {errorMessage ? (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.button, styles.shadowBtn, styles.orbisButton]}
                  onPress={handleStartApproval}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <View style={styles.btnContent}>
                      <Ionicons name="send-outline" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
                      <Text style={styles.buttonText}>Send Push Approval</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.backBtn} onPress={handleResetApproval}>
                  <Text style={styles.backBtnText}>← Back to all sign-in options</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STAGE 3: WAITING FOR MOBILE APPROVAL WITH 2-DIGIT MATCH CODE */}
            {approvalStage === 'WAITING_APPROVAL' && (
              <View style={styles.stageContainer}>
                <Text style={styles.pollingSubtitle}>
                  Check your phone. A push notification has been sent to your enrolled OrbisHub mobile app.
                </Text>

                {/* 2-Digit Match Code Card */}
                <View style={styles.matchCodeCard}>
                  <Text style={styles.matchCodeLabel}>CONFIRM MATCH CODE</Text>
                  <Text style={styles.matchCodeValue}>{matchCode || '--'}</Text>
                  <Text style={styles.matchCodeHint}>
                    Confirm that this code matches what appears on your mobile device.
                  </Text>
                </View>

                <View style={styles.timerRow}>
                  <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.timerText}>Waiting for approval ({timerSeconds}s remaining)</Text>
                </View>

                <TouchableOpacity style={styles.backBtn} onPress={handleResetApproval}>
                  <Text style={styles.backBtnText}>Cancel & return to sign-in options</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STAGE 4: ERROR / DENIED / TIMEOUT */}
            {approvalStage === 'ERROR' && (
              <View style={styles.stageContainer}>
                <View style={styles.errorIconContainer}>
                  <Ionicons name="alert-circle" size={48} color="#DC2626" />
                </View>
                <Text style={styles.errorTitle}>Push Approval Failed</Text>
                <Text style={styles.errorDescription}>{errorMessage}</Text>

                <TouchableOpacity
                  style={[styles.button, styles.shadowBtn, styles.orbisButton]}
                  onPress={() => setApprovalStage('ENTER_EMAIL')}
                >
                  <Text style={styles.buttonText}>Try Approval Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.shadowBtn, styles.ssoButton]}
                  onPress={handleSignInWithAuthentik}
                >
                  <Text style={styles.buttonText}>Sign in with Authentik SSO</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.backBtn} onPress={handleResetApproval}>
                  <Text style={styles.backBtnText}>Back to start</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Lower Info Banner */}
            <View style={styles.lowerInfoBanner}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={COLORS.textSecondary}
                style={styles.lowerInfoIcon}
              />
              <Text style={styles.lowerInfoText}>
                User accounts are pre-provisioned by system administrators. Contact your manager if you require access.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  cardWeb: {
    maxWidth: 460,
  },
  cardHeader: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md + 4,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: SPACING.lg,
  },
  centeredBody: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  methodContainer: {
    marginVertical: SPACING.xs,
  },
  stageContainer: {
    marginVertical: SPACING.xs,
    alignItems: 'center',
  },
  deniedIconContainer: {
    marginBottom: SPACING.md,
    backgroundColor: '#FFEBEB',
    padding: SPACING.md,
    borderRadius: 50,
  },
  deniedMessage: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  button: {
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    width: '100%',
  },
  orbisButton: {
    backgroundColor: '#2563EB', // Vibrant Orbis Blue
  },
  ssoButton: {
    backgroundColor: '#1B3E30', // Deep Trakio Green
  },
  normalButton: {
    backgroundColor: '#334155', // Slate Dark Gray for Normal Email/Password Login
  },
  shadowBtn: {
    ...SHADOWS.button,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: SPACING.md,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  inputLabel: {
    alignSelf: 'flex-start',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  textInput: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: '#F8FAFC',
    marginBottom: SPACING.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.md,
    width: '100%',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    flex: 1,
  },
  pollingSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  matchCodeCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 12,
    padding: SPACING.md + 4,
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING.md,
  },
  matchCodeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  matchCodeValue: {
    fontSize: 44,
    fontWeight: '900',
    color: '#1E40AF',
    letterSpacing: 4,
    marginVertical: 4,
  },
  matchCodeHint: {
    fontSize: 12,
    color: '#3B82F6',
    textAlign: 'center',
    marginTop: 4,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  timerText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  backBtn: {
    paddingVertical: SPACING.xs,
  },
  backBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  errorIconContainer: {
    marginBottom: SPACING.xs,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  errorDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  lowerInfoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: SPACING.md,
    backgroundColor: '#F9FAFB',
    marginTop: SPACING.md,
  },
  lowerInfoIcon: {
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  lowerInfoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
});
