import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Modal, ActivityIndicator, RefreshControl, TextInput, Animated, Platform, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { WalletsStackParamList } from './WalletsNavigator';
import { UnifiedAddWalletScreen } from '@/screens/wallets/UnifiedAddWalletScreen';
import { walletsApi } from '@/api/wallets.api';
import { useAuthStore } from '@/store/auth.store';
import { usersApi } from '@/api/users.api';
import {
  LocalWallet,
  getLocalWallets,
  mergeServerWallets,
} from '@/storage/wallets.local';
import { Colors, Spacing, Shadows, BorderRadius, FontFamily } from '@/constants/theme';
import { Typography } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { WalletCard } from '@/components/ui/WalletCard';
import { getLocalTickets } from '@/storage/tickets.local';
import { processWalletsWithTickets } from '@/utils/walletCalculations';

export const WalletsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<WalletsStackParamList>>();
  const route = useRoute<RouteProp<WalletsStackParamList, 'WalletsMain'>>();
  const { user, updateUser } = useAuthStore();
  const [wallets, setWallets] = useState<LocalWallet[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [toastVisible] = useState(new Animated.Value(0));
  const [toastMessage, setToastMessage] = useState('');

  const loadLocal = useCallback(async () => {
    setLocalLoading(true);
    const local = await getLocalWallets();
    const tickets = await getLocalTickets();
    const walletsWithStats = processWalletsWithTickets(local, tickets);
    setWallets(walletsWithStats);
    setLocalLoading(false);
  }, []);

  const syncBalances = useCallback(async () => {
    setBalanceLoading(true);
    setOffline(false);
    try {
      const { ticketsApi } = await import('@/api/tickets.api');
      const { mergeServerTickets } = await import('@/storage/tickets.local');

      const [serverWallets, serverTickets] = await Promise.all([
        walletsApi.getMyWallets(),
        ticketsApi.getMyTickets()
      ]);

      const [mergedWallets, mergedTickets] = await Promise.all([
        mergeServerWallets(serverWallets),
        mergeServerTickets(serverTickets)
      ]);
      
      const walletsWithStats = processWalletsWithTickets(mergedWallets, mergedTickets);

      setWallets(walletsWithStats);
    } catch (err) {
      console.error("[WalletsScreen.syncBalances] Error:", err);
      setOffline(true);
    } finally {
      setBalanceLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLocal().then(() => syncBalances());
  }, [loadLocal, syncBalances]);

  useEffect(() => {
    if ((route.params as any)?.openAddModal) {
      setShowAddModal(true);
      navigation.setParams({ openAddModal: false } as any);
    }
  }, [(route.params as any)?.openAddModal]);

  const handleClose = (message?: string, navParams?: any) => {
    setShowAddModal(false);
    loadLocal().then(() => syncBalances());
    
    if (navParams) {
      setTimeout(() => {
        navigation.navigate('WalletDetails', navParams);
      }, 400);
    } else if (message) {
      setToastMessage(message);
      Animated.sequence([
        Animated.timing(toastVisible, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(toastVisible, { toValue: 0, duration: 250, useNativeDriver: true })
      ]).start();
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    syncBalances();
  };

  const handleSetDefault = async (walletId: string) => {
    if (!user?.id) return;
    updateUser({ defaultWalletId: walletId });
    setToastMessage('Billetera predeterminada actualizada');
    Animated.sequence([
      Animated.timing(toastVisible, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(toastVisible, { toValue: 0, duration: 250, useNativeDriver: true })
    ]).start();
    try {
      await usersApi.updateProfile(user.id, { defaultWalletId: walletId });
    } catch (error) {
      console.warn("Failed to sync default wallet to server:", error);
    }
  };

  const filteredWallets = wallets.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    const isNegA = (a.balance || 0) < 0;
    const isNegB = (b.balance || 0) < 0;
    const overdueA = (a as any).overdueCount || 0;
    const overdueB = (b as any).overdueCount || 0;
    if (isNegA !== isNegB) return isNegA ? -1 : 1;
    if (overdueA !== overdueB) return overdueB - overdueA;
    if (a.id === user?.defaultWalletId) return -1;
    if (b.id === user?.defaultWalletId) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" />
      
      <View style={styles.header}>
        {searchActive ? (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={Colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre..."
              placeholderTextColor="#737373"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity onPress={() => { setSearchActive(false); setSearchQuery(''); }}>
              <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerTop}>
            <View>
              <Typography variant="headingH2">Billeteras</Typography>
              <Typography variant="labelSmall" color={Colors.textTertiary}>
                {filteredWallets.length} billeteras
              </Typography>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setSearchActive(true)}>
                <Ionicons name="search-outline" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.iconBtn, { backgroundColor: '#207e52' }]} 
                onPress={() => setShowAddModal(true)}
              >
                <Ionicons name="wallet-outline" size={22} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {localLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : wallets.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 }}>
          <View style={[styles.emptyIconWrapper, Shadows.card]}>
            <Ionicons name="wallet-outline" size={40} color="#b7b7ae" />
          </View>
          <Typography variant="headingH3" align="center">Empezá tu colección</Typography>
          <Typography variant="bodyLarge" color="secondary" align="center">
            Registrá tu primera billetera para organizar tu dinero.
          </Typography>
          <Button label="Crear billetera" onPress={() => setShowAddModal(true)} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {offline && (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline-outline" size={12} color="#b7b7ae" />
              <Typography variant="captionBase" color="tertiary">Modo sin conexión</Typography>
            </View>
          )}

          {filteredWallets.map((w) => (
            <WalletCard
              key={w.id}
              {...w}
              id={w.id}
              balance={w.balance ?? 0}
              isDefault={user?.defaultWalletId === w.id}
              onSetDefault={() => handleSetDefault(w.id)}
              includeInGeneralBalance={w.includeInGeneralBalance}
              onPress={() => navigation.navigate('WalletDetails', { walletId: w.id, walletName: w.name, walletType: w.type, currency: w.currency })}
              onPressPending={() => navigation.navigate('MainTabs', { screen: 'Historial', params: { walletId: w.id, filter: 'pending' } } as any)}
            />
          ))}
        </ScrollView>
      )}

      <Modal 
        visible={showAddModal} 
        animationType="slide" 
        presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}
        onRequestClose={() => setShowAddModal(false)}
      >
        <UnifiedAddWalletScreen onFinish={(msg, params) => handleClose(msg, params)} />
      </Modal>

      {toastMessage ? (
        <Animated.View style={[styles.toast, { opacity: toastVisible }]} pointerEvents="none">
          <Typography variant="labelBase" color={Colors.white}>{toastMessage}</Typography>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, ...Shadows.card },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 28, paddingHorizontal: 16, height: 56 },
  searchInput: { flex: 1, marginLeft: 12, fontFamily: FontFamily.regular, fontSize: 16, color: Colors.textPrimary },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIconWrapper: { width: 80, height: 80, borderRadius: 32, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 12 },
  offlineBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 },
  toast: { position: 'absolute', top: 60, left: 24, right: 24, backgroundColor: Colors.primary, borderRadius: 99, paddingVertical: 12, alignItems: 'center', ...Shadows.cardElevated },
});
