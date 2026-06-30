import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import HomeScreen from '../screens/home/HomeScreen';
import ProductListScreen from '../screens/product/ProductListScreen';
import CartScreen from '../screens/cart/CartScreen';
import CheckoutScreen from '../screens/cart/CheckoutScreen';
import OrderPlacedScreen from '../screens/cart/OrderPlacedScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import ProductDetailsScreen from '../screens/product/ProductDetailsScreen';
import { ARViewScreen } from '../screens/ar/ARViewScreen';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminProductsScreen from '../screens/admin/AdminProductsScreen';
import AdminOrdersScreen from '../screens/admin/AdminOrdersScreen';
import AdminOrderDetailScreen from '../screens/admin/AdminOrderDetailScreen';
import AdminProductEditScreen from '../screens/admin/AdminProductEditScreen';
import AdminInquiriesScreen from '../screens/admin/AdminInquiriesScreen';
import AdminUserDetailScreen from '../screens/admin/AdminUserDetailScreen';
import AdminCategoriesScreen from '../screens/admin/AdminCategoriesScreen';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Profile screens
import PersonalInfoScreen from '../screens/profile/PersonalInfoScreen';
import ShippingAddressesScreen from '../screens/profile/ShippingAddressesScreen';
import AddressFormScreen from '../screens/profile/AddressFormScreen';
import PaymentMethodsScreen from '../screens/profile/PaymentMethodsScreen';
import AddPaymentCardScreen from '../screens/profile/AddPaymentCardScreen';
import WishlistScreen from '../screens/profile/WishlistScreen';
import OrderHistoryScreen from '../screens/profile/OrderHistoryScreen';
import OrderDetailScreen from '../screens/profile/OrderDetailScreen';
import NotificationsScreen from '../screens/profile/NotificationsScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import HelpSupportScreen from '../screens/profile/HelpSupportScreen';
import MyTicketsScreen from '../screens/profile/MyTicketsScreen';
import ChangeEmailScreen from '../screens/profile/ChangeEmailScreen';
import ChangePasswordScreen from '../screens/profile/ChangePasswordScreen';
import PrivacyPolicyScreen from '../screens/profile/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/profile/TermsOfServiceScreen';
import AvatarWelcomeScreen from '../screens/onboarding/AvatarWelcomeScreen';
import AvatarPickerScreen from '../screens/profile/AvatarPickerScreen';
import { updateMyAvatarId } from '../services/userService';
import AvatarFinalWelcomeScreen from '../screens/onboarding/AvatarFinalWelcomeScreen';
import WelcomeBackScreen from '../screens/onboarding/WelcomeBackScreen';
import AuthLoadingOverlay from '../components/common/AuthLoadingOverlay';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const AdminTab = createBottomTabNavigator();

const CustomTabBar = ({ state, descriptors: _descriptors, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        height: 70 + (Platform.OS === 'ios' ? insets.bottom : 0),
        paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#E0EDE8',
        position: 'relative',
      }}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const getIconName = () => {
          switch (route.name) {
            case 'Home':
              return 'home-outline';
            case 'Products':
              return 'grid-outline';
            case 'Cart':
              return 'cart-outline';
            case 'Profile':
              return 'person-outline';
            case 'Admin':
              return 'shield-checkmark-outline';
            case 'Users':
              return 'people-outline';
            case 'ProductsAdmin':
              return 'pricetags-outline';
            case 'OrdersAdmin':
              return 'receipt-outline';
            default:
              return 'home-outline';
          }
        };

        const getTitle = () => {
          switch (route.name) {
            case 'Home':
              return 'Home';
            case 'Products':
              return 'Products';
            case 'Cart':
              return 'Cart';
            case 'Profile':
              return 'Profile';
            case 'Admin':
              return 'Admin';
            case 'Users':
              return 'Users';
            case 'ProductsAdmin':
              return 'Products';
            case 'OrdersAdmin':
              return 'Orders';
            default:
              return 'Home';
          }
        };

        const activeColor = '#0A6B4B';
        const inactiveColor = '#9DB8B0';

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <View style={{ alignItems: 'center', justifyContent: 'center', height: 26 }}>
              <Ionicons
                name={getIconName() as any}
                size={22}
                color={isFocused ? activeColor : inactiveColor}
              />
              {isFocused && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: -6,
                    width: 20,
                    height: 2,
                    backgroundColor: '#C9A84C', // Gold underline indicator
                    borderRadius: 1,
                  }}
                />
              )}
            </View>

            <Text
              style={{
                fontSize: 10,
                letterSpacing: 0.5,
                fontWeight: '500',
                color: isFocused ? activeColor : inactiveColor,
                marginTop: 8,
              }}
            >
              {getTitle()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Products" component={ProductListScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const AdminTabNavigator = () => {
  return (
    <AdminTab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <AdminTab.Screen name="Admin" component={AdminDashboardScreen} />
      <AdminTab.Screen name="Users" component={AdminUsersScreen} />
      <AdminTab.Screen name="ProductsAdmin" component={AdminProductsScreen} />
      <AdminTab.Screen name="OrdersAdmin" component={AdminOrdersScreen} />
    </AdminTab.Navigator>
  );
};

const AdminTabsGate = () => {
  const { colors } = useTheme();
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 12 }}>
          Not authorized
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 6, textAlign: 'center' }}>
          This portal is only available to admin accounts.
        </Text>
      </View>
    );
  }

  return <AdminTabNavigator />;
};

export const AppNavigator = () => {
  const { colors } = useTheme();
  const {
    loading,
    checkingEmailVerification,
    emailVerificationChecked,
    isAdmin,
    user,
    isEmailVerified,
    profile,
    welcomeBackRequestId,
    authTransitionActive,
    clearAuthTransition,
  } =
    useAuth(); // Still wait for auth hydration, but app is accessible in guest mode.

  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      text: colors.text,
      card: colors.background, // Match header background to app background
      border: colors.border,
    },
  };

  const showBlockingLoader = loading || checkingEmailVerification;
  const profileHydrating = user && user.uid && isEmailVerified && profile === null;
  const [showWelcomeBack, setShowWelcomeBack] = React.useState(false);
  const lastHandledWelcomeReqRef = React.useRef(0);

  // Best-effort: ensure admins always have the admin avatar stored.
  React.useEffect(() => {
    if (!user || !isEmailVerified || !isAdmin || !profile) {
      return;
    }
    if (profile.avatarId === 'admin') {
      return;
    }
    (async () => {
      try {
        await updateMyAvatarId('admin');
      } catch {
        // ignore
      }
    })();
  }, [user?.uid, isEmailVerified, isAdmin, profile?.avatarId]);

  const needsAvatarOnboarding =
    user && user.uid && isEmailVerified && !isAdmin && emailVerificationChecked && profile && !profile.avatarId;

  // Only show welcome-back when explicitly requested (e.g., after pressing "Sign in"),
  // to avoid glitching during hydration / profile updates.
  React.useEffect(() => {
    if (!welcomeBackRequestId) {
      return;
    }
    if (welcomeBackRequestId === lastHandledWelcomeReqRef.current) {
      return;
    }
    lastHandledWelcomeReqRef.current = welcomeBackRequestId;
    // Show immediately (even if profile hasn't loaded yet) so the user doesn't see Home flash.
    setShowWelcomeBack(true);
    // Smoothly transition from auth loading overlay -> welcome back overlay.
    clearAuthTransition();
  }, [welcomeBackRequestId]);

  // If avatar onboarding becomes necessary, hide welcome-back immediately.
  React.useEffect(() => {
    if (showWelcomeBack && needsAvatarOnboarding) {
      setShowWelcomeBack(false);
    }
  }, [needsAvatarOnboarding, showWelcomeBack]);

  React.useEffect(() => {
    if (!user) {
      lastHandledWelcomeReqRef.current = 0;
      setShowWelcomeBack(false);
      clearAuthTransition();
    }
  }, [clearAuthTransition, user]);

  // If the user is signed in but not verified, hard-gate them into the verification flow.
  // They can log out from that screen to continue as guest.
  if (user && user.uid && emailVerificationChecked && !isEmailVerified) {
    return (
      <View style={{ flex: 1 }}>
        <NavigationContainer theme={navigationTheme}>
          <Stack.Navigator
            key="verify-root"
            initialRouteName="VerifyEmail"
            screenOptions={{
              headerShown: false,
              gestureEnabled: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          </Stack.Navigator>
        </NavigationContainer>

        {showBlockingLoader && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: colors.background,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.text }}>Loading...</Text>
          </View>
        )}
      </View>
    );
  }

  // Avoid flickering between navigators while the verified user's profile is still loading.
  // Without this, onboarding routes can be unmounted mid-navigation causing "NAVIGATE not handled".
  if (user && isEmailVerified && emailVerificationChecked && !isAdmin && profileHydrating) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: colors.text }}>Loading...</Text>
      </View>
    );
  }

  if (needsAvatarOnboarding) {
    return (
      <View style={{ flex: 1 }}>
        <NavigationContainer theme={navigationTheme}>
          <Stack.Navigator
            key="avatar-onboarding"
            initialRouteName="AvatarWelcome"
            screenOptions={{
              headerShown: false,
              gestureEnabled: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="AvatarWelcome" component={AvatarWelcomeScreen} />
            <Stack.Screen name="AvatarPicker" component={AvatarPickerScreen} />
            <Stack.Screen
              name="AvatarFinalWelcome"
              component={AvatarFinalWelcomeScreen}
              options={{ animation: 'fade' }}
            />
          </Stack.Navigator>
        </NavigationContainer>

        {(showBlockingLoader || profileHydrating) && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: colors.background,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.text }}>Loading...</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        key={user && isAdmin ? 'admin-root' : 'main-root'}
        initialRouteName={user && isAdmin ? 'AdminTabs' : 'MainTabs'}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right', // Smooth transitions
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            color: colors.text,
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
          <Stack.Screen name="MainTabs" component={TabNavigator} options={{ animation: 'none' }} />
        {/* Always register AdminTabs so navigation.reset({ routes: [{ name: 'AdminTabs' }] }) never errors.
           Access is enforced inside AdminTabsGate based on isAdmin. */}
        <Stack.Screen name="AdminTabs" component={AdminTabsGate} />
        <Stack.Screen
          name="AdminProductEdit"
          component={AdminProductEditScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AdminCategories"
          component={AdminCategoriesScreen}
          options={{ headerShown: true, title: 'Categories' }}
        />
        <Stack.Screen
          name="AdminInquiries"
          component={AdminInquiriesScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AdminUserDetail"
          component={AdminUserDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AdminOrderDetail"
          component={AdminOrderDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
        <Stack.Screen
          name="Checkout"
          component={CheckoutScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OrderPlaced"
          component={OrderPlacedScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="ARView"
          component={ARViewScreen}
          options={{
            animation: 'fade', // AR often opens with a fade or modal style
            presentation: 'fullScreenModal',
          }}
        />

        {/* Profile Sub-screens */}
        <Stack.Screen
          name="PersonalInfo"
          component={PersonalInfoScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ShippingAddresses"
          component={ShippingAddressesScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddressForm"
          component={AddressFormScreen}
          options={{ headerShown: true, headerTitle: '', headerBackTitleVisible: false }}
        />
        <Stack.Screen
          name="PaymentMethods"
          component={PaymentMethodsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddPaymentCard"
          component={AddPaymentCardScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Wishlist"
          component={WishlistScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Orders"
          component={OrderHistoryScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OrderDetail"
          component={OrderDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ headerShown: false }}
          />
        <Stack.Screen
          name="ChangeEmail"
          component={ChangeEmailScreen}
          options={{ headerShown: true, headerTitle: '', headerBackTitleVisible: false }}
        />
        <Stack.Screen
          name="ChangePassword"
          component={ChangePasswordScreen}
          options={{ headerShown: true, headerTitle: '', headerBackTitleVisible: false }}
        />
        <Stack.Screen
          name="HelpSupport"
          component={HelpSupportScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MyTickets"
          component={MyTicketsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyPolicyScreen}
          options={{ headerShown: true, headerTitle: '', headerBackTitleVisible: false }}
        />
        <Stack.Screen
          name="TermsOfService"
          component={TermsOfServiceScreen}
          options={{ headerShown: true, headerTitle: '', headerBackTitleVisible: false }}
        />
        <Stack.Screen
          name="AvatarPicker"
          component={AvatarPickerScreen}
          options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        {/* Safety net: allow navigating here even if onboarding stack is not active. */}
        <Stack.Screen
          name="AvatarFinalWelcome"
          component={AvatarFinalWelcomeScreen}
          options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'fade' }}
        />

        {/* Auth screens (modal) */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="Signup"
          component={SignupScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
      </Stack.Navigator>
    </NavigationContainer>

      {showWelcomeBack && user && user.uid && isEmailVerified && !needsAvatarOnboarding && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <WelcomeBackScreen
            variant="back"
            onDone={() => {
              setShowWelcomeBack(false);
              clearAuthTransition();
            }}
          />
        </View>
      )}

      {(authTransitionActive || showBlockingLoader) && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <AuthLoadingOverlay label="Signing you in…" />
        </View>
      )}
    </View>
  );
};

export default AppNavigator;
