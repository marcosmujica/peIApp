import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { FontFamily, Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import { WEB_SHARE_URL } from '@/api/api.client';

type RouteParams = {
  MovementSuccess: {
    type: 'income' | 'expense';
    amount: string;
    description: string;
    walletName: string;
    date: string;
    status: 'pending' | 'completed';
    currency: string;
    shortId?: string;
  };
};

export const MovementSuccessScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'MovementSuccess'>>();
  const { type, amount, description, walletName, date, status, currency, shortId } = route.params;
  const { user } = useAuthStore();

  const isIncome = type === 'income';

  const handleShare = async () => {
    if (!shortId) return;
    try {
      const userName = user?.displayName || user?.phoneNumber || 'Un usuario';
      const shareUrl = `${WEB_SHARE_URL}/t/${shortId}`;
      const message = `${userName} te envió un ticket de PeIApp.\n\nPodés ver los detalles, postergar la fecha o cargar un pago acá:\n${shareUrl}\n\n¡Mejorá tus finanzas con PeIApp! www.peiapp.tech`;

      await Share.share({
        message,
        url: shareUrl,
      });
    } catch (error) {
      console.error('Error sharing ticket:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.checkCircle}>
          <Ionicons name="checkmark" size={24} color="#16A34A" />
        </View>
        <Text style={styles.title}>¡Listo!</Text>
        <Text style={styles.subtitle}>
          Tu {isIncome ? 'ingreso' : 'gasto'} quedó registrado.
        </Text>
      </View>

      {/* Info Card */}
      <View style={[styles.card, isIncome ? styles.cardIncome : styles.cardExpense]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, isIncome ? styles.textIncome : styles.textExpense]}>
            {isIncome ? 'INGRESO REGISTRADO' : 'GASTO REGISTRADO'}
          </Text>
        </View>

        <View style={styles.amountRow}>
          <Text style={[styles.amount, isIncome ? styles.textIncome : styles.textExpense]}>
            ${Number(amount).toLocaleString('es-AR')}
          </Text>
          <View style={[styles.badge, status === 'pending' ? styles.badgePending : styles.badgeCompleted]}>
            <Text style={[styles.badgeText, status === 'pending' ? styles.badgeTextPending : styles.badgeTextCompleted]}>
              {status === 'pending' ? 'Pendiente' : (isIncome ? 'Ya cobrado' : 'Ya pagado')}
            </Text>
          </View>
        </View>

        {/* Rows */}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Descripción</Text>
          <Text style={styles.rowValue}>{description}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Billetera</Text>
          <View style={styles.rowValueIcon}>
            <Ionicons name="wallet-outline" size={14} color="#737373" />
            <Text style={[styles.rowValue, { marginLeft: 4 }]}>{walletName}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Fecha</Text>
          <Text style={styles.rowValue}>{date}</Text>
        </View>
      </View>

      {/* Helper Text */}
      <View style={styles.helperTextContainer}>
        <Text style={styles.helperText}>
          {status === 'pending'
            ? (isIncome ? 'Cuando te paguen, lo marcamos como cobrado. También podés generar un peilink para que te transfieran directo.' : 'Cuando lo pagues, lo marcamos como pagado.')
            : `El ${isIncome ? 'cobro' : 'pago'} ya se encuentra registrado y confirmado en la billetera.`}
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => navigation.navigate('Inicio', { screen: 'DashboardScreen' })}
        >
          <Text style={styles.btnPrimaryText}>Volver al inicio</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {shortId && (
          <TouchableOpacity
            style={[styles.btnSecondary, { backgroundColor: Colors.primary + '10', borderColor: Colors.primary }]}
            onPress={handleShare}
          >
            <Ionicons name="share-social-outline" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.btnSecondaryText, { color: Colors.primary }]}>Compartir ticket</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="refresh" size={20} color="#171717" style={{ marginRight: 8 }} />
          <Text style={styles.btnSecondaryText}>Registrar otro</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    borderWidth: 2,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: FontFamily.bold,
    color: '#171717',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FontFamily.regular,
    color: '#737373',
  },
  card: {
    marginHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardIncome: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  cardExpense: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  cardHeader: {
    padding: 20,
    paddingBottom: 4,
  },
  cardTitle: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    letterSpacing: 1,
    marginBottom: 8,
  },
  textIncome: {
    color: '#16A34A',
  },
  textExpense: {
    color: '#DC2626',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  amount: {
    fontSize: 36,
    fontFamily: FontFamily.bold,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
  },
  badgeCompleted: {
    backgroundColor: '#E5E7EB',
  },
  badgeText: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
  },
  badgeTextPending: {
    color: '#92400E',
  },
  badgeTextCompleted: {
    color: '#374151',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    backgroundColor: '#FFFFFF',
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: '#737373',
  },
  rowValue: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    color: '#171717',
  },
  rowValueIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helperTextContainer: {
    marginHorizontal: 24,
    marginTop: 16,
    backgroundColor: '#FAFAFA',
    padding: 16,
    borderRadius: 12,
  },
  helperText: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: '#737373',
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    gap: 12,
  },
  btnPrimary: {
    flexDirection: 'row',
    backgroundColor: '#171717',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: '#FFFFFF',
  },
  btnSecondary: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: '#171717',
  },
});
