import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageStyle,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '../../components/common/AppText';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAppAlert } from '../../contexts/AppAlertContext';
import {
  clearCart,
  removeFromCart,
  setCartItemQuantity,
  subscribeCart,
} from '../../services/cartService';

interface CartItemProps {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  stock?: number;
  inStock?: boolean;
  originalPrice?: number;
  onQuantityChange: (id: string, newQuantity: number) => void;
  onRemove: (id: string) => void;
}

const CartItem = ({
  id,
  name,
  price,
  image,
  quantity,
  stock,
  inStock,
  originalPrice,
  onQuantityChange,
  onRemove,
}: CartItemProps) => {
  const { colors } = useTheme();
  const { alert } = useAppAlert();

  const currentStock = stock ?? 0;
  const isOutOfStock = currentStock <= 0;
  const isLowStock = currentStock > 0 && quantity > currentStock;
  const maxQuantity = Math.max(0, currentStock);
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercentage = hasDiscount
    ? Math.round(((originalPrice! - price) / originalPrice!) * 100)
    : 0;

  const handleQuantityIncrease = () => {
    if (isOutOfStock) {
      alert('Out of Stock', 'This product is currently out of stock.', [
        { text: 'OK', style: 'default' },
      ]);
      return;
    }
    if (quantity >= maxQuantity) {
      alert(
        'Limited Stock',
        `Only ${maxQuantity} item(s) available in stock.`,
        [{ text: 'OK', style: 'default' }],
      );
      return;
    }
    onQuantityChange(id, quantity + 1);
  };

  const handleQuantityDecrease = () => {
    onQuantityChange(id, Math.max(1, quantity - 1));
  };

  return (
    <View
      style={[
        styles.cartItem,
        {
          backgroundColor: colors.surface,
          borderColor: isOutOfStock || isLowStock ? colors.error : colors.border,
          borderWidth: isOutOfStock || isLowStock ? 2 : 1,
        },
      ]}
    >
      <Image source={{ uri: image }} style={styles.cartItemImage} />
      <View style={styles.cartItemInfo}>
        <Text style={[styles.cartItemName, { color: colors.text }]} numberOfLines={2}>
          {name}
        </Text>
        <View style={styles.priceContainer}>
          {hasDiscount && (
            <Text style={[styles.originalPrice, { color: colors.textSecondary }]}>
              ${originalPrice!.toFixed(2)}
            </Text>
          )}
          <Text style={[styles.cartItemPrice, { color: colors.text }]}>${price.toFixed(2)}</Text>
          {hasDiscount && (
            <View style={[styles.discountBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.discountText, { color: colors.primary }]}>
                -{discountPercentage}%
              </Text>
            </View>
          )}
        </View>

        {(isOutOfStock || isLowStock) && (
          <View
            style={[
              styles.stockWarning,
              {
                backgroundColor: isOutOfStock
                  ? (colors.error || '#FF3B30') + '15'
                  : '#FF9500' + '15',
              },
            ]}
          >
            <Ionicons
              name={isOutOfStock ? 'alert-circle-outline' : 'warning-outline'}
              size={14}
              color={isOutOfStock ? colors.error || '#FF3B30' : '#FF9500'}
            />
            <Text
              style={[
                styles.stockWarningText,
                {
                  color: isOutOfStock ? colors.error || '#FF3B30' : '#FF9500',
                },
              ]}
            >
              {isOutOfStock
                ? 'Out of stock'
                : `Only ${maxQuantity} available (${quantity} in cart)`}
            </Text>
          </View>
        )}

        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={[styles.quantityButton, { borderColor: colors.border }]}
            onPress={handleQuantityDecrease}
            activeOpacity={0.7}
            disabled={quantity <= 1}
          >
            <Ionicons
              name="remove-outline"
              size={18}
              color={quantity <= 1 ? colors.textSecondary : colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.quantityText, { color: colors.text }]}>{quantity}</Text>
          <TouchableOpacity
            style={[
              styles.quantityButton,
              {
                borderColor: colors.border,
                opacity: isOutOfStock || quantity >= maxQuantity ? 0.5 : 1,
              },
            ]}
            onPress={handleQuantityIncrease}
            activeOpacity={0.7}
            disabled={isOutOfStock || quantity >= maxQuantity}
          >
            <Ionicons
              name="add-outline"
              size={18}
              color={isOutOfStock || quantity >= maxQuantity ? colors.textSecondary : colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemove(id)}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
};

export default function CartScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const { user, refreshEmailVerification } = useAuth();
  const { alert } = useAppAlert();

  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  // Subscribe to cart changes - hooks must be called before any early returns
  useEffect(() => {
    if (!user?.uid) {
      setCartItems([]);
      setLoading(false);
      return;
    }

    let unsub: undefined | (() => void);
    try {
      unsub = subscribeCart(
        (items) => {
          setCartItems(items);
          setLoading(false);
        },
        () => {
          setCartItems([]);
          setLoading(false);
        },
      );
    } catch {
      // In case auth state is missing unexpectedly
      setCartItems([]);
      setLoading(false);
    }

    return () => {
      if (unsub) {
        unsub();
      }
    };
  }, [user?.uid]);

  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
        0,
      ),
    [cartItems],
  );
  const totalSavings = useMemo(
    () =>
      cartItems.reduce((sum, item) => {
        if (item.originalPrice && item.originalPrice > item.price) {
          const savingsPerUnit = item.originalPrice - item.price;
          return sum + savingsPerUnit * item.quantity;
        }
        return sum;
      }, 0),
    [cartItems],
  );
  const shipping = cartItems.length > 0 ? 10 : 0;
  const total = subtotal + shipping;

  // If user is not logged in, show login prompt
  if (!user) {
    return (
      <SafeAreaView
        edges={['top', 'bottom', 'left', 'right']}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
          translucent={false}
        />
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Shopping Cart</Text>
        </View>

        <View style={styles.loginPromptContainer}>
          <View style={[styles.loginIconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="cart-outline" size={64} color={colors.primary} />
          </View>
          <Text style={[styles.loginPromptTitle, { color: colors.text }]}>Sign In Required</Text>
          <Text style={[styles.loginPromptText, { color: colors.textSecondary }]}>
            Please sign in to access your shopping cart and manage your items.
          </Text>

          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Login', { redirectToTab: 'Cart' })}
            activeOpacity={0.8}
          >
            <Text style={[styles.loginButtonText, { color: colors.background }]}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.signupButton, { borderColor: colors.border }]}
            onPress={() => navigation.navigate('Signup', { redirectToTab: 'Cart' })}
            activeOpacity={0.8}
          >
            <Text style={[styles.signupButtonText, { color: colors.text }]}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleQuantityChange = async (id: string, newQuantity: number) => {
    // Optimistic UI update
    setCartItems((items) =>
      items.map((item) => (item.id === id ? { ...item, quantity: newQuantity } : item)),
    );
    try {
      await setCartItemQuantity(id, newQuantity);
    } catch (e: any) {
      // Revert on error and show alert
      setCartItems((items) =>
        items.map((item) => (item.id === id ? { ...item, quantity: item.quantity } : item)),
      );
      alert('Quantity Update Failed', e?.message ?? 'Unable to update quantity. Please try again.', [
        { text: 'OK', style: 'default' },
      ]);
    }
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((items) => items.filter((item) => item.id !== id));
    removeFromCart(id).catch(() => {
      // Snapshot will re-sync on failure
    });
  };

  const handleClearCart = async () => {
    try {
      setClearing(true);
      await clearCart();
    } finally {
      setClearing(false);
    }
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      return;
    }

    // Check for out-of-stock items
    const outOfStockItems = cartItems.filter((item) => !item.inStock || (item.stock ?? 0) <= 0);
    const lowStockItems = cartItems.filter(
      (item) => item.inStock && (item.stock ?? 0) > 0 && item.quantity > (item.stock ?? 0),
    );

    if (outOfStockItems.length > 0 || lowStockItems.length > 0) {
      let message = '';
      if (outOfStockItems.length > 0) {
        message += `${outOfStockItems.length} item(s) are out of stock. `;
      }
      if (lowStockItems.length > 0) {
        message += `${lowStockItems.length} item(s) have insufficient stock. `;
      }
      message += 'Please update your cart before checkout.';

      alert('Cart Issues', message, [{ text: 'OK', style: 'default' }]);
      return;
    }

    if (!user) {
      alert('Sign in required', 'Please sign in to checkout.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => navigation.navigate('Login', { redirectToTab: 'Cart' }) },
        {
          text: 'Sign Up',
          onPress: () => navigation.navigate('Signup', { redirectToTab: 'Cart' }),
        },
      ]);
      return;
    }

    if (!user.emailVerified) {
      alert(
        'Verify your email',
        'Please verify your email to checkout. Check your inbox, then tap "I verified".',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'I verified',
            onPress: async () => {
              try {
                await refreshEmailVerification();
              } catch {
                // ignore reload failures; user can retry
              }
            },
          },
        ],
      );
      return;
    }

    // Navigate to checkout screen for address selection
    navigation.navigate('Checkout', { cartItems, shipping });
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        translucent={false}
      />
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Shopping Cart</Text>
        {cartItems.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearCart}
            disabled={clearing}
            activeOpacity={0.7}
          >
            {clearing ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.cartList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.cartListContent}
      >
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Loading your cart...
            </Text>
          </View>
        ) : cartItems.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="cart-outline" size={64} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Your cart is empty</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Add items to your cart to get started
            </Text>
            <TouchableOpacity
              style={[styles.browseButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Products')}
              activeOpacity={0.8}
            >
              <Text style={[styles.browseButtonText, { color: colors.background }]}>
                Browse Products
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          cartItems.map((item) => (
            <CartItem
              key={item.id}
              {...item}
              onQuantityChange={handleQuantityChange}
              onRemove={handleRemoveItem}
            />
          ))
        )}
      </ScrollView>

      {cartItems.length > 0 && (
        <View
          style={[
            styles.summaryContainer,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
        >
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Subtotal</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              ${subtotal.toFixed(2)}
            </Text>
          </View>
          {totalSavings > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.primary }]}>You Save</Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>
                -${totalSavings.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Shipping</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              ${shipping.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>${total.toFixed(2)}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.checkoutButton,
              {
                backgroundColor: colors.primary,
                opacity:
                  cartItems.length === 0 ||
                  cartItems.some((item) => !item.inStock || (item.stock ?? 0) <= 0) ||
                  cartItems.some((item) => item.quantity > (item.stock ?? 0))
                    ? 0.5
                    : 1,
              },
            ]}
            onPress={handleCheckout}
            disabled={
              cartItems.length === 0 ||
              cartItems.some((item) => !item.inStock || (item.stock ?? 0) <= 0) ||
              cartItems.some((item) => item.quantity > (item.stock ?? 0))
            }
            activeOpacity={0.8}
          >
            <Text style={[styles.checkoutButtonText, { color: colors.background }]}>
              Proceed to Checkout
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFCFB',
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  } as ViewStyle,
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0D1F1A',
    flex: 1,
  } as TextStyle,
  clearButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  cartList: {
    flex: 1,
  },
  cartListContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 200,
  } as ViewStyle,
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  } as ViewStyle,
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    marginBottom: 24,
  } as ViewStyle,
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  } as TextStyle,
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  } as TextStyle,
  emptyText: {
    marginTop: 14,
    fontSize: 15,
    textAlign: 'center',
  } as TextStyle,
  browseButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#0A6B4B',
  } as ViewStyle,
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  } as TextStyle,
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0EDE8',
  } as ViewStyle,
  cartItemImage: {
    width: 90,
    height: 90,
    borderRadius: 10,
    resizeMode: 'cover',
  } as ImageStyle,
  cartItemInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
  } as ViewStyle,
  cartItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D1F1A',
    marginBottom: 4,
    lineHeight: 20,
  } as TextStyle,
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  } as ViewStyle,
  originalPrice: {
    fontSize: 13,
    textDecorationLine: 'line-through',
    color: '#9DB8B0',
    marginRight: 6,
  } as TextStyle,
  cartItemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0D1F1A',
    marginRight: 6,
  } as TextStyle,
  discountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#D1FAE5',
    borderRadius: 4,
  } as ViewStyle,
  discountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0A6B4B',
  } as TextStyle,
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0A6B4B',
    backgroundColor: '#F4F9F7',
  } as ViewStyle,
  quantityText: {
    fontSize: 15,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
    marginHorizontal: 10,
    color: '#0D1F1A',
  } as TextStyle,
  removeButton: {
    padding: 6,
    marginLeft: 6,
    marginTop: -6,
  } as ViewStyle,
  summaryContainer: {
    borderTopWidth: 1,
    borderColor: '#E0EDE8',
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingBottom: 32,
  } as ViewStyle,
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  } as ViewStyle,
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B6B61',
  } as TextStyle,
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D1F1A',
  } as TextStyle,
  totalRow: {
    marginTop: 6,
    paddingTop: 14,
    borderTopWidth: 1,
    borderColor: '#E0EDE8',
  } as ViewStyle,
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A6B4B',
  } as TextStyle,
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0A6B4B',
  } as TextStyle,
  checkoutButton: {
    borderRadius: 12,
    backgroundColor: '#0A6B4B',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  } as ViewStyle,
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  } as TextStyle,
  loginPromptContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  } as ViewStyle,
  loginIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    marginBottom: 24,
  } as ViewStyle,
  loginPromptTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  } as TextStyle,
  loginPromptText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  } as TextStyle,
  loginButton: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#0A6B4B',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  } as ViewStyle,
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  } as TextStyle,
  signupButton: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0EDE8',
  } as ViewStyle,
  signupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0D1F1A',
  } as TextStyle,
  stockWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  } as ViewStyle,
  stockWarningText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  } as TextStyle,
});
