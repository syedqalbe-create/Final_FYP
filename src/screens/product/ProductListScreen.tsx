import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  TextInput,
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import { AppText as Text } from '../../components/common/AppText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { addToCart } from '../../services/cartService';
import { useAppAlert } from '../../contexts/AppAlertContext';
import { subscribeProducts, type StoreProduct } from '../../services/productCatalogService';
import { subscribeCategories, type StoreCategory } from '../../services/categoryCatalogService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  description: string;
  thumbnail: string;
  images: string[];
  rating: number;
  discountPercentage: number;
  stock: number;
  brand: string;
  modelUrl?: string;
  isFeatured?: boolean;
}

type SortBy = 'newest' | 'priceAsc' | 'priceDesc' | 'ratingDesc';

const ProductListScreen = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { alert } = useAppAlert();
  const navigation = useNavigation<any>();

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const dropdownAnimation = useRef(new Animated.Value(0)).current;

  // Advanced filters (in bottom sheet)
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [discountOnly, setDiscountOnly] = useState(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  // Load products
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeProducts(
      (rows) => {
        const list = rows.map(
          (p: StoreProduct): Product => ({
            id: p.id,
            title: p.title,
            price: p.price,
            category: p.category,
            description: p.description,
            thumbnail: p.thumbnail,
            images: p.images,
            rating: p.rating,
            discountPercentage: p.discountPercentage,
            stock: p.stock,
            brand: p.brand,
            modelUrl: p.modelUrl,
            isFeatured: p.isFeatured,
          }),
        );
        setProducts(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error loading products:', err);
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  // Load categories
  useEffect(() => {
    const unsub = subscribeCategories(
      (rows) => setCategories(rows),
      () => setCategories([]),
    );
    return unsub;
  }, []);

  // Animate dropdown
  useEffect(() => {
    if (sortDropdownOpen) {
      Animated.spring(dropdownAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(dropdownAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [sortDropdownOpen, dropdownAnimation]);

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    let results = [...products];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      results = results.filter((product) => {
        const titleMatch = product.title?.toLowerCase().includes(query) || false;
        const brandMatch = product.brand?.toLowerCase().includes(query) || false;
        const descriptionMatch = product.description?.toLowerCase().includes(query) || false;
        return titleMatch || brandMatch || descriptionMatch;
      });
    }

    // Category filter
    if (selectedCategories.size > 0) {
      results = results.filter((p) => selectedCategories.has(p.category));
    }

    // Advanced filters
    if (featuredOnly) {
      results = results.filter((p) => Boolean(p.isFeatured ?? false));
    }
    if (inStockOnly) {
      results = results.filter((p) => Number(p.stock ?? 0) > 0);
    }
    if (discountOnly) {
      results = results.filter((p) => Number(p.discountPercentage ?? 0) > 0);
    }
    if (minRating > 0) {
      results = results.filter((p) => Number(p.rating ?? 0) >= minRating);
    }
    const minP = Number(String(minPrice).trim());
    const maxP = Number(String(maxPrice).trim());
    const hasMin = String(minPrice).trim().length > 0 && !Number.isNaN(minP);
    const hasMax = String(maxPrice).trim().length > 0 && !Number.isNaN(maxP);
    if (hasMin) {
      results = results.filter((p) => Number(p.price ?? 0) >= minP);
    }
    if (hasMax) {
      results = results.filter((p) => Number(p.price ?? 0) <= maxP);
    }

    // Sort
    const byDiscountedPrice = (p: Product) =>
      Number(
        (p.discountPercentage ?? 0) > 0
          ? p.price * (1 - (p.discountPercentage ?? 0) / 100)
          : p.price,
      );
    if (sortBy === 'priceAsc') {
      results.sort((a, b) => byDiscountedPrice(a) - byDiscountedPrice(b));
    } else if (sortBy === 'priceDesc') {
      results.sort((a, b) => byDiscountedPrice(b) - byDiscountedPrice(a));
    } else if (sortBy === 'ratingDesc') {
      results.sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0));
    } else if (sortBy === 'newest') {
      // Already sorted by createdAt desc from Firestore
    }

    return results;
  }, [
    products,
    searchQuery,
    selectedCategories,
    sortBy,
    featuredOnly,
    inStockOnly,
    discountOnly,
    minRating,
    minPrice,
    maxPrice,
  ]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategories.size > 0) count++;
    if (featuredOnly) count++;
    if (inStockOnly) count++;
    if (discountOnly) count++;
    if (minRating > 0) count++;
    if (String(minPrice).trim()) count++;
    if (String(maxPrice).trim()) count++;
    return count;
  }, [selectedCategories.size, featuredOnly, inStockOnly, discountOnly, minRating, minPrice, maxPrice]);

  const toggleCategory = useCallback((categoryId: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedCategories(new Set());
    setFeaturedOnly(false);
    setInStockOnly(false);
    setDiscountOnly(false);
    setMinRating(0);
    setMinPrice('');
    setMaxPrice('');
  }, []);

  const handleAddToCart = async (product: Product) => {
    const stock = product.stock ?? 0;
    if (stock <= 0) {
      alert('Out of Stock', 'This product is currently out of stock.', [{ text: 'OK' }]);
      return;
    }

    try {
      const discountedPrice =
        product.discountPercentage > 0
          ? product.price * (1 - product.discountPercentage / 100)
          : product.price;

      setAddingId(product.id);
      await addToCart({
        id: product.id,
        name: product.title,
        price: Number(discountedPrice),
        originalPrice: product.discountPercentage > 0 ? product.price : undefined,
        image: product.thumbnail,
        brand: product.brand,
        inStock: stock > 0,
        stock: stock,
      });
      alert('Added to cart', `${product.title} has been added to your cart.`);
    } catch (e: any) {
      alert('Could not add to cart', e?.message ?? 'Please try again.');
    } finally {
      setAddingId(null);
    }
  };

  // Helper to get premium product images
  const getProductImageUri = (product: Product) => {
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

  const renderProductCard = ({ item }: { item: Product }) => {
    const discountedPrice =
      item.discountPercentage > 0 ? item.price * (1 - item.discountPercentage / 100) : item.price;
    const isOutOfStock = (item.stock ?? 0) <= 0;

    // Press scale animation
    const scale = new Animated.Value(1);
    const handlePressIn = () => {
      Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
    };
    const handlePressOut = () => {
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          style={styles.productCard}
          onPress={() => navigation.navigate('ProductDetails', { id: item.id })}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          <View style={styles.imageContainer}>
            <Image source={{ uri: getProductImageUri(item) }} style={styles.productImage} />
            {/* AR Badge */}
            <View style={styles.arBadge}>
              <Text style={styles.arBadgeText}>AR</Text>
            </View>
            {/* Discount Badge */}
            {item.discountPercentage > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{Math.round(item.discountPercentage)}%</Text>
              </View>
            )}
            {/* Stock indicator */}
            {isOutOfStock && (
              <View style={styles.outOfStockOverlay}>
                <Text style={styles.outOfStockText}>Out of Stock</Text>
              </View>
            )}
          </View>

          <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.priceRow}>
              <Text style={styles.productPrice}>
                ${discountedPrice.toFixed(2)}
              </Text>
              {item.discountPercentage > 0 && (
                <Text style={styles.originalPrice}>
                  ${item.price.toFixed(2)}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderCategoryChip = ({ item }: { item: StoreCategory }) => {
    const isSelected = selectedCategories.has(item.id);
    return (
      <TouchableOpacity
        style={[
          styles.categoryChip,
          {
            backgroundColor: isSelected ? colors.primary : colors.surface,
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}
        onPress={() => toggleCategory(item.id)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.categoryChipText,
            { color: isSelected ? colors.background : colors.text },
          ]}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const sortOptions: { key: SortBy; label: string }[] = [
    { key: 'newest', label: 'Newest' },
    { key: 'priceAsc', label: 'Price: Low → High' },
    { key: 'priceDesc', label: 'Price: High → Low' },
    { key: 'ratingDesc', label: 'Rating' },
  ];

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={colors.background === '#000000' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        translucent={false}
      />

      {/* Top Controls - Always Visible */}
      <View
        style={[
          styles.topControls,
          {
            backgroundColor: colors.background,
            paddingTop: Math.max(insets.top, 0) + 10,
          },
        ]}
      >
        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search products..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Sort & Filter Row */}
        <View style={styles.controlsRow}>
          {/* Sort Dropdown */}
          <View style={styles.sortDropdownContainer}>
          <TouchableOpacity
            style={[styles.sortButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setSortDropdownOpen(!sortDropdownOpen)}
              activeOpacity={0.7}
          >
            <Ionicons name="swap-vertical-outline" size={16} color={colors.text} />
            <Text style={[styles.sortButtonText, { color: colors.text }]} numberOfLines={1}>
              {sortOptions.find((o) => o.key === sortBy)?.label || 'Sort'}
            </Text>
              <Ionicons
                name={sortDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.textSecondary}
              />
          </TouchableOpacity>

            {/* Dropdown Menu */}
            {sortDropdownOpen && (
              <Animated.View
                style={[
                  styles.sortDropdownMenu,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    shadowColor: colors.text,
                    opacity: dropdownAnimation,
                    transform: [
                      {
                        translateY: dropdownAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-10, 0],
                        }),
                      },
                      {
                        scale: dropdownAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.95, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {sortOptions.map((option, index) => {
                  const isSelected = sortBy === option.key;
                  const isLast = index === sortOptions.length - 1;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.sortDropdownItem,
                        {
                          backgroundColor: isSelected ? colors.primary + '15' : 'transparent',
                          borderBottomWidth: isLast ? 0 : 1,
                        },
                      ]}
                      onPress={() => {
                        setSortBy(option.key);
                        setSortDropdownOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.sortDropdownItemText,
                          {
                            color: isSelected ? colors.primary : colors.text,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={18} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </Animated.View>
            )}
          </View>

          {/* Filter Button */}
          <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor: activeFilterCount > 0 ? colors.primary : colors.surface,
                borderColor: activeFilterCount > 0 ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setFiltersOpen(true)}
          >
            <Ionicons
              name="options-outline"
              size={16}
              color={activeFilterCount > 0 ? colors.background : colors.text}
            />
            <Text
              style={[
                styles.filterButtonText,
                { color: activeFilterCount > 0 ? colors.background : colors.text },
              ]}
            >
              Filter
            </Text>
            {activeFilterCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: colors.background }]}>
                <Text style={[styles.filterBadgeText, { color: colors.primary }]}>
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Category Chips */}
        {categories.length > 0 && (
          <FlatList
            horizontal
            data={categories}
            renderItem={renderCategoryChip}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChipsContainer}
          />
        )}
      </View>

      {/* Product Grid */}
      {loading ? (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading products...</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.centeredContainer}>
          <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.text }]}>No products found</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            {searchQuery || selectedCategories.size > 0 || activeFilterCount > 0
              ? 'Try adjusting your filters'
              : 'No products available yet'}
          </Text>
          {(searchQuery || selectedCategories.size > 0 || activeFilterCount > 0) && (
            <TouchableOpacity
              style={[styles.clearFiltersButton, { backgroundColor: colors.primary }]}
              onPress={clearAllFilters}
            >
              <Text style={[styles.clearFiltersText, { color: colors.background }]}>
                Clear all filters
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.productGrid}
          columnWrapperStyle={styles.productRow}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            filteredProducts.length > 0 ? (
              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
                </Text>
              </View>
            ) : null
          }
        />
      )}


      {/* Filter Bottom Sheet Modal */}
      <Modal
        visible={filtersOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFiltersOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalBackdropTouchable}
            activeOpacity={1}
            onPress={() => setFiltersOpen(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>
              <TouchableOpacity onPress={() => setFiltersOpen(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Categories */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Categories</Text>
                <View style={styles.categoryChipsGrid}>
                  {categories.map((cat) => {
                    const isSelected = selectedCategories.has(cat.id);
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surface,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => toggleCategory(cat.id)}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            { color: isSelected ? colors.background : colors.text },
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Featured Only */}
              <View style={styles.filterSection}>
                <TouchableOpacity
                  style={styles.filterRow}
                  onPress={() => setFeaturedOnly(!featuredOnly)}
                >
                  <Text style={[styles.filterRowLabel, { color: colors.text }]}>Featured only</Text>
                  <Ionicons
                    name={featuredOnly ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={featuredOnly ? colors.primary : colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* In Stock Only */}
              <View style={styles.filterSection}>
                <TouchableOpacity
                  style={styles.filterRow}
                  onPress={() => setInStockOnly(!inStockOnly)}
                >
                  <Text style={[styles.filterRowLabel, { color: colors.text }]}>In stock only</Text>
                  <Ionicons
                    name={inStockOnly ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={inStockOnly ? colors.primary : colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Discount Only */}
              <View style={styles.filterSection}>
                <TouchableOpacity
                  style={styles.filterRow}
                  onPress={() => setDiscountOnly(!discountOnly)}
                >
                  <Text style={[styles.filterRowLabel, { color: colors.text }]}>On sale only</Text>
                  <Ionicons
                    name={discountOnly ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={discountOnly ? colors.primary : colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Minimum Rating */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Minimum rating</Text>
                <View style={styles.ratingRow}>
                  {[0, 1, 2, 3, 4, 5].map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.ratingPill,
                        {
                          backgroundColor: minRating === r ? colors.primary : colors.surface,
                          borderColor: minRating === r ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setMinRating(r)}
                    >
                      <Text
                        style={[
                          styles.ratingPillText,
                          { color: minRating === r ? colors.background : colors.text },
                        ]}
                      >
                        {r === 0 ? 'Any' : `${r}+`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Price Range */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Price range</Text>
                <View style={styles.priceRangeRow}>
                  <View style={[styles.priceInputWrap, { borderColor: colors.border }]}>
                    <Text style={[styles.pricePrefix, { color: colors.textSecondary }]}>$</Text>
                    <TextInput
                      value={minPrice}
                      onChangeText={setMinPrice}
                      placeholder="Min"
                      keyboardType="numeric"
                      placeholderTextColor={colors.textSecondary}
                      style={[styles.priceInput, { color: colors.text }]}
                    />
                  </View>
                  <Text style={[styles.priceRangeSeparator, { color: colors.textSecondary }]}>—</Text>
                  <View style={[styles.priceInputWrap, { borderColor: colors.border }]}>
                    <Text style={[styles.pricePrefix, { color: colors.textSecondary }]}>$</Text>
                    <TextInput
                      value={maxPrice}
                      onChangeText={setMaxPrice}
                      placeholder="Max"
                      keyboardType="numeric"
                      placeholderTextColor={colors.textSecondary}
                      style={[styles.priceInput, { color: colors.text }]}
                    />
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary, { borderColor: colors.border }]}
                onPress={clearAllFilters}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Clear all</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: colors.primary }]}
                onPress={() => setFiltersOpen(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.background }]}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFCFB',
  },
  topControls: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 100,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F9F7',
    borderColor: '#E0EDE8',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
    color: '#0A6B4B',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
  },
  clearButton: {
    marginLeft: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  sortDropdownContainer: {
    flex: 1,
    position: 'relative',
    zIndex: 1001,
  },
  sortButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  sortButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  sortDropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 20,
    zIndex: 9999,
  },
  sortDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  sortDropdownItemText: {
    fontSize: 14,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 14,
    position: 'relative',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  categoryChipsContainer: {
    paddingVertical: 4,
    gap: 8,
    zIndex: 1,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  clearFiltersButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
  },
  productGrid: {
    padding: 20,
    paddingBottom: 100,
    zIndex: 1,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: 12, // Gap: 12 between rows
  },
  productCard: {
    width: (width - 52) / 2, // 2 columns with gap 12
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0EDE8',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0A6B4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  imageContainer: {
    width: '100%',
    height: 160,
    position: 'relative',
    backgroundColor: '#F4F9F7',
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
    backgroundColor: '#0A6B4B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  arBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 2,
  },
  discountText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  outOfStockText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  productInfo: {
    padding: 12,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D1F1A',
    marginBottom: 4,
    minHeight: 40,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A6B4B',
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    color: '#9DB8B0',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBackdropTouchable: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalBody: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  categoryChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  filterRowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  ratingPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  priceRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pricePrefix: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    fontSize: 14,
  },
  priceRangeSeparator: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondary: {
    borderWidth: 1,
  },
  modalButtonPrimary: {},
  modalButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ProductListScreen;
