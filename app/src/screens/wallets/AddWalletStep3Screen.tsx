import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { walletsApi } from '@/api/wallets.api';
import { upsertLocalWallet } from '@/storage/wallets.local';
import { Colors, FontFamily, Shadows, BorderRadius, Spacing } from '@/constants/theme';
import { Typography, Button } from '@/components/ui';

type AddWalletStackParamList = {
  AddWalletStep1: undefined;
  AddWalletStep2: { walletType: string; defaultPaymentMethod?: string; currency?: string; helpToCollect?: boolean };
  AddWalletStep3: { walletType: string; walletName: string; defaultPaymentMethod?: string; currency?: string; helpToCollect?: boolean };
};

const TYPE_LABELS: Record<string, string> = {
  hogar: 'Casa',
  negocio: 'Negocio',
  compartido: 'Gastos compartidos',
  otro: 'Otro',
};

const TYPE_ICONS: Record<string, string> = {
  hogar: 'home-outline',
  negocio: 'briefcase-outline',
  compartido: 'people-outline',
  otro: 'folder-outline',
};

type Props = NativeStackScreenProps<AddWalletStackParamList, 'AddWalletStep3'> & {
  onFinish?: (message?: string) => void;
};

export const AddWalletStep3Screen: React.FC<Props> = ({ route, navigation, onFinish }) => {
  const { 
    walletType, 
    walletName, 
    includeInGeneralBalance = true,
    defaultPaymentMethod, 
    currency = 'USD', 
    helpToCollect = false 
  } = route.params;
  const saved = useRef(false); // evitar doble guardado en re-renders

  const displayName = walletName || TYPE_LABELS[walletType] || 'Mi billetera';
  const typeLabel = TYPE_LABELS[walletType] || 'Otro';
  const icon = (TYPE_ICONS[walletType] || 'folder-outline') as any;

  /**
   * Al montar: crear en servidor + guardar localmente.
   * Si el servidor falla (offline), igualmente guarda localmente
   * con id temporal para que la lista local sea correcta.
   */
  useEffect(() => {
    if (saved.current) return;
    saved.current = true;

    (async () => {
      const finalName = displayName;
      let serverId: string | null = null;

      try {
        const created = await walletsApi.createWallet(
          finalName, 
          walletType, 
          defaultPaymentMethod, 
          currency, 
          helpToCollect,
          undefined, // warning
          undefined, // alert
          undefined, // defaultTransactionType
          includeInGeneralBalance
        );
        serverId = created.id;
      } catch (err) {
        console.error("Server creation failed", err);
        // Sin conexión — guardamos de todas formas localmente con id temporal
        serverId = `local_${Date.now()}`;
      }

      const isBusiness = walletType.includes('negocio') || walletType === 'business';
      const defaultTransactionType = isBusiness ? 'income' : 'expense';

      await upsertLocalWallet({
        id: serverId!,
        name: finalName,
        type: walletType,
        currency,
        defaultPaymentMethod,
        defaultTransactionType,
        helpToCollect,
        includeInGeneralBalance,
        balance: null,
        updatedAt: new Date().toISOString(),
      });
    })();
  }, []);

  const handleFinish = () => {
    if (onFinish) {
      onFinish();
    } else {
      navigation.getParent()?.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Content */}
      <View style={styles.content}>
        {/* Success circle */}
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={40} color={Colors.white} />
        </View>

        <Typography variant="headingH1" align="center" style={{ marginBottom: Spacing.xs }}>
          Billetera lista.
        </Typography>
        <Typography variant="bodyLarge" color="secondary" align="center" style={{ marginBottom: Spacing.xxl + 12 }}>
          Cuando quieras, registrá tu{'\n'}primer movimiento.
        </Typography>

        {/* Wallet preview card */}
        <View style={[styles.walletCard, Shadows.cardElevated]}>
          <View style={styles.walletIcon}>
            <Ionicons name={icon} size={22} color={Colors.primary} />
          </View>
          <View style={styles.walletInfo}>
            <Typography variant="labelBase">{displayName}</Typography>
            <Typography variant="captionBase" color="tertiary">{typeLabel}</Typography>
          </View>
          <View style={[styles.walletDot, { backgroundColor: Colors.primary }]} />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Button 
          label="Comenzar a usar"
          onPress={handleFinish}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    ...Shadows.cardElevated,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.card,
    padding: 18,
    width: '100%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.strokeSubtle,
  },
  walletIcon: {
    width: 48,
    height: 48,
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  walletInfo: { flex: 1, gap: 2 },
  walletDot: { width: 8, height: 8, borderRadius: 4 },
  footer: { paddingHorizontal: 24, paddingBottom: 32 },
});
