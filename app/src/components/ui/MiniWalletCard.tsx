import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { Avatar } from "./Avatar";
import { Ionicons } from "@expo/vector-icons";

interface MiniWalletCardProps {
  wallet: {
    id: string;
    name: string;
    balance: number;
    currency: string;
    type?: string;
    avatarUrl?: string | null;
    overdueCount?: number;
  };
  onPress?: () => void;
  style?: ViewStyle;
}

const TYPE_ICONS: Record<string, any> = {
  personal: 'home-outline',
  business: 'briefcase-outline',
  shared: 'people-outline',
  default: 'wallet-outline'
};

export const MiniWalletCard: React.FC<MiniWalletCardProps> = ({ wallet, onPress, style }) => {
  const balance = wallet.balance || 0;
  const isNegative = balance < 0;
  const hasOverdue = !!wallet.overdueCount && wallet.overdueCount > 0;
  
  // Logic matching WalletCard status
  const alertThreshold = (wallet as any).alertThreshold || 0;
  const warningThreshold = (wallet as any).warningThreshold || 0;
  
  const isAlert = isNegative || (wallet.overdueCount && wallet.overdueCount > 1) || (alertThreshold > 0 && balance <= alertThreshold);
  const isWarning = !isAlert && (hasOverdue || (warningThreshold > 0 && balance <= warningThreshold));
  const isGood = !isAlert && !isWarning;

  const statusColor = isAlert ? Colors.alertsError : isWarning ? Colors.alertsWarning : Colors.alertsSuccess;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.card, style]}
    >
      <View style={styles.header}>
        <View style={styles.iconWrapper}>
          {wallet.avatarUrl ? (
            <Avatar uri={wallet.avatarUrl} size="sm" />
          ) : (
            <Ionicons 
              name={TYPE_ICONS[wallet.type || 'default'] || TYPE_ICONS.default} 
              size={16} 
              color={Colors.textSecondary} 
            />
          )}
        </View>
        
        {hasOverdue ? (
           <View style={[styles.overdueBadge, { backgroundColor: statusColor }]}>
             <Text style={styles.overdueText}>{wallet.overdueCount}</Text>
           </View>
        ) : (
           <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        )}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.balance, isNegative && { color: Colors.alertsError }]} numberOfLines={1}>
          {wallet.currency || 'UYU'} ${balance.toLocaleString('es-AR')}
        </Text>
        <Text style={styles.name} numberOfLines={1}>
          {wallet.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 140,
    height: 140,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    justifyContent: "space-between",
    ...Shadows.card,
    borderWidth: 1,
    borderColor: 'rgba(20,51,39,0.05)'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.alertsSuccess,
  },
  overdueBadge: {
    backgroundColor: Colors.alertsError,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    ...Shadows.card,
  },
  overdueText: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: 10,
  },
  footer: {
    gap: 2,
  },
  balance: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  name: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textPrimary,
  },
});
