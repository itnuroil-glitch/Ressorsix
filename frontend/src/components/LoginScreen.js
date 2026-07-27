import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
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

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Status & Feedback States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [upperBannerVisible, setUpperBannerVisible] = useState(true);

  // Screen View state: 'login' | 'forgot_password' | 'forgot_password_success'
  const [screenView, setScreenView] = useState('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailFocused, setResetEmailFocused] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Email format validation
  const validateEmail = (text) => {
    const emailRegex = /\S+@\S+\.\S+/;
    return emailRegex.test(text);
  };

  // Sign In action
  const handleSignIn = () => {
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!validateEmail(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    // Connect to Trakio Express API backend (PostgreSQL database auth)
    setLoading(true);
    fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })
      .then(async (res) => {
        const text = await res.text();
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch (e) {
          data = {};
        }
        if (!res.ok) {
          throw new Error(data.message || `Server returned error (${res.status}). Please verify backend logs.`);
        }
        return data;
      })
      .then((data) => {
        setLoading(false);
        // Successful authentication
        onLoginSuccess({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          roleId: data.user.roleId,
          clientid: data.user.clientid,
          companyid: data.user.companyid,
          associatedCompanyIds: data.user.associatedCompanyIds,
          createdAt: data.user.createdAt,
          token: data.token,
        });
      })
      .catch((error) => {
        setLoading(false);
        setErrorMessage(error.message || 'Connection error. Please ensure the Trakio backend server is running.');
      });
  };

  // Forgot password request action
  const handleForgotPasswordSubmit = () => {
    setErrorMessage('');

    if (!resetEmail.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!validateEmail(resetEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setResetLoading(true);
    fetch(`${API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: resetEmail }),
    })
      .then(async (res) => {
        const text = await res.text();
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch (e) {
          data = {};
        }
        if (!res.ok) {
          throw new Error(data.message || `Server returned error (${res.status}). Please try again.`);
        }
        return data;
      })
      .then(() => {
        setResetLoading(false);
        setScreenView('forgot_password_success');
      })
      .catch((error) => {
        setResetLoading(false);
        setErrorMessage(error.message || 'Connection error. Please try again.');
      });
  };

  // Return to Login screen helper
  const handleBackToLogin = () => {
    setErrorMessage('');
    setScreenView('login');
    setResetEmail('');
  };

  // Content for Forgot Password screen
  if (screenView === 'forgot_password') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContainer,
              isLargeScreen && styles.scrollContainerWeb,
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.card, isLargeScreen && styles.cardWeb]}>
              {/* Green Header Bar */}
              <View style={styles.cardHeader}>
                <View style={styles.headerTitleContainer}>
                  <MaterialCommunityIcons name="cube-outline" size={24} color={COLORS.white} />
                  <Text style={styles.headerTitle}>Trakio</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                {/* Back Button */}
                <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
                  <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
                  <Text style={styles.backButtonText}>Back to Login</Text>
                </TouchableOpacity>

                <Text style={styles.title}>Forgot Password?</Text>
                <Text style={styles.subtitle}>
                  Enter the email address associated with your Trakio account and we'll send you a password reset link.
                </Text>

                {errorMessage ? (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={20} color={COLORS.error} />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                {/* Input Field */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email Address</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      resetEmailFocused && styles.inputWrapperFocused,
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={resetEmailFocused ? COLORS.primary : COLORS.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="john.smith@email.com"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={resetEmail}
                      onChangeText={setResetEmail}
                      onFocus={() => setResetEmailFocused(true)}
                      onBlur={() => setResetEmailFocused(false)}
                    />
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.button, styles.shadowBtn]}
                  onPress={handleForgotPasswordSubmit}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <Text style={styles.buttonText}>Send Reset Link</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Content for Forgot Password SUCCESS confirmation screen
  if (screenView === 'forgot_password_success') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={[styles.scrollContainer, styles.centeredContent]}>
          <View style={[styles.card, isLargeScreen && styles.cardWeb, styles.successCard]}>
            <View style={styles.cardHeader}>
              <View style={styles.headerTitleContainer}>
                <MaterialCommunityIcons name="cube-outline" size={24} color={COLORS.white} />
                <Text style={styles.headerTitle}>Trakio</Text>
              </View>
            </View>

            <View style={[styles.cardBody, styles.centeredBody]}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
              </View>
              
              <Text style={styles.title}>Check Your Email</Text>
              <Text style={styles.successSubtitle}>
                We've sent a password reset link to <Text style={styles.boldText}>{resetEmail}</Text>. 
                Please check your inbox and follow the instructions to reset your password.
              </Text>

              <TouchableOpacity style={[styles.button, styles.backBtnFull]} onPress={handleBackToLogin}>
                <Text style={styles.buttonText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Main Login Screen
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            isLargeScreen && styles.scrollContainerWeb,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, isLargeScreen && styles.cardWeb]}>
            {/* Green Header Bar */}
            <View style={styles.cardHeader}>
              <View style={styles.headerTitleContainer}>
                <MaterialCommunityIcons name="cube-outline" size={24} color={COLORS.white} />
                <Text style={styles.headerTitle}>Trakio</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              {/* Welcome Title */}
              <Text style={styles.title}>Welcome to Trakio</Text>

              {/* Upper Alert Banner */}
              {upperBannerVisible && (
                <View style={styles.upperAlert}>
                  <View style={styles.alertContent}>
                    <Ionicons name="information-circle" size={20} color={COLORS.primary} style={styles.alertIcon} />
                    <Text style={styles.upperAlertText}>Login password has been sent to your email</Text>
                  </View>
                  <TouchableOpacity onPress={() => setUpperBannerVisible(false)} style={styles.alertClose}>
                    <Ionicons name="close" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Error Message display */}
              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={20} color={COLORS.error} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* Form Input fields */}
              <View style={styles.formContainer}>
                {/* Email Field */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      emailFocused && styles.inputWrapperFocused,
                    ]}
                  >
                    <TextInput
                      style={styles.input}
                      placeholder="john.smith@email.com"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        if (errorMessage) setErrorMessage('');
                      }}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                    />
                  </View>
                </View>

                {/* Password Field */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      passwordFocused && styles.inputWrapperFocused,
                    ]}
                  >
                    <TextInput
                      style={styles.input}
                      placeholder="********"
                      placeholderTextColor={COLORS.textMuted}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (errorMessage) setErrorMessage('');
                      }}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                        size={20}
                        color={COLORS.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Sign In Button */}
                <TouchableOpacity
                  style={[styles.button, styles.shadowBtn]}
                  onPress={handleSignIn}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <Text style={styles.buttonText}>Sign In</Text>
                  )}
                </TouchableOpacity>

                {/* Forgot Password Link */}
                <TouchableOpacity
                  style={styles.forgotPassword}
                  onPress={() => {
                    setScreenView('forgot_password');
                    setErrorMessage('');
                  }}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {/* Lower Info Banner */}
              <View style={styles.lowerInfoBanner}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={COLORS.textSecondary}
                  style={styles.lowerInfoIcon}
                />
                <Text style={styles.lowerInfoText}>
                  Temporary password has been sent to your email. Log in with this temporary password and follow the instructions.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  scrollContainerWeb: {
    paddingVertical: SPACING.xxl,
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
    maxWidth: 420,
  },
  successCard: {
    paddingBottom: SPACING.lg,
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
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  successSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  boldText: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  upperAlert: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primaryTint,
    borderRadius: 8,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#D4E6DF',
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: SPACING.xs,
  },
  alertIcon: {
    marginRight: SPACING.sm,
    color: COLORS.primary,
  },
  upperAlertText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
    flex: 1,
  },
  alertClose: {
    padding: SPACING.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEB',
    borderWidth: 1,
    borderColor: '#F5C2C2',
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: SPACING.sm,
    flex: 1,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs + 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    height: 48,
    paddingHorizontal: SPACING.md,
  },
  inputWrapperFocused: {
    borderColor: COLORS.borderFocus,
    backgroundColor: COLORS.white,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 1px 2px rgba(27, 62, 48, 0.1)' }
      : {
          shadowColor: COLORS.primary,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
        }),
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    height: '100%',
    color: COLORS.textPrimary,
    fontSize: 15,
    ...(Platform.OS === 'web' && { outlineStyle: 'none' }), // Remove web outline
  },
  eyeIcon: {
    padding: SPACING.xs,
  },
  button: {
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  backBtnFull: {
    width: '100%',
    maxWidth: 300,
  },
  shadowBtn: {
    ...SHADOWS.button,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  forgotPassword: {
    alignSelf: 'center',
    paddingVertical: SPACING.xs,
  },
  forgotPasswordText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  lowerInfoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: SPACING.md,
    backgroundColor: '#F9FAFB',
    marginTop: SPACING.lg + 4,
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.xs,
  },
  backButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: SPACING.xs,
  },
  successIconContainer: {
    marginBottom: SPACING.md,
    backgroundColor: '#E8F5E9',
    padding: SPACING.md,
    borderRadius: 50,
  },
});
