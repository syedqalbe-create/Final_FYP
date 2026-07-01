import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText as Text } from '../../components/common/AppText';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeAdminStats,
  subscribeRecentOrders,
  subscribeRecentUsers,
  subscribeNewOrderCount,
  type AdminOrderRow,
  type AdminUserRow,
} from '../../services/admin/adminService';

export default function AdminDashboardScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { isAdmin } = useAuth();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, products: 0, orders: 0 });
  const [recentOrders, setRecentOrders] = useState<AdminOrderRow[]>([]);
  const [recentUsers, setRecentUsers] = useState<AdminUserRow[]>([]);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [loadingLists, setLoadingLists] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    const unsub = subscribeAdminStats(
      (s) => {
        setStats(s);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setLoadingLists(false);
      return;
    }

    let gotUsers = false;
    let gotOrders = false;
    const maybeDone = () => {
      if (gotUsers && gotOrders) {
        setLoadingLists(false);
      }
    };

    const unsubUsers = subscribeRecentUsers(
      (rows) => {
        setRecentUsers(rows);
        gotUsers = true;
        maybeDone();
      },
      () => {
        gotUsers = true;
        maybeDone();
      },
    );

    const unsubOrders = subscribeRecentOrders(
      (rows) => {
        setRecentOrders(rows);
        gotOrders = true;
        maybeDone();
      },
      () => {
        gotOrders = true;
        maybeDone();
      },
    );

    const unsubNewOrderCount = subscribeNewOrderCount(
      (count) => {
        setNewOrderCount(count);
      },
      () => {
        // Ignore errors for notification count
      },
    );

    return () => {
      unsubUsers();
      unsubOrders();
      unsubNewOrderCount();
    };
  }, [isAdmin]);

  const cards = useMemo(
    () => [
      { label: 'Users', value: stats.users, icon: 'people-outline' },
      { label: 'Products', value: stats.products, icon: 'pricetags-outline' },
      { label: 'Orders', value: stats.orders, icon: 'receipt-outline' },
    ],
    [stats],
  );

  const actions = useMemo(
    () => [
      {
        title: 'Add product',
        subtitle: 'Create a new listing',
        icon: 'add-circle-outline',
        onPress: () => navigation.navigate('AdminProductEdit'),
      },
      {
        title: 'Manage categories',
        subtitle: 'Create & organize categories',
        icon: 'albums-outline',
        onPress: () => navigation.navigate('AdminCategories'),
      },
      {
        title: 'Manage users',
        subtitle: 'Roles and accounts',
        icon: 'people-outline',
        onPress: () => navigation.navigate('AdminTabs', { screen: 'Users' }),
      },
      {
        title: 'View orders',
        subtitle: newOrderCount > 0 ? `${newOrderCount} new order${newOrderCount > 1 ? 's' : ''}` : 'Latest purchases',
        icon: 'receipt-outline',
        onPress: () => navigation.navigate('AdminTabs', { screen: 'OrdersAdmin' }),
        badge: newOrderCount > 0 ? newOrderCount : undefined,
      },
      {
        title: 'Manage products',
        subtitle: 'Inventory & pricing',
        icon: 'pricetags-outline',
        onPress: () => navigation.navigate('AdminTabs', { screen: 'ProductsAdmin' }),
      },
    ],
    [navigation, newOrderCount],
  );

  const statusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return '#4CD964';
      case 'shipped':
        return '#007AFF';
      case 'cancelled':
        return '#FF3B30';
      case 'processing':
      default:
        return '#FF9500';
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text, textShadowColor: colors.glow, textShadowRadius: isDark ? 8 : 0 }]}>Admin Dashboard</Text>
            <Text style={[styles.body, { color: colors.textSecondary, marginTop: -6 }]}>
              Manage the store and users
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.themeToggleBtn, { borderColor: colors.border }]}
            onPress={toggleTheme}
          >
            <Ionicons name={isDark ? "moon" : "sunny"} size={18} color={isDark ? colors.secondary : colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.openShopBtn, { backgroundColor: colors.primary, shadowColor: colors.glow, shadowRadius: 10, shadowOpacity: 0.5 }]}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Ionicons name="storefront-outline" size={18} color={colors.background} />
            <Text style={[styles.openShopText, { color: colors.background }]}>Open Shop</Text>
          </TouchableOpacity>
        </View>

        {!isAdmin ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.subtitle, { color: colors.text }]}>Not authorized</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              This area is only accessible to admin accounts.
            </Text>
          </View>
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.body, { color: colors.textSecondary, marginTop: 10 }]}>
              Loading…
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.grid}>
              {cards.map((c) => (
                <TouchableOpacity
                  key={c.label}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (c.label === 'Users') navigation.navigate('AdminTabs', { screen: 'Users' });
                    if (c.label === 'Products')
                      navigation.navigate('AdminTabs', { screen: 'ProductsAdmin' });
                    if (c.label === 'Orders') navigation.navigate('AdminTabs', { screen: 'OrdersAdmin' });
                  }}
                  style={[
                    styles.statCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Ionicons name={c.icon as any} size={22} color={colors.primary} />
                  <Text style={[styles.statValue, { color: colors.text }]}>{c.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick actions</Text>
              <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                One-tap admin tools
              </Text>
            </View>
            <View style={styles.actionsGrid}>
              {actions.map((a) => (
                <TouchableOpacity
                  key={a.title}
                  activeOpacity={0.85}
                  onPress={a.onPress}
                  style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: colors.background }]}>
                    <Ionicons name={a.icon as any} size={20} color={colors.primary} />
                    {a.badge && a.badge > 0 && (
                      <View style={[styles.actionBadge, { backgroundColor: '#FF3B30' }]}>
                        <Text style={styles.actionBadgeText}>{a.badge > 99 ? '99+' : a.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.actionTitle, { color: colors.text }]} numberOfLines={1}>
                    {a.title}
                  </Text>
                  <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                    {a.subtitle}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent activity</Text>
              <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                Latest orders and signups
              </Text>
            </View>

            {loadingLists ? (
              <View style={styles.centerSmall}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <>
                <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.panelHeader}>
                    <Text style={[styles.panelTitle, { color: colors.text }]}>Latest orders</Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('AdminTabs', { screen: 'OrdersAdmin' })}
                      style={styles.panelLink}
                    >
                      <Text style={[styles.panelLinkText, { color: colors.primary }]}>See all</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>

                  {recentOrders.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      No orders found yet.
                    </Text>
                  ) : (
                    recentOrders.map((o) => (
                      <View key={o.id} style={[styles.row, { borderTopColor: colors.border }]}>
                        <View style={styles.rowLeft}>
                          <Text style={[styles.rowTitle, { color: colors.text }]}>
                            Order #{o.shortId}
                          </Text>
                          <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                            {o.userId}
                          </Text>
                        </View>
                        <View style={styles.rowRight}>
                          <View
                            style={[
                              styles.badge,
                              { backgroundColor: statusColor(o.status), borderColor: colors.border },
                            ]}
                          >
                            <Text style={styles.badgeText}>{o.status}</Text>
                          </View>
                          <Text style={[styles.rowAmount, { color: colors.text }]}>
                            ${o.total.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>

                <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.panelHeader}>
                    <Text style={[styles.panelTitle, { color: colors.text }]}>Newest users</Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('AdminTabs', { screen: 'Users' })}
                      style={styles.panelLink}
                    >
                      <Text style={[styles.panelLinkText, { color: colors.primary }]}>See all</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>

                  {recentUsers.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      No users found yet.
                    </Text>
                  ) : (
                    recentUsers.map((u) => (
                      <View key={u.uid} style={[styles.row, { borderTopColor: colors.border }]}>
                        <View style={styles.rowLeft}>
                          <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                            {u.name || '—'}
                          </Text>
                          <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                            {u.email || u.uid}
                          </Text>
                        </View>
                        <View style={styles.rolePill}>
                          <Text style={[styles.rolePillText, { color: colors.textSecondary }]}>
                            {(u.role || 'user').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 14 },
  subtitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  body: { fontSize: 13, lineHeight: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  openShopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  themeToggleBtn: {
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openShopText: { fontSize: 13, fontWeight: '800' },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  centerSmall: { alignItems: 'center', justifyContent: 'center', paddingVertical: 18 },
  grid: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '600' },
  card: { borderWidth: 1, borderRadius: 16, padding: 16 },
  sectionHeader: { marginTop: 18, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  sectionHint: { fontSize: 12, marginTop: 4 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  actionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  actionBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  actionTitle: { fontSize: 14, fontWeight: '800' },
  actionSubtitle: { fontSize: 12 },
  panel: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { fontSize: 14, fontWeight: '800' },
  panelLink: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  panelLinkText: { fontSize: 12, fontWeight: '800' },
  emptyText: { fontSize: 12, marginTop: 10 },
  row: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLeft: { flex: 1 },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  rowTitle: { fontSize: 13, fontWeight: '800' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  rowAmount: { fontSize: 13, fontWeight: '800' },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  rolePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  rolePillText: { fontSize: 11, fontWeight: '900' },
});


