import React, { useState, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, StatusBar, Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Colors, FontFamily, Shadows, Spacing, BorderRadius } from '@/constants/theme';
import { getLocalTickets, LocalTicket, isTicketChatUnread } from '@/storage/tickets.local';
import { useAuthStore } from '@/store/auth.store';
import { getRubroLabel, getRubroIcon } from '@/constants/rubros';
import { useContactsStore } from '@/store/contacts.store';
import { getSmartAvatarUrl, getSmartDisplayName } from '@/utils/userDisplay';
import { Typography } from '@/components/ui/Typography';
import { TransactionItem } from '@/components/ui';
import { normalizeAvatarUrl } from '@/utils/url.util';

export const ContactDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { phoneNumber, name: initialName, avatarUrl } = route.params;
  const { user } = useAuthStore();

  const name = getSmartDisplayName(phoneNumber, initialName);

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<LocalTicket[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const allTickets = await getLocalTickets();
      const filtered = allTickets.filter((t: LocalTicket) => {
        const ownerMatch = t.ownerId === phoneNumber || t.ownerUserObj?.phone === phoneNumber;
        const toUserMatch = t.toUser === phoneNumber || t.toUserObj?.phone === phoneNumber;
        return ownerMatch || toUserMatch;
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setTickets(filtered);
    } catch (error) {
      console.error("Error loading contact tickets", error);
    } finally {
      setLoading(false);
    }
  }, [phoneNumber]);

  const calculateAverageRating = () => {
    if (tickets.length === 0) return null;
    let sum = 0;
    let count = 0;
    tickets.forEach(t => {
      const rating = t.ownerId === phoneNumber ? t.participantRating : t.ownerRating;
      if (rating && rating > 0) {
        sum += rating;
        count++;
      }
    });
    return count > 0 ? (sum / count).toFixed(1) : null;
  };

  const avgRating = calculateAverageRating();

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const renderTicketsList = () => {
    if (loading && tickets.length === 0) {
      return <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />;
    }

    if (tickets.length === 0) {
      return (
        <View style={styles.empty}>
          <Typography variant="bodyBase" color={Colors.textTertiary}>No hay tickets compartidos</Typography>
        </View>
      );
    }

    return (
      <View style={styles.ticketsCard}>
        {tickets.map((item, index) => {
          const isOverdue = item.status === 'pending' && item.dueDate && new Date(item.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
          const isLast = index === tickets.length - 1;

          const baseSubtitle = new Date(item.dueDate && item.dueDate !== '' ? item.dueDate : item.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
          const hasUnread = isTicketChatUnread(item, user?.id);
          const subtitle = hasUnread ? item.lastChatMessage : baseSubtitle;

          return (
            <View key={item.id}>
              <TransactionItem
                title={item.description || getRubroLabel(item.rubro || (item.type === 'income' ? item.rubroIncome : item.rubroExpense), item.type)}
                subtitle={subtitle}
                amount={`$${item.amount.toLocaleString('es-AR')}`}
                currency={item.currency || 'UYU'}
                iconName={getRubroIcon(item.rubro || (item.type === 'income' ? item.rubroIncome : item.rubroExpense), item.type) as any}
                iconColor={item.type === 'income' ? "#207e52" : "#c05050"}
                onPress={() => navigation.navigate('AddMovementModal', { ticketId: item.id })}
                status={isOverdue ? 'overdue' : (item.status === 'pending' ? undefined : item.status)}
                overdueDays={isOverdue ? Math.max(0, Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(item.dueDate).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))) : undefined}
                amountColor={item.type === 'income' ? '#363630' : '#c05050'}
                avatarUrl={item.globalType && item.globalType !== 'ticket' ? undefined : getSmartAvatarUrl(item.toUserObj?.phone, item.toUserObj?.avatarUrl)}
                rating={user?.id === item.ownerId ? item.participantRating : item.ownerRating}
                hasUnreadChat={hasUnread}
                style={{
                  height: 64,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              />
              {!isLast && <View style={styles.separator} />}
            </View>
          );
        })}
      </View>
    );
  };

  const finalAvatarUrl = getSmartAvatarUrl(phoneNumber, avatarUrl);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* TOP HEADER */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Typography variant="labelSmall" color={Colors.primary} uppercase spacing={2}>Perfil de Contacto</Typography>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {/* PROFILE CARD */}
        <View style={{ marginBottom: 24 }}>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              {finalAvatarUrl ? (
                <Image source={{ uri: normalizeAvatarUrl(finalAvatarUrl) }} style={styles.avatarLarge} />
              ) : (
                <View style={styles.avatarPlaceholderLarge}>
                  <Typography style={{ fontSize: 32, fontFamily: FontFamily.bold, color: Colors.white }}>
                    {name.charAt(0).toUpperCase()}
                  </Typography>
                </View>
              )}
            </View>
            <Typography variant="headingH2" textAlign="center">{name}</Typography>
            <View style={styles.phoneRatingRow}>
              <Typography variant="bodyBase" color={Colors.textSecondary}>{phoneNumber}</Typography>
              {avgRating && (
                <View style={styles.mainRatingBadge}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Typography variant="labelBase" style={{ color: '#92400E', marginLeft: 4 }}>{avgRating}</Typography>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* RECENT ACTIVITY TITLE */}
        <View style={{ marginBottom: 12 }}>
          <Typography variant="labelXSmall" color={Colors.textTertiary} uppercase spacing={2}>
            Actividad Reciente
          </Typography>
        </View>

        {renderTicketsList()}

        {loading && tickets.length > 0 && <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    marginBottom: 10
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 24, paddingBottom: 40 },
  profileCard: {
    backgroundColor: Colors.white,
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: 32,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: `0px 4px 16px rgba(20, 51, 39, 0.05)` },
      default: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 4,
      }
    }),
  },
  avatarContainer: { marginBottom: 16 },
  avatarLarge: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholderLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  phoneRatingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 },
  mainRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  ticketsCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: `0px 4px 12px rgba(0, 0, 0, 0.03)` },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
      }
    }),
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 64, // Align with text column (icon is 36 + margin 12 + padding 16 = 64)
  },
  empty: { alignItems: 'center', marginTop: 40 },
});
