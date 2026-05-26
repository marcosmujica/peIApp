import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { FontFamily } from '@/constants/theme';
import { getLocalWallets, saveLocalWallets, LocalWallet } from '@/storage/wallets.local';
import { walletsApi } from '@/api/wallets.api';
import { Button } from '@/components/ui/Button';
import { GENERAL_RUBROS_GASTOS, GENERAL_RUBROS_INGRESOS, WALLET_RUBROS_MAP, RubroItem } from '@/constants/rubros';

type Props = NativeStackScreenProps<RootStackParamList, 'WalletCategories'>;

export const WalletCategoriesScreen: React.FC<Props> = ({ route, navigation }) => {
  const { walletId } = route.params;
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [wallet, setWallet] = useState<LocalWallet | null>(null);
  const [searchText, setSearchText] = useState('');
  const [enabledCategories, setEnabledCategories] = useState<{ categoryKey: string; type: 'income' | 'expense' }[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const all = await getLocalWallets();
      const w = all.find(x => x.id === walletId);
      if (w) {
        setWallet(w);
        if (w.enabledCategories && w.enabledCategories.length > 0) {
          setEnabledCategories(w.enabledCategories);
        } else {
          // Pre-poblar con los defaults según el tipo de billetera
          const walletType = w.type || 'otro';
          const mapping = WALLET_RUBROS_MAP[walletType] || { gastos: [], ingresos: [] };
          const defaults: { categoryKey: string; type: 'income' | 'expense' }[] = [
            ...mapping.ingresos.map(k => ({ categoryKey: k, type: 'income' as const })),
            ...mapping.gastos.map(k => ({ categoryKey: k, type: 'expense' as const }))
          ];
          setEnabledCategories(defaults);
        }
      }
      setLoading(false);
    };
    loadData();
  }, [walletId]);

  const handleToggle = (key: string, type: 'income' | 'expense') => {
    const exists = enabledCategories.find(c => c.categoryKey === key && c.type === type);
    if (exists) {
      setEnabledCategories(enabledCategories.filter(c => !(c.categoryKey === key && c.type === type)));
    } else {
      setEnabledCategories([...enabledCategories, { categoryKey: key, type }]);
    }
  };

  const handleSave = async () => {
    if (!walletId) return;
    setIsSaving(true);
    try {
      // 1. Update Local
      const all = await getLocalWallets();
      const idx = all.findIndex(w => w.id === walletId);
      if (idx >= 0) {
        all[idx] = {
          ...all[idx],
          enabledCategories,
          updatedAt: new Date().toISOString(),
        };
        await saveLocalWallets(all);
      }

      // 2. Update Server
      await walletsApi.updateWallet(walletId, { 
        enabledCategories,
      });

      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo guardar la configuración.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#171717" />
      </View>
    );
  }

  const filteredGastos = GENERAL_RUBROS_GASTOS
    .filter(r => r.label.toLowerCase().includes(searchText.toLowerCase()))
    .sort((a, b) => a.label.localeCompare(b.label));

  const filteredIngresos = GENERAL_RUBROS_INGRESOS
    .filter(r => r.label.toLowerCase().includes(searchText.toLowerCase()))
    .sort((a, b) => a.label.localeCompare(b.label));

  const renderCategoryItem = (item: RubroItem, type: 'income' | 'expense') => {
    const isEnabled = enabledCategories.some(c => c.categoryKey === item.id && c.type === type);
    return (
      <TouchableOpacity 
        key={`${type}-${item.id}`}
        style={styles.categoryItem}
        onPress={() => handleToggle(item.id, type)}
        activeOpacity={0.7}
      >
        <View style={styles.categoryInfo}>
          <View style={[
            styles.typeIndicator, 
            { backgroundColor: type === 'income' ? '#DCFCE7' : '#FEE2E2' }
          ]}>
            <Ionicons 
              name={item.icon as any} 
              size={14} 
              color={type === 'income' ? "#166534" : "#991B1B"} 
            />
          </View>
          <Text style={styles.categoryLabel}>{item.label}</Text>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={() => handleToggle(item.id, type)}
          trackColor={{ false: '#E5E5E5', true: '#10B981' }}
          thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : isEnabled ? '#FFFFFF' : '#F5F5F5'}
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#171717" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categorías de {wallet?.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#A3A3A3" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar categorías..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#A3A3A3"
        />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.infoText}>
          Selecciona qué categorías quieres ver al crear o modificar un ticket en esta billetera.
        </Text>

        {filteredIngresos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cobros / Orígenes del dinero</Text>
            <View style={styles.card}>
              {filteredIngresos.map(r => renderCategoryItem(r, 'income'))}
            </View>
          </View>
        )}

        {filteredGastos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pagar / Categorías del gasto</Text>
            <View style={styles.card}>
              {filteredGastos.map(r => renderCategoryItem(r, 'expense'))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button 
          label={isSaving ? "Guardando..." : "Guardar cambios"}
          onPress={handleSave}
          disabled={isSaving}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontFamily: FontFamily.bold, color: '#171717' },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    ...Platform.select({
      web: { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
      android: { elevation: 2 }
    })
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 24, fontSize: 15, fontFamily: FontFamily.regular, color: '#171717', padding: 0 },

  content: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  infoText: { 
    fontSize: 14, 
    fontFamily: FontFamily.medium, 
    color: '#737373', 
    marginBottom: 24,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 16
  },

  section: { marginBottom: 24 },
  sectionTitle: { 
    fontSize: 13, 
    fontFamily: FontFamily.bold, 
    color: '#737373', 
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4
  },
  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB'
  },
  categoryInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  typeIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  categoryLabel: { fontSize: 15, fontFamily: FontFamily.medium, color: '#171717', flex: 1 },

  footer: { 
    padding: 20, 
    backgroundColor: '#FFFFFF', 
    borderTopWidth: 1, 
    borderTopColor: '#F5F5F5',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20
  }
});
