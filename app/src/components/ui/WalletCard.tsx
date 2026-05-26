import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, Image, StyleSheet, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from './Card';
import { Colors, FontFamily, Shadows, Spacing, BorderRadius, UXRules } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SYSTEM_WALLET_NAME } from '@/constants';
import { normalizeAvatarUrl } from '@/utils/url.util';

export interface WalletCardProps {
  id: string;
  name: string;
  type: string;
  balance: number | null;
  currency?: string;
  onPress?: () => void;
  selected?: boolean;
  isDefault?: boolean;
  avatarUrl?: string;
  onSetDefault?: () => void;
  
  lastChatMessage?: string;
  lastChatSenderAvatar?: string;
  lastChatIsSeen?: boolean;
  lastChatSenderId?: string;
  warningThreshold?: number;
  alertThreshold?: number;
  overdueCount?: number;
  pendingIncomes?: number;
  pendingExpenses?: number;
  pendingCount?: number;
  includeInGeneralBalance?: boolean;
  onPressPending?: () => void;
  variant?: 'card' | 'flat';
}

const TYPE_ICONS: Record<string, string> = {
  hogar:              'home-outline',
  negocio:            'briefcase-outline',
  negocio_productos:  'briefcase-outline',
  negocio_servicios:  'construct-outline',
  compartido:         'people-outline',
  business:           'briefcase-outline',
  casa:               'home-outline',
  personal:           'home-outline',
  gastos_compartidos: 'people-outline',
  shared:             'people-outline',
  otro:               'folder-outline',
};

const TYPE_LABELS: Record<string, string> = {
  hogar:              'Casa',
  negocio:            'Negocio',
  negocio_productos:  'Negocio',
  negocio_servicios:  'Negocio',
  compartido:         'Compartido',
  business:           'Negocio',
  casa:               'Casa',
  personal:           'Personal',
  gastos_compartidos: 'Compartido',
  shared:             'Compartido',
  otro:               'Billetera',
};

export const WalletCard: React.FC<WalletCardProps> = ({
  id,
  name,
  type,
  balance,
  currency = 'UYU',
  onPress,
  avatarUrl,
  isDefault,
  onSetDefault,
  lastChatMessage,
  lastChatSenderAvatar,
  lastChatIsSeen,
  lastChatSenderId,
  warningThreshold,
  alertThreshold,
  overdueCount = 0,
  pendingIncomes = 0,
  pendingExpenses = 0,
  pendingCount = 0,
  includeInGeneralBalance = true,
  onPressPending,
  variant = 'card',
}) => {
  const navigation = useNavigation<any>();
  const isUnassigned = name.toLowerCase() === SYSTEM_WALLET_NAME.toLowerCase();

  const formattedBalance = balance !== null 
    ? new Intl.NumberFormat('es-AR', {
        style: 'decimal',
        minimumFractionDigits: 0,
      }).format(Math.abs(balance))
    : '0';

  const isPositive = balance !== null && balance >= 0;

  if (variant === 'flat') {
    return (
      <View className="bg-transparent py-3 border-b border-[#f2f2f0]">
        <TouchableOpacity activeOpacity={0.8} onPress={onPress} className="flex-col gap-1">
          {/* Header & Balance */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-8 h-8 rounded-full overflow-hidden bg-[#f2f2f0] items-center justify-center">
                {avatarUrl ? (
                  <Image source={{ uri: normalizeAvatarUrl(avatarUrl) }} className="w-full h-full" />
                ) : (
                  <Ionicons name="wallet-outline" size={16} color="#363630" />
                )}
              </View>
              <Text className="text-[17px] font-heading text-[#363630]" numberOfLines={1}>
                {name}
              </Text>
            </View>
            
            <View className="flex-row items-baseline gap-1">
              <Text className="text-[12px] font-['PlusJakarta-Medium'] text-[#b7b7ae]">
                {currency}
              </Text>
              <Text 
                className="text-[18px] font-['PlusJakarta-Medium']"
                style={{ color: isPositive ? '#363630' : '#c05050' }}
              >
                ${formattedBalance}
              </Text>
            </View>
          </View>

          {/* Stats Row */}
          {pendingCount > 0 && (
            <View className="flex-row items-center pl-11">
              <View className="flex-row items-center gap-1">
                <Ionicons name="time-outline" size={12} color="#878778" />
                <Text className="text-[12px] text-[#878778]">
                  {pendingCount} {pendingCount === 1 ? 'pend.' : 'pend.'}
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-[24px] p-4 shadow-sm border border-[#eceae3] mb-3">
      <TouchableOpacity 
        activeOpacity={0.8} 
        onPress={onPress}
        className="flex-col gap-4"
      >
        {/* Card Header */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3 flex-1">
            <View className="w-8 h-8 rounded-full overflow-hidden bg-[#f2f2f0] items-center justify-center">
              {avatarUrl ? (
                <Image source={{ uri: normalizeAvatarUrl(avatarUrl) }} className="w-full h-full" />
              ) : (
                <Ionicons name="wallet-outline" size={16} color="#363630" />
              )}
            </View>
            
            <View className="flex-row items-center gap-1 flex-1">
              <Text className="text-[17px] font-heading text-[#363630]" numberOfLines={1}>
                {name}
              </Text>
            </View>
          </View>
          
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                onSetDefault?.();
              }}
              className="p-2 -mr-2"
            >
              <Ionicons 
                name={isDefault ? "star" : "star-outline"} 
                size={20} 
                color={isDefault ? "#ffa000" : "#b7b7ae"} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance & Stats */}
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <View className="flex-row items-baseline gap-2">
              <Text className="text-[14px] font-['PlusJakarta-Medium'] text-[#b7b7ae]">
                {currency}
              </Text>
              <Text 
                className="text-[24px] font-['PlusJakarta-Medium']"
                style={{ color: isPositive ? '#363630' : '#c05050' }}
              >
                ${formattedBalance}
              </Text>
            </View>
            {includeInGeneralBalance === false && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Ionicons name="eye-off-outline" size={12} color="#878778" />
                <Text style={{ fontSize: 11, color: '#878778', marginLeft: 4, fontFamily: FontFamily.medium }}>
                  No suma al total
                </Text>
              </View>
            )}
          </View>
          
          <View className="flex-col items-end gap-1">
            <View className="flex-row items-center gap-1">
              <Ionicons name="arrow-up" size={14} color="#16a34a" />
              <Text className="text-[15px] font-['PlusJakarta-Medium'] text-[#16a34a]">${new Intl.NumberFormat('es-AR').format(pendingIncomes || 0)}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Ionicons name="arrow-down" size={14} color="#dc2626" />
              <Text className="text-[15px] font-['PlusJakarta-Medium'] text-[#dc2626]">${new Intl.NumberFormat('es-AR').format(pendingExpenses || 0)}</Text>
            </View>
          </View>
        </View>

        {/* Footer info (only if has pending tickets) */}
        {pendingCount > 0 && (
          <TouchableOpacity 
            activeOpacity={0.6}
            onPress={(e) => {
              e.stopPropagation();
              onPressPending?.();
            }}
            className="flex-col gap-2 pt-2 border-t border-[#eceae3]"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Ionicons name="time-outline" size={16} color="#878778" />
                <Text className="text-[15px] font-sans text-[#878778] tracking-[0.3px]">
                  {pendingCount} {pendingCount === 1 ? 'ticket pendiente' : 'tickets pendientes'}
                  {overdueCount > 0 && (
                    <Text className="text-[#c05050]"> ({overdueCount} {overdueCount === 1 ? 'atrasado' : 'atrasados'})</Text>
                  )}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#b7b7ae" />
            </View>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.card,
    backgroundColor: Colors.white,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  left: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: Spacing.sm,
  },
  right: {
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  avatarContainer: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  overdueIndicator: {
    position: 'absolute',
    top: -4,
    left: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.alertsError,
    borderWidth: 1.5,
    borderColor: Colors.white,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  overdueText: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: 8,
    textAlign: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  menuTrigger: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    ...Shadows.card,
    borderWidth: 1,
    borderColor: Colors.surfaceMuted,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 6,
    marginTop: Spacing.md,
    alignSelf: 'flex-start',
  },
  statusAlert: {
    backgroundColor: Colors.destructiveSoft,
  },
  statusWarning: {
    backgroundColor: Colors.alertsWarningSoft,
  },
  chatPreview: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceAlt,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  chatAvatarWrapper: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chatAvatar: {
    width: '100%',
    height: '100%',
  },
  chatText: {
    flex: 1,
    color: Colors.textSecondary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 51, 39, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  modalOptions: {
    padding: Spacing.xxl,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceMuted,
  },
});

