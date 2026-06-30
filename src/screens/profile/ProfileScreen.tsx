import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
} from 'react-native';
import { AppText as Text } from '../../components/common/AppText';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeWishlist } from '../../services/wishlistService';
import { subscribeOrderCount } from '../../services/orderService';
import { useAppAlert } from '../../contexts/AppAlertContext';
import { subscribeMyAddresses } from '../../services/addressService';
import { getAvatarSourceForUser } from '../../utils/avatarUtils';
import { useAvatarSourceForUser } from '../../hooks/useAvatarSource';

type MenuItem = {
  icon: string;
  title: string;
  subtitle: string;
  route: string;
};

const ProfileScreen = () => {
  const { colors } = useTheme();
  // Safe check for useAuth just in case it's not fully ready
  const auth = useAuth();
  const logout = auth?.logout || (() => Promise.resolve());
  const user = auth?.user;
  const isAdmin = auth?.isAdmin === true;
  const profile = auth?.profile ?? null;
  const { alert } = useAppAlert();

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [wishlistCount, setWishlistCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [addressCount, setAddressCount] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const isGuest = !user;
  // Use async hook to load from AsyncStorage first, then fallback to bundled
  const avatarSource =
    useAvatarSourceForUser({
      avatarId: profile?.avatarId,
      isGuest,
      isAdmin,
    }) ||
    getAvatarSourceForUser({
      avatarId: profile?.avatarId,
      isGuest,
      isAdmin,
    });

  useEffect(() => {
    // Reset wishlist count when logged out
    if (!user) {
      setWishlistCount(0);
      return;
    }

    // Live wishlist count for the signed-in user
    let unsub: undefined | (() => void);
    try {
      unsub = subscribeWishlist(
        (items) => setWishlistCount(Array.isArray(items) ? items.length : 0),
        () => setWishlistCount(0),
      );
    } catch {
      // Likely signed out / no uid yet
      setWishlistCount(0);
    }

    return () => {
      if (unsub) {
        unsub();
      }
    };
  }, [user]);

  useEffect(() => {
    // Reset order count when logged out
    if (!user) {
      setOrderCount(0);
      return;
    }

    // Live order count for the signed-in user
    let unsub: undefined | (() => void);
    try {
      unsub = subscribeOrderCount(
        (count) => setOrderCount(count),
        () => setOrderCount(0),
      );
    } catch {
      // Likely signed out / no uid yet
      setOrderCount(0);
    }

    return () => {
      if (unsub) {
        unsub();
      }
    };
  }, [user]);

  useEffect(() => {
    // Reset address count when logged out
    if (!user) {
      setAddressCount(0);
      return;
    }

    // Live address count for the signed-in user
    let unsub: undefined | (() => void);
    try {
      unsub = subscribeMyAddresses(
        (addresses) => setAddressCount(Array.isArray(addresses) ? addresses.length : 0),
        () => setAddressCount(0),
      );
    } catch {
      // Likely signed out / no uid yet
      setAddressCount(0);
    }

    return () => {
      if (unsub) {
        unsub();
      }
    };
  }, [user]);

  const accountItems: MenuItem[] = [
    { icon: 'person-outline', title: 'Personal Information', subtitle: 'Update your profile details', route: 'PersonalInfo' },
    { icon: 'image-outline', title: 'Avatar', subtitle: 'Choose or update your avatar', route: 'AvatarPicker' },
    { icon: 'location-outline', title: 'Shipping Addresses', subtitle: 'Manage your delivery addresses', route: 'ShippingAddresses' },
    { icon: 'card-outline', title: 'Payment Methods', subtitle: 'Manage your payment options', route: 'PaymentMethods' },
  ];

  const preferenceItems: MenuItem[] = [
    { icon: 'heart-outline', title: 'Wishlist', subtitle: 'View your saved items', route: 'Wishlist' },
    { icon: 'time-outline', title: 'Order History', subtitle: 'View your past orders', route: 'Orders' },
    { icon: 'notifications-outline', title: 'Notifications', subtitle: 'Manage your notifications', route: 'Notifications' },
    { icon: 'settings-outline', title: 'Settings', subtitle: 'App preferences and settings', route: 'Settings' },
  ];

  const helpItems: MenuItem[] = [
    { icon: 'help-circle-outline', title: 'Help & Support', subtitle: 'Get help and contact support', route: 'HelpSupport' },
  ];

  const guestAllowedRoutes = new Set(['Settings']);
  const adminExcludedRoutes = new Set([
    'ShippingAddresses',
    'PaymentMethods',
    'Wishlist',
    'Orders',
    'Notifications',
    'HelpSupport',
  ]);

  const filterItems = (items: MenuItem[]) =>
    isGuest
      ? items.filter((item) => guestAllowedRoutes.has(item.route))
      : isAdmin
      ? items.filter((item) => !adminExcludedRoutes.has(item.route))
      : items;

  const accountFiltered = filterItems(accountItems);
  const preferenceFiltered = filterItems(preferenceItems);
  const helpFiltered = filterItems(helpItems);

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    alert('Log out?', 'Are you sure you want to log out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoggingOut(true);
            await logout();
          } catch (e: any) {
            // Even if something went wrong, avoid unhandled promise rejections.
            const msg = e?.message ?? 'Failed to log out';
            alert('Logout failed', msg);
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const promptAuth = (reason: string, redirectToTab: 'Profile' | 'Cart' | 'Home' | 'Products') => {
    alert('Sign in required', reason, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign In', onPress: () => navigation.navigate('Login', { redirectToTab }) },
      { text: 'Create Account', onPress: () => navigation.navigate('Signup', { redirectToTab }) },
    ]);
  };

  const handleMenuPress = (route: string) => {
    const routesRequiringAuth = new Set([
      'PersonalInfo',
      'ShippingAddresses',
      'PaymentMethods',
      'Wishlist',
      'Orders',
      'Notifications',
      'AvatarPicker',
      'HelpSupport',
    ]);

    if (isGuest && routesRequiringAuth.has(route)) {
      promptAuth('Please sign in to access this section.', 'Profile');
      return;
    }

    navigation.navigate(route);
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={colors.background === '#000000' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 0) + 20 }]}>
          <TouchableOpacity
            style={styles.profileSection}
            activeOpacity={!isGuest ? 0.7 : 1}
            onPress={() => {
              if (!isGuest) {
                navigation.navigate('PersonalInfo');
              }
            }}
            disabled={isGuest}
          >
            <View style={styles.profileImageContainer}>
              <Image
                source={avatarSource}
                style={[styles.profileImage, { borderColor: colors.border }]}
              />
              {!isGuest && (
                <View
                  style={[
                    styles.editBadge,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.background,
                    },
                  ]}
                >
                  <Ionicons name="pencil" size={12} color={colors.background} />
                </View>
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {isGuest ? 'Guest' : profile?.name || user?.displayName || 'User'}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                {isGuest
                  ? 'You are browsing in guest mode'
                  : isAdmin
                  ? 'Admin account'
                  : profile?.email || user?.email || 'No email'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {!isGuest && isAdmin && (
          <>
            <TouchableOpacity
              style={[
                styles.adminPortalCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('AdminTabs')}
            >
              <View style={[styles.adminPortalIcon, { backgroundColor: colors.background }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.flex1}>
                <Text style={[styles.adminPortalTitle, { color: colors.text }]}>Admin Portal</Text>
                <Text style={[styles.adminPortalSubtitle, { color: colors.textSecondary }]}>
                  Manage users, products, and orders
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <View
              style={[
                styles.adminWelcomeCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.adminIconWrapper}>
                <View
                  style={[
                    styles.adminGradientCircle,
                    styles.adminGradientOuter,
                    { borderColor: colors.primary + '20' },
                  ]}
                />
                <View
                  style={[
                    styles.adminGradientCircle,
                    styles.adminGradientMiddle,
                    { borderColor: colors.primary + '30' },
                  ]}
                />
                <View
                  style={[styles.adminIconContainer, { backgroundColor: colors.primary + '15' }]}
                >
                  <Ionicons name="shield-checkmark" size={48} color={colors.primary} />
                </View>
              </View>
              <Text style={[styles.adminWelcomeTitle, { color: colors.text }]}>Welcome, Admin</Text>
              <Text style={[styles.adminWelcomeSubtitle, { color: colors.textSecondary }]}>
                You have full access to manage the platform, including users, products, orders, and
                system settings.
              </Text>
              <View style={styles.adminBenefitsContainer}>
                <View style={styles.adminBenefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  <Text style={[styles.adminBenefitText, { color: colors.text }]}>
                    Manage products & inventory
                  </Text>
                </View>
                <View style={styles.adminBenefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  <Text style={[styles.adminBenefitText, { color: colors.text }]}>
                    View & process orders
                  </Text>
                </View>
                <View style={styles.adminBenefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  <Text style={[styles.adminBenefitText, { color: colors.text }]}>
                    Manage users & accounts
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {isGuest ? (
          <View
            style={[
              styles.authCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.authCardHeader}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.authCardTitle, { color: colors.text }]}>
                Sign in to unlock wishlist & checkout
              </Text>
            </View>
            <Text style={[styles.authCardSubtitle, { color: colors.textSecondary }]}>
              Your cart is saved on this device. Sign in to sync it and access your wishlist & order
              history.
            </Text>
            <View style={styles.authButtonsRow}>
              <TouchableOpacity
                style={[styles.authButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={[styles.authButtonText, { color: colors.background }]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authButtonOutline, { borderColor: colors.border }]}
                onPress={() => navigation.navigate('Signup')}
              >
                <Text style={[styles.authButtonText, { color: colors.text }]}>Create Account</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.guestPromptText, { color: colors.textSecondary }]}>
              Sign in or create an account to access the complete functionality of the profile page.
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: colors.surface }]}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator color="#FF3B30" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
                <Text style={styles.logoutTextDanger}>Log Out</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {isGuest && (
          <View
            style={[
              styles.guestWelcomeCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.guestIconWrapper}>
              <View
                style={[
                  styles.guestGradientCircle,
                  styles.guestGradientOuter,
                  { borderColor: colors.primary + '20' },
                ]}
              />
              <View
                style={[
                  styles.guestGradientCircle,
                  styles.guestGradientMiddle,
                  { borderColor: colors.primary + '30' },
                ]}
              />
              <View style={[styles.guestIconContainer, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="person-outline" size={48} color={colors.primary} />
              </View>
            </View>
            <Text style={[styles.guestWelcomeTitle, { color: colors.text }]}>
              You're browsing as a guest
            </Text>
            <Text style={[styles.guestWelcomeSubtitle, { color: colors.textSecondary }]}>
              Sign in or create an account to become a valued member of our community and unlock all
              features.
            </Text>
            <View style={styles.guestBenefitsContainer}>
              <View style={styles.guestBenefitItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={[styles.guestBenefitText, { color: colors.text }]}>
                  Save your wishlist
                </Text>
              </View>
              <View style={styles.guestBenefitItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={[styles.guestBenefitText, { color: colors.text }]}>
                  Track your orders
                </Text>
              </View>
              <View style={styles.guestBenefitItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={[styles.guestBenefitText, { color: colors.text }]}>
                  Manage addresses & payments
                </Text>
              </View>
            </View>
          </View>
        )}

        {!isGuest && !isAdmin && (
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Ionicons
                name="bag-outline"
                size={24}
                color={colors.primary}
                style={styles.statIcon}
              />
              <Text style={[styles.statNumber, { color: colors.text }]}>{orderCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Orders</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Ionicons
                name="heart-outline"
                size={24}
                color={colors.primary}
                style={styles.statIcon}
              />
              <Text style={[styles.statNumber, { color: colors.text }]}>{wishlistCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Wishlist</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Ionicons
                name="location-outline"
                size={24}
                color={colors.primary}
                style={styles.statIcon}
              />
              <Text style={[styles.statNumber, { color: colors.text }]}>{addressCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Addresses</Text>
            </View>
          </View>
        )}

        <View style={styles.menuContainer}>
          {accountFiltered.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
              <View style={styles.sectionItems}>
                {accountFiltered.map((item, index) => (
                  <TouchableOpacity
                    key={`account-${index}`}
                    style={[styles.menuItem, { backgroundColor: '#FFFFFF' }]}
                    onPress={() => handleMenuPress(item.route)}
                  >
                    <View style={styles.menuItemLeft}>
                      <View style={[styles.menuIconContainer, { backgroundColor: '#F4F9F7' }]}>
                        <Ionicons name={item.icon as any} size={20} color="#0A6B4B" />
                      </View>
                      <View style={styles.menuItemText}>
                        <Text style={[styles.menuItemTitle, { color: colors.text }]}>{item.title}</Text>
                        <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {preferenceFiltered.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preferences</Text>
              <View style={styles.sectionItems}>
                {preferenceFiltered.map((item, index) => (
                  <TouchableOpacity
                    key={`pref-${index}`}
                    style={[styles.menuItem, { backgroundColor: '#FFFFFF' }]}
                    onPress={() => handleMenuPress(item.route)}
                  >
                    <View style={styles.menuItemLeft}>
                      <View style={[styles.menuIconContainer, { backgroundColor: '#F4F9F7' }]}>
                        <Ionicons name={item.icon as any} size={20} color="#0A6B4B" />
                      </View>
                      <View style={styles.menuItemText}>
                        <Text style={[styles.menuItemTitle, { color: colors.text }]}>{item.title}</Text>
                        <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {helpFiltered.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Help & Support</Text>
              <View style={styles.sectionItems}>
                {helpFiltered.map((item, index) => (
                  <TouchableOpacity
                    key={`help-${index}`}
                    style={[styles.menuItem, { backgroundColor: '#FFFFFF' }]}
                    onPress={() => handleMenuPress(item.route)}
                  >
                    <View style={styles.menuItemLeft}>
                      <View style={[styles.menuIconContainer, { backgroundColor: '#F4F9F7' }]}>
                        <Ionicons name={item.icon as any} size={20} color="#0A6B4B" />
                      </View>
                      <View style={styles.menuItemText}>
                        <Text style={[styles.menuItemTitle, { color: colors.text }]}>{item.title}</Text>
                        <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFCFB',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    minHeight: '100%',
  },
  header: {
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  profileSection: {
    alignItems: 'center',
    width: '100%',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#C9A84C',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  userInfo: {
    alignItems: 'center',
    width: '100%',
  },
  userName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0D1F1A',
    marginBottom: 6,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 6,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0EDE8',
    shadowColor: '#0A6B4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statIcon: {
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  menuContainer: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
    color: '#9DB8B0',
  },
  sectionItems: {
    gap: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0EDE8',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 12,
    fontWeight: '400',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 12,
    width: '90%',
    alignSelf: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  logoutTextDanger: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#FF3B30',
  },
  authCard: {
    width: '90%',
    alignSelf: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 12,
  },
  authCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  authCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  authCardSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  authButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  authButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authButtonOutline: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  authButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  guestPromptText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  guestWelcomeCard: {
    width: '90%',
    alignSelf: 'center',
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
    marginTop: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  guestIconWrapper: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  guestGradientCircle: {
    position: 'absolute',
    borderRadius: 50,
    borderWidth: 1.5,
  },
  guestGradientOuter: {
    width: 100,
    height: 100,
    opacity: 0.4,
  },
  guestGradientMiddle: {
    width: 90,
    height: 90,
    opacity: 0.5,
  },
  guestIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  guestWelcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  guestWelcomeSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  guestBenefitsContainer: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  guestBenefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guestBenefitText: {
    fontSize: 15,
    fontWeight: '500',
  },
  adminPortalCard: {
    width: '90%',
    alignSelf: 'center',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminPortalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminPortalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  adminPortalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  adminWelcomeCard: {
    width: '90%',
    alignSelf: 'center',
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
    marginTop: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  adminIconWrapper: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  adminGradientCircle: {
    position: 'absolute',
    borderRadius: 50,
    borderWidth: 1.5,
  },
  adminGradientOuter: {
    width: 100,
    height: 100,
    opacity: 0.4,
  },
  adminGradientMiddle: {
    width: 90,
    height: 90,
    opacity: 0.5,
  },
  adminIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  adminWelcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  adminWelcomeSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  adminBenefitsContainer: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  adminBenefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminBenefitText: {
    fontSize: 15,
    fontWeight: '500',
  },
  flex1: {
    flex: 1,
  },
});

export default ProfileScreen;
