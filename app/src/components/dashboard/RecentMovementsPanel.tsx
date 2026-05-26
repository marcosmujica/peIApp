import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TransactionItem } from '../ui';
import { Colors, FontFamily } from '@/constants/theme';
import { getRubroIcon, getRubroLabel } from '@/constants/rubros';
import { LocalTicket } from '@/storage/tickets.local';
import { getContactAvatarStatic } from '@/store/contacts.store';

interface RecentMovementsPanelProps {
  movements: LocalTicket[];
  userPhoneNumber?: string;
  onPressItem: (id: string) => void;
  onPressViewAll: () => void;
}

export const RecentMovementsPanel: React.FC<RecentMovementsPanelProps> = ({
  movements,
  userPhoneNumber,
  onPressItem,
  onPressViewAll
}) => {
  return (
    <View style={{ 
      backgroundColor: Colors.white, 
      borderRadius: 24, 
      padding: 16, 
      ...Platform.select({
        web: { boxShadow: '0px 2px 15px rgba(0, 0, 0, 0.05)' },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 15,
          elevation: 2,
        }
      }),
      borderWidth: 1, 
      borderColor: '#eceae3' 
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <TouchableOpacity 
          onPress={onPressViewAll}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 20, fontFamily: FontFamily.medium, color: '#1a1a1a' }}>Últimos movimientos</Text>
          <Ionicons name="chevron-forward" size={16} color="#1a1a1a" />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'column' }}>
        {movements.length > 0 ? (
          movements.map((item, index) => {
            const isOverdue = item.status === 'pending' && item.dueDate && new Date(item.dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
            
            const otherPartyPhone = userPhoneNumber === item.ownerId ? item.toUser : item.ownerId;
            const otherPartyAvatar = (userPhoneNumber === item.ownerId 
              ? item.toUserAvatarUrl 
              : item.ownerAvatarUrl) || getContactAvatarStatic(otherPartyPhone);
            
            return (
              <View key={item.id}>
                <TransactionItem
                  title={item.description || getRubroLabel(item.rubro || (item.type === 'income' ? item.rubroIncome : item.rubroExpense), item.type, (item as any).globalType)}
                  subtitle={new Date(item.dueDate && item.dueDate !== '' ? item.dueDate : item.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  amount={`$${item.amount.toLocaleString('es-AR')}`}
                  currency={item.currency || 'UYU'}
                  iconName={getRubroIcon(item.rubro || (item.type === 'income' ? item.rubroIncome : item.rubroExpense), item.type, (item as any).globalType) as any}
                  iconColor={item.type === 'income' ? Colors.alertsSuccess : Colors.alertsError}
                  onPress={() => onPressItem(item.id)}
                  status={item.status === 'completed' ? 'completed' : (isOverdue ? 'overdue' : 'pending')}
                  amountColor={item.type === 'income' ? Colors.textPrimary : Colors.alertsError}
                  avatarUrl={otherPartyAvatar}
                  style={{ height: 52 }}
                />
                {index < movements.length - 1 && (
                  <View style={{ height: 1, backgroundColor: '#e7e7e4', marginLeft: 44 }} />
                )}
              </View>
            );
          })
        ) : (
          <View style={{ py: 4, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontFamily: FontFamily.regular, color: '#b7b7ae' }}>No hay movimientos registrados</Text>
          </View>
        )}
      </View>
    </View>
  );
};
