import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
  Linking,
} from 'react-native';
import { AppText as Text } from '../../components/common/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppAlert } from '../../contexts/AppAlertContext';
import { useFontSize } from '../../contexts/FontSizeContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  storeNotificationPreferences,
  getNotificationPreferences,
  clearAllStorage,
} from '../../utils/storage';
import { clearAvatarCache } from '../../utils/avatarUtils';
import { PermissionsAndroid } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

const SettingsScreen = () => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { alert } = useAppAlert();
  const navigation = useNavigation<any>();
  const { preset, setPreset } = useFontSize();
  const { user, linkGoogleAccount } = useAuth();
  const [locationEnabled, setLocationEnabled] = useState<boolean>(true);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const isGuest = !user;

  const [isClearing, setIsClearing] = useState(false);
  const [fontPickerOpen, setFontPickerOpen] = useState(false);

  // Load saved preferences (best-effort)
  useEffect(() => {
    const loadPreferences = async () => {
      const savedPreferences = await getNotificationPreferences();
      if (savedPreferences) {
        setLocationEnabled(savedPreferences.locationServices ?? true);
      }
    };
    loadPreferences();
  }, []);

  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        // Check current permission status
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );

        if (hasPermission) {
          return true;
        }

        // Request permission with proper Android options
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message:
              'Vision AR needs access to your location to help you add delivery addresses quickly and accurately. You can choose to allow access only while using the app or all the time.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Deny',
            buttonPositive: 'Allow',
          },
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          alert(
            'Permission Blocked',
            'Location permission has been blocked. Please enable it in Settings > Apps > Vision AR > Permissions > Location.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => Linking.openSettings(),
              },
            ],
          );
          return false;
        }
        return false;
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else {
      // iOS permissions
      try {
        const authStatus = await Geolocation.requestAuthorization('whenInUse');
        return authStatus === 'granted';
      } catch (error) {
        console.warn('iOS authorization error:', error);
        return false;
      }
    }
  };

  const checkLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const result = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        return result;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const persistLocation = async (next: boolean) => {
    if (next) {
      // Request permission when enabling
      const hasPermission = await checkLocationPermission();
      if (!hasPermission) {
        // Show informative dialog before requesting permission
        alert(
          'Enable Location Services',
          'Location services are used to help you add delivery addresses quickly by detecting your current location. You can choose to allow access only while using the app or all the time.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setLocationEnabled(false),
            },
            {
              text: 'Continue',
              onPress: async () => {
                const granted = await requestLocationPermission();
                if (granted) {
                  setLocationEnabled(true);
                  try {
                    await storeNotificationPreferences({ locationServices: true });
                  } catch {
                    // ignore
                  }
                } else {
                  setLocationEnabled(false);
                }
              },
            },
          ],
        );
        return;
      }
    } else {
      // When disabling, inform user about impact
      alert(
        'Disable Location Services',
        'Disabling location services will prevent the app from automatically detecting your location when adding addresses. You can still manually enter addresses.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setLocationEnabled(true),
          },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              setLocationEnabled(false);
              try {
                await storeNotificationPreferences({ locationServices: false });
              } catch {
                // ignore
              }
            },
          },
        ],
      );
      return;
    }

    setLocationEnabled(next);
    try {
      await storeNotificationPreferences({ locationServices: next });
    } catch {
      // ignore
    }
  };

  const handleClearCache = () => {
    alert(
      'Clear Cache',
      'Are you sure you want to clear all app data? This will remove your wishlist, cart, and other saved preferences.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsClearing(true);
              await clearAllStorage();
              // Clear in-memory caches too (AsyncStorage.clear() won't touch these).
              clearAvatarCache();
              alert('Success', 'Cache cleared successfully');
            } catch (error) {
              console.error('Clear cache error:', error);
              alert('Error', 'Failed to clear cache. Please try again.');
            } finally {
              setIsClearing(false);
            }
          },
        },
      ],
    );
  };

  const isGoogleLinked = () => {
    if (!user || !user.providerData) return false;
    return user.providerData.some((provider) => provider.providerId === 'google.com');
  };

  const promptAuth = (reason: string) => {
    alert('Sign in required', reason, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign In',
        onPress: () => navigation.navigate('Login', { redirectToTab: 'Profile' }),
      },
      {
        text: 'Create Account',
        onPress: () => navigation.navigate('Signup', { redirectToTab: 'Profile' }),
      },
    ]);
  };

  const handleLinkGoogle = async () => {
    if (!user) {
      promptAuth('Please sign in or create an account to link your Google account.');
      return;
    }

    // Check if Google is already linked
    if (isGoogleLinked()) {
      alert('Already linked', 'Your Google account is already linked to this account.');
      return;
    }

    // Check if user is logged in with email/password (not Google)
    const hasEmailPassword = user.providerData.some(
      (provider) => provider.providerId === 'password',
    );
    if (!hasEmailPassword) {
      alert(
        'Email account required',
        'Please link an email/password account first before linking Google.',
      );
      return;
    }

    setIsLinkingGoogle(true);
    try {
      await linkGoogleAccount();
      alert(
        'Success',
        'Google account linked successfully. You can now sign in with either email or Google.',
      );
    } catch (e: any) {
      // Handle user cancellation gracefully
      if (
        e?.code === 'SIGN_IN_CANCELLED' ||
        e?.message?.includes('cancelled') ||
        e?.message?.includes('canceled')
      ) {
        // User cancelled, don't show error
        return;
      }

      // Handle email mismatch
      if (e?.message?.includes('same email') || e?.code === 'auth/email-already-in-use') {
        alert(
          'Email mismatch',
          'The Google account email must match your current account email. Please choose the Google account with the same email address.',
        );
        return;
      }

      // Handle already linked (shouldn't happen due to check above, but just in case)
      if (e?.code === 'auth/provider-already-linked') {
        alert('Already linked', 'Your Google account is already linked.');
        return;
      }

      // Generic error
      const msg = e?.message ?? 'Failed to link Google account. Please try again.';
      alert('Error', msg);
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={colors.background === '#000000' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        translucent={false}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Theme (top) */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
        <View
          style={[styles.rowCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.rowLeft}>
            <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
              <Ionicons name="moon-outline" size={20} color={colors.text} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Dark Mode</Text>
              <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                Enable dark theme for the app
              </Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={() => toggleTheme()}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFF"
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.rowCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setFontPickerOpen(true)}
        >
          <View style={styles.rowLeft}>
            <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
              <Ionicons name="text-outline" size={20} color={colors.text} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Font size</Text>
              <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                {preset === 'xs'
                  ? 'Extra small'
                  : preset === 's'
                  ? 'Small'
                  : preset === 'm'
                  ? 'Medium'
                  : preset === 'l'
                  ? 'Large'
                  : 'Extra large'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Account cards */}
        {!isGuest && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
            <View style={styles.cardRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.actionCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => navigation.navigate('ChangeEmail')}
              >
                <View style={[styles.cardIcon, { backgroundColor: colors.background }]}>
                  <Ionicons name="mail-outline" size={20} color={colors.text} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Change Email</Text>
                <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                  Update your login email (verification required)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.actionCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => navigation.navigate('ChangePassword')}
              >
                <View style={[styles.cardIcon, { backgroundColor: colors.background }]}>
                  <Ionicons name="key-outline" size={20} color={colors.text} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Change Password</Text>
                <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                  Keep your account secure
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.rowCard,
                styles.linkGoogleCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={handleLinkGoogle}
              disabled={isLinkingGoogle}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                  <Ionicons name="logo-google" size={20} color={colors.text} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>
                    {isGoogleLinked() ? 'Google account linked' : 'Link Google account'}
                  </Text>
                  <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                    {isGoogleLinked()
                      ? 'You can sign in with Google or email'
                      : 'Add Google Sign-In to your existing account'}
                  </Text>
                </View>
              </View>
              {isLinkingGoogle ? (
                <ActivityIndicator color={colors.primary} />
              ) : isGoogleLinked() ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Remaining options */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Preferences</Text>

        <View
          style={[styles.rowCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.rowLeft}>
            <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
              <Ionicons name="location-outline" size={20} color={colors.text} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Location Services</Text>
              <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                Allow app to access your location
              </Text>
            </View>
          </View>
          <Switch
            value={locationEnabled}
            onValueChange={(v) => persistLocation(v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFF"
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.rowCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleClearCache}
          disabled={isClearing}
        >
          <View style={styles.rowLeft}>
            <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
              <Ionicons name="trash-outline" size={20} color={colors.text} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Clear Cache</Text>
              <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                Free up storage space
              </Text>
            </View>
          </View>
          {isClearing ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.rowCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.navigate('PrivacyPolicy')}
        >
          <View style={styles.rowLeft}>
            <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.text} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Privacy Policy</Text>
              <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                Read our privacy policy
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.rowCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.navigate('TermsOfService')}
        >
          <View style={styles.rowLeft}>
            <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
              <Ionicons name="document-text-outline" size={20} color={colors.text} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Terms of Service</Text>
              <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                Read our terms of service
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={fontPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFontPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setFontPickerOpen(false)}>
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => {}}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Font size</Text>
              <TouchableOpacity onPress={() => setFontPickerOpen(false)} activeOpacity={0.8}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {(
              [
                { key: 'xs', label: 'Extra small' },
                { key: 's', label: 'Small' },
                { key: 'm', label: 'Medium (default)' },
                { key: 'l', label: 'Large' },
                { key: 'xl', label: 'Extra large' },
              ] as const
            ).map((opt) => (
              <TouchableOpacity
                key={opt.key}
                activeOpacity={0.85}
                style={[styles.modalOption, { borderColor: colors.border }]}
                onPress={async () => {
                  await setPreset(opt.key);
                  setFontPickerOpen(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: colors.text }]}>{opt.label}</Text>
                <Ionicons
                  name={preset === opt.key ? 'checkmark' : 'chevron-forward'}
                  size={18}
                  color={preset === opt.key ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
            ))}

            <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
              This works together with your phone’s accessibility font size settings.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 36,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    marginTop: 14,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  rowDesc: {
    fontSize: 14,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    minHeight: 140,
  },
  linkGoogleCard: {
    marginTop: 12,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  actionButton: {
    padding: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 16,
    justifyContent: 'flex-end',
    paddingBottom: 18,
  },
  modalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalOption: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalHint: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 16,
  },
});

export default SettingsScreen;
