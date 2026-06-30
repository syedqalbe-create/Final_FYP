import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { AppText as Text } from '../../components/common/AppText';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppAlert } from '../../contexts/AppAlertContext';
import { getMyUserProfile } from '../../services/userService';

const LoginScreen = () => {
  const { login, loginWithGoogle, requestWelcomeBack } = useAuth();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  useRoute<any>();
  const { alert } = useAppAlert();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const { width, height } = useWindowDimensions();
  const isSmallScreen = height < 640 || width < 360;
  const spacing = isSmallScreen ? { logo: 16, title: 12, input: 12, button: 16 } : { logo: 32, title: 20, input: 20, button: 24 };
  const logoSize = isSmallScreen ? { width: 160, height: 96 } : { width: 200, height: 120 };

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      setSubmitting(true);
      const { emailVerified } = await login(email, password);

      if (!emailVerified) {
        alert(
          'Verify your account',
          'We sent a verification email. Please verify your email before logging in. Then return here and tap Sign In again (or use the “I’ve verified” button).',
        );
        return;
      }
      let isAdmin = false;
      try {
        const profile = await getMyUserProfile();
        isAdmin = profile?.role === 'admin';
      } catch {
        // ignore role lookup failures; default to user flow
      }

      if (isAdmin) {
        requestWelcomeBack();
        navigation.reset({
          index: 0,
          routes: [{ name: 'AdminTabs' }],
        });
        return;
      }

      // Always land on the main page (Home) after login, in one shot.
      // MainTabs has animation disabled in AppNavigator to avoid a second swipe/transition.
      requestWelcomeBack();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
        }),
      );
    } catch (error: any) {
      console.error(error);
      let errorMessage = 'An error occurred during login';

      if (error.code === 'auth/invalid-email') {
        errorMessage = 'That email address is invalid!';
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid credentials provided';
      }

      alert('Login Failed', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleGoogleSignIn = async () => {
    try {
      setSubmitting(true);
      const { emailVerified } = await loginWithGoogle();
      if (!emailVerified) {
        alert('Verify your account', 'Please verify your email before using the app.');
        return;
      }

      // Check if user is admin
      let isAdmin = false;
      try {
        const profile = await getMyUserProfile();
        isAdmin = profile?.role === 'admin';
      } catch {
        // ignore role lookup failures; default to user flow
      }

      if (isAdmin) {
        requestWelcomeBack();
        navigation.reset({
          index: 0,
          routes: [{ name: 'AdminTabs' }],
        });
        return;
      }

      // Regular users go to MainTabs
      requestWelcomeBack();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
        }),
      );
    } catch (e: any) {
      // Don't show alert for user cancellation - it's expected behavior
      if (
        e?.code === 'SIGN_IN_CANCELLED' ||
        e?.message?.includes('cancelled') ||
        e?.message?.includes('canceled')
      ) {
        // User cancelled - no need to show error
        return;
      }
      // Show user-friendly error message (already filtered in authService)
      alert('Google Sign-In', e?.message ?? 'Sign-in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <StatusBar
          barStyle={colors.background === '#000000' ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
          translucent={false}
        />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 24 + (isSmallScreen ? 20 : 0) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.logoContainer, { marginBottom: spacing.logo }]}>
            <Image
              source={
                isDark
                  ? require('../../assets/images/Shop360White.png')
                  : require('../../assets/images/Shop360Black.png')
              }
              style={[styles.logoImage, logoSize]}
              resizeMode="contain"
            />
          </View>

          <Text style={[styles.welcomeText, { color: colors.text }, isSmallScreen && styles.welcomeTextSmall]}>
            Vision AR
          </Text>
          <Text
            style={[
              styles.subtitleText,
              { color: colors.textSecondary },
              { marginBottom: spacing.title },
            ]}
          >
            Sign in to your account
          </Text>

          <View style={[styles.inputContainer, { marginBottom: spacing.input }]}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isEmailFocused && { borderColor: colors.primary },
                isSmallScreen && styles.inputWrapperSmall,
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={isSmallScreen ? 18 : 20}
                color={colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }, isSmallScreen && styles.inputSmall]}
                placeholder="Enter your email"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!submitting}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
              />
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Password</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isPasswordFocused && { borderColor: colors.primary },
                isSmallScreen && styles.inputWrapperSmall,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={isSmallScreen ? 18 : 20}
                color={colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }, isSmallScreen && styles.inputSmall]}
                placeholder="Enter your password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!submitting}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
              />
              <TouchableOpacity onPress={toggleShowPassword} style={styles.eyeIcon}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={isSmallScreen ? 18 : 20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.forgotPasswordContainer}
              onPress={() => navigation.navigate('ForgotPassword', { email })}
              disabled={submitting}
            >
              <Text style={[styles.forgotPasswordText, { color: colors.textSecondary }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary }, { marginBottom: spacing.button }, isSmallScreen && styles.buttonSmall]}
            onPress={handleLogin}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.loginButtonText, { color: colors.background }]}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.socialLoginContainer}>
            <TouchableOpacity
              style={[
                styles.socialButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isSmallScreen && styles.buttonSmall,
              ]}
              onPress={handleGoogleSignIn}
              disabled={submitting}
            >
              <Ionicons name="logo-google" size={isSmallScreen ? 18 : 20} color={colors.textSecondary} />
              <Text style={[styles.socialButtonText, { color: colors.text }]}>Google</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.signupContainer}>
            <Text style={[styles.signupText, { color: colors.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={[styles.signupLink, { color: colors.primary }]}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight ?? 0) + 20,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    width: 200,
    height: 120,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 20,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  welcomeTextSmall: {
    fontSize: 24,
    marginTop: 12,
  },
  subtitleText: {
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputWrapperSmall: {
    height: 48,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 0.3,
    height: '100%',
  },
  inputSmall: {
    fontSize: 15,
  },
  eyeIcon: {
    padding: 8,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  loginButton: {
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSmall: {
    height: 48,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '400',
  },
  socialLoginContainer: {
    marginBottom: 24,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    height: 56,
    borderWidth: 1,
  },
  socialButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
    fontWeight: '400',
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen;
