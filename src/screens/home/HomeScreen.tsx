import React, { useState, useEffect, useRef } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  StatusBar,
  Image,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
// LinearGradient replaced with pure RN View overlay (expo-linear-gradient requires Expo)

import { ThemedText } from '../../components/ThemedText';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAppAlert } from '../../contexts/AppAlertContext';
import {
  subscribeFeaturedProducts,
  subscribeNewArrivals,
  subscribeBestSellers,
  type StoreProduct,
} from '../../services/productCatalogService';
import {
  subscribeNotifications,
  subscribeUnreadNotificationCount,
  type Notification,
} from '../../services/notificationService';
import { getAvatarSourceForUser } from '../../utils/avatarUtils';

// Helper to get premium product images
const getProductImageUri = (product: StoreProduct) => {
  const title = product.title.toLowerCase();
  if (title.includes('headphone')) {
    return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400';
  }
  if (title.includes('watch') || title.includes('smartwatch')) {
    return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400';
  }
  if (title.includes('laptop') || title.includes('computer')) {
    return 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400';
  }
  if (title.includes('sneaker') || title.includes('shoe')) {
    return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400';
  }
  return product.thumbnail || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400';
};

interface FeatureSectionProps {
  title: string;
  description: string;
  ionIconName: string;
}

const FeatureSection = ({ title, description, ionIconName }: FeatureSectionProps) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIconContainer}>
        <Ionicons name={ionIconName as any} size={22} color={colors.primary} />
      </View>
      <ThemedText style={styles.featureTitle} numberOfLines={2}>
        {title}
      </ThemedText>
      <ThemedText style={styles.featureDescription}>
        {description}
      </ThemedText>
    </View>
  );
};

// Premium Product Card with Scale Spring and Pulse AR Badge
const ProductCard = ({ product }: { product: StoreProduct }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation<any>();
  const scale = useRef(new Animated.Value(1)).current;
  const badgeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(badgeScale, {
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(badgeScale, {
          toValue: 1.0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const discountedPrice =
    product.discountPercentage > 0
      ? product.price * (1 - product.discountPercentage / 100)
      : product.price;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetails', { id: product.id })}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.productImageContainer}>
          <Image
            source={{ uri: getProductImageUri(product) }}
            style={styles.productImage}
          />
          <Animated.View style={[styles.arBadge, { transform: [{ scale: badgeScale }] }]}>
            <ThemedText style={styles.arBadgeText}>AR</ThemedText>
          </Animated.View>
        </View>
        <View style={styles.productInfo}>
          <ThemedText style={styles.productTitle} numberOfLines={2}>
            {product.title}
          </ThemedText>
          <View style={styles.priceRow}>
            <ThemedText style={styles.productPrice}>
              ${discountedPrice.toFixed(2)}
            </ThemedText>
            {product.discountPercentage > 0 && (
              <ThemedText style={styles.originalPrice}>
                ${product.price.toFixed(2)}
              </ThemedText>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, profile, isAdmin } = useAuth();
  const { alert } = useAppAlert();
  const [featuredProducts, setFeaturedProducts] = useState<StoreProduct[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [newArrivals, setNewArrivals] = useState<StoreProduct[]>([]);
  const [loadingNewArrivals, setLoadingNewArrivals] = useState(true);
  const [bestSellers, setBestSellers] = useState<StoreProduct[]>([]);
  const [loadingBestSellers, setLoadingBestSellers] = useState(true);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const knownNotificationIdsRef = useRef<Set<string>>(new Set());
  const notificationsInitializedRef = useRef(false);

  // Animations for mount fade-in
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(16)).current;

  const featuresOpacity = useRef(new Animated.Value(0)).current;
  const featuresTranslateY = useRef(new Animated.Value(16)).current;

  const productsOpacity = useRef(new Animated.Value(0)).current;
  const productsTranslateY = useRef(new Animated.Value(16)).current;

  // "Explore Now" button bg flash animation
  const exploreBtnBg = useRef(new Animated.Value(0)).current;

  const avatarSource = getAvatarSourceForUser({
    avatarId: profile?.avatarId,
    isGuest: !user,
    isAdmin: isAdmin,
  });

  useEffect(() => {
    // Staggered sections fade-in
    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(heroOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(heroTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(featuresOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(featuresTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(productsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(productsTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    const unsub = subscribeFeaturedProducts(
      (products) => {
        setFeaturedProducts(products);
        setLoadingFeatured(false);
      },
      (err) => {
        console.warn('Featured products subscription error (handled):', err);
        setLoadingFeatured(false);
        setFeaturedProducts([]);
      },
    );
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeNewArrivals(
      (products) => {
        setNewArrivals(products);
        setLoadingNewArrivals(false);
      },
      (err) => {
        console.warn('New arrivals subscription error (handled):', err);
        setLoadingNewArrivals(false);
        setNewArrivals([]);
      },
    );
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeBestSellers(
      (products) => {
        setBestSellers(products);
        setLoadingBestSellers(false);
      },
      (err) => {
        console.warn('Best sellers subscription error (handled):', err);
        setLoadingBestSellers(false);
        setBestSellers([]);
      },
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!user || !user.emailVerified) {
      setUnreadNotificationCount(0);
      return;
    }
    const unsub = subscribeUnreadNotificationCount(
      (count) => setUnreadNotificationCount(count),
      () => setUnreadNotificationCount(0),
    );
    return unsub;
  }, [user?.uid, user?.emailVerified]);

  useEffect(() => {
    if (!user || !user.emailVerified) {
      knownNotificationIdsRef.current = new Set();
      notificationsInitializedRef.current = false;
      return;
    }

    const unsub = subscribeNotifications(
      (notifications) => {
        const currentIds = new Set(notifications.map((n) => n.id));

        if (!notificationsInitializedRef.current) {
          knownNotificationIdsRef.current = currentIds;
          notificationsInitializedRef.current = true;
          return;
        }

        const incoming = notifications.find(
          (n: Notification) => !knownNotificationIdsRef.current.has(n.id) && !n.read,
        );

        if (incoming) {
          if (incoming.title !== 'Order Placed') {
            alert(incoming.title || 'New notification', incoming.message || 'You have a new update.', [
              { text: 'Later', style: 'cancel' },
              {
                text: 'View',
                onPress: () => navigation.navigate('Notifications'),
              },
            ]);
          }
        }

        knownNotificationIdsRef.current = currentIds;
      },
      () => { },
    );

    return unsub;
  }, [user?.uid, user?.emailVerified, alert, navigation]);

  const handleExplorePress = () => {
    Animated.sequence([
      Animated.timing(exploreBtnBg, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(exploreBtnBg, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start(() => {
      navigation.navigate('Products');
    });
  };

  const exploreBtnBgColor = exploreBtnBg.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.primary, colors.accent],
  });

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        translucent={false}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.greetingContainer}>
              <ThemedText style={styles.welcomeText}>
                Welcome to
              </ThemedText>
              <ThemedText style={styles.apexTitle}>
                Vision AR
              </ThemedText>
              <View style={styles.goldBar} />
            </View>
            <View style={styles.profileButtonWrapper}>
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => {
                  if (unreadNotificationCount > 0) {
                    navigation.navigate('Notifications');
                  } else {
                    navigation.navigate('Profile');
                  }
                }}
                activeOpacity={0.7}
              >
                <Image source={avatarSource} style={styles.avatarImage} />
              </TouchableOpacity>
              {unreadNotificationCount > 0 && (
                <View style={[styles.alertBadge, { backgroundColor: '#FF3B30' }]}>
                  <Ionicons name="notifications" size={10} color="#FFFFFF" />
                  <ThemedText style={styles.alertBadgeText}>
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Hero Banner with Fade-in animation */}
        <Animated.View
          style={[
            styles.bannerContainer,
            { opacity: heroOpacity, transform: [{ translateY: heroTranslateY }] },
          ]}
        >
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=800',
            }}
            style={styles.bannerImage}
          />
          <View
            style={styles.bannerOverlay}
          >
            <ThemedText style={styles.bannerTitle}>
              View in AR
            </ThemedText>
            <ThemedText style={styles.bannerSubtitle}>Experience products in your space</ThemedText>
            <Animated.View style={{ backgroundColor: exploreBtnBgColor, borderRadius: 50 }}>
              <TouchableOpacity
                style={styles.bannerButton}
                onPress={handleExplorePress}
                activeOpacity={1}
              >
                <ThemedText style={styles.bannerButtonText}>
                  Explore Now
                </ThemedText>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>

        {/* Features section with Fade-in animation */}
        <Animated.View
          style={{ opacity: featuresOpacity, transform: [{ translateY: featuresTranslateY }] }}
        >
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>
              Why Shop With Us
            </ThemedText>
          </View>

          <View style={styles.featuresContainer}>
            <FeatureSection
              title="AR Experience"
              description="Try products in your space"
              ionIconName="cube-outline"
            />
            <FeatureSection
              title="Precise Details"
              description="Exact dimensions and specs"
              ionIconName="scan-outline"
            />
            <FeatureSection
              title="Smart Shopping"
              description="Intelligent recommendations"
              ionIconName="sparkles-outline"
            />
          </View>
        </Animated.View>

        {/* Products lists with Fade-in animation */}
        <Animated.View
          style={{ opacity: productsOpacity, transform: [{ translateY: productsTranslateY }] }}
        >
          {/* Featured products */}
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>
              Featured Products
            </ThemedText>
            <TouchableOpacity onPress={() => navigation.navigate('Products')} activeOpacity={0.7}>
              <ThemedText style={styles.viewAllText}>
                View All
              </ThemedText>
            </TouchableOpacity>
          </View>

          {loadingFeatured ? (
            <View style={styles.featuredLoadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <ThemedText style={styles.featuredLoadingText}>
                Loading featured products...
              </ThemedText>
            </View>
          ) : featuredProducts.length === 0 ? (
            <View style={styles.featuredEmptyContainer}>
              <Ionicons name="cube-outline" size={48} color={colors.secondary} />
              <ThemedText style={styles.featuredEmptyText}>
                No featured products yet
              </ThemedText>
              <ThemedText style={styles.featuredEmptySubtext}>
                Mark products as featured in admin to see them here
              </ThemedText>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.featuredProductsContainer}
              contentContainerStyle={styles.featuredProductsContent}
            >
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ScrollView>
          )}

          {/* New Arrivals */}
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>
              New Arrivals
            </ThemedText>
            <TouchableOpacity onPress={() => navigation.navigate('Products')} activeOpacity={0.7}>
              <ThemedText style={styles.viewAllText}>
                View All
              </ThemedText>
            </TouchableOpacity>
          </View>

          {loadingNewArrivals ? (
            <View style={styles.featuredLoadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <ThemedText style={styles.featuredLoadingText}>
                Loading new arrivals...
              </ThemedText>
            </View>
          ) : newArrivals.length === 0 ? (
            <View style={styles.featuredEmptyContainer}>
              <Ionicons name="sparkles-outline" size={48} color={colors.secondary} />
              <ThemedText style={styles.featuredEmptyText}>
                No new arrivals yet
              </ThemedText>
              <ThemedText style={styles.featuredEmptySubtext}>
                Mark products as new arrivals in admin to see them here
              </ThemedText>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.featuredProductsContainer}
              contentContainerStyle={styles.featuredProductsContent}
            >
              {newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ScrollView>
          )}

          {/* Best Sellers */}
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>
              Best Sellers
            </ThemedText>
            <TouchableOpacity onPress={() => navigation.navigate('Products')} activeOpacity={0.7}>
              <ThemedText style={styles.viewAllText}>
                View All
              </ThemedText>
            </TouchableOpacity>
          </View>

          {loadingBestSellers ? (
            <View style={styles.featuredLoadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <ThemedText style={styles.featuredLoadingText}>
                Loading best sellers...
              </ThemedText>
            </View>
          ) : bestSellers.length === 0 ? (
            <View style={styles.featuredEmptyContainer}>
              <Ionicons name="trophy-outline" size={48} color={colors.secondary} />
              <ThemedText style={styles.featuredEmptyText}>
                No best sellers yet
              </ThemedText>
              <ThemedText style={styles.featuredEmptySubtext}>
                Mark products as best sellers in admin to see them here
              </ThemedText>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.featuredProductsContainer}
              contentContainerStyle={styles.featuredProductsContent}
            >
              {bestSellers.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ScrollView>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const { width } = Dimensions.get('window');

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingContainer: {
    flex: 1,
    paddingRight: 12,
  },
  welcomeText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
  },
  apexTitle: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700',
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: -1,
    marginTop: 20,
  },
  goldBar: {
    width: 36,
    height: 3,
    backgroundColor: colors.accent,
    borderRadius: 2,
    marginTop: 6,
  },
  profileButtonWrapper: {
    position: 'relative',
    width: 48,
    height: 48,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  alertBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  alertBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  bannerContainer: {
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    height: 220,
    marginBottom: 32,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(10,40,30,0.45)',
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 4,
  },
  bannerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginBottom: 20,
  },
  bannerButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: colors.text,
    marginBottom: 16,
    marginTop: 28,
    flex: 1,
  },
  viewAllText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 28,
  },
  featuresContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 10,
  },
  featureCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  featuredProductsContainer: {
    marginBottom: 8,
  },
  featuredProductsContent: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  productCard: {
    width: width * 0.6,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  productImageContainer: {
    width: '100%',
    height: 160,
    backgroundColor: colors.background,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  arBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  productInfo: {
    padding: 12,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    color: colors.secondary,
  },
  featuredLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredLoadingText: {
    marginTop: 12,
    fontSize: 13,
    color: colors.textSecondary,
  },
  featuredEmptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredEmptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  featuredEmptySubtext: {
    marginTop: 8,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 40,
    color: colors.secondary,
  },
});
