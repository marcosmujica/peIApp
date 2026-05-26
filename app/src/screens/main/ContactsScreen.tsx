import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, StyleSheet, FlatList, TextInput, 
  TouchableOpacity, Image, ActivityIndicator, StatusBar 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, FontFamily, Shadows, Spacing, BorderRadius } from '@/constants/theme';
import { getLocalTickets, LocalTicket } from '@/storage/tickets.local';
import { useAuthStore } from '@/store/auth.store';
import { useContactsStore } from '@/store/contacts.store';
import { Typography } from '@/components/ui/Typography';
import { normalizeAvatarUrl } from '@/utils/url.util';

import { getSmartDisplayName, getSmartAvatarUrl } from '@/utils/userDisplay';

interface ContactItem {
  phoneNumber: string;
  name: string;
  avatarUrl?: string;
  lastInteraction?: string;
  averageRating?: number;
}

export const ContactsScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { getContactName, loadContacts } = useContactsStore();
  
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await loadContacts();
      const allTickets = await getLocalTickets();
      const contactsMap = new Map<string, ContactItem>();
      const ratingData = new Map<string, { sum: number, count: number }>();
      
      allTickets.forEach((t: LocalTicket) => {
        const processRating = (id: string, r?: number) => {
          if (r && r > 0) {
            const current = ratingData.get(id) || { sum: 0, count: 0 };
            ratingData.set(id, { sum: current.sum + r, count: current.count + 1 });
          }
        };

        if (t.ownerId && t.ownerId !== user?.id) {
          const phone = t.ownerUserObj?.phone || t.ownerId; // Fallback to id if phone missing somehow
          const serverName = t.ownerUserObj?.displayName;
          const avatarUrl = getSmartAvatarUrl(phone, t.ownerUserObj?.avatarUrl);

          if (!contactsMap.has(phone)) {
            contactsMap.set(phone, {
              phoneNumber: phone,
              name: getSmartDisplayName(phone, serverName),
              avatarUrl: avatarUrl,
              lastInteraction: t.createdAt
            });
          }
          processRating(phone, t.participantRating);
        }
        
        if (t.toUser && t.toUser !== user?.phoneNumber) { // toUser is still phone in DB? Wait, no. toUser is still phone for now in tickets!
          const phone = t.toUserObj?.phone || t.toUser;
          const serverName = t.toUserObj?.displayName;
          const avatarUrl = getSmartAvatarUrl(phone, t.toUserObj?.avatarUrl);

          if (!contactsMap.has(phone)) {
            contactsMap.set(phone, {
              phoneNumber: phone,
              name: getSmartDisplayName(phone, serverName),
              avatarUrl: avatarUrl,
              lastInteraction: t.createdAt
            });
          }
          processRating(phone, t.ownerRating);
        }
      });
      
      const uniqueContacts = Array.from(contactsMap.values()).map(c => {
        const r = ratingData.get(c.phoneNumber);
        return {
          ...c,
          averageRating: r ? Number((r.sum / r.count).toFixed(1)) : undefined
        };
      }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      setContacts(uniqueContacts);
    } catch (error) {
      console.error("Error loading contacts", error);
    } finally {
      setLoading(false);
    }
  }, [user?.phoneNumber, getContactName, loadContacts]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const filteredContacts = useMemo(() => {
    if (!searchText) return contacts;
    const lower = searchText.toLowerCase();
    return contacts.filter(c => 
      c.name.toLowerCase().includes(lower) || 
      c.phoneNumber.includes(lower)
    );
  }, [contacts, searchText]);

  const renderContact = ({ item }: { item: ContactItem }) => (
    <TouchableOpacity 
      style={styles.contactCard}
      onPress={() => navigation.navigate('ContactDetail', { 
        phoneNumber: item.phoneNumber, 
        name: item.name, 
        avatarUrl: item.avatarUrl 
      })}
    >
      <View style={styles.avatarWrapper}>
        {item.avatarUrl ? (
          <Image source={{ uri: normalizeAvatarUrl(item.avatarUrl) }} style={styles.avatarImg} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Typography variant="labelLarge" color={Colors.white}>
              {item.name.charAt(0).toUpperCase()}
            </Typography>
          </View>
        )}
      </View>
      <View style={styles.cardContent}>
        <Typography variant="bodyLargeStrong" color={Colors.textPrimary}>{item.name}</Typography>
        <View style={styles.subInfo}>
           <Typography variant="bodySmall" color={Colors.textTertiary}>{item.phoneNumber}</Typography>
           {item.averageRating && (
             <View style={styles.ratingBadge}>
               <Ionicons name="star" size={10} color="#F59E0B" />
               <Typography variant="labelXSmall" style={{ color: '#92400E', marginLeft: 2 }}>{item.averageRating}</Typography>
             </View>
           )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.surfaceAlt} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        {showSearch ? (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={Colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre o número..."
              placeholderTextColor="#737373"
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
            />
            <TouchableOpacity onPress={() => { setShowSearch(false); setSearchText(''); }}>
              <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={{ marginRight: 8, marginLeft: -8, padding: 8 }} 
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={28} color="#363630" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Typography variant="headingH2">Contactos</Typography>
              <Typography variant="labelSmall" color={Colors.textTertiary}>
                {filteredContacts.length} contactos
              </Typography>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSearch(true)}>
                <Ionicons name="search-outline" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.iconBtn, { backgroundColor: '#207e52' }]} 
                onPress={() => navigation.navigate('AddMovementModal')}
              >
                <Ionicons name="add" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.phoneNumber}
          renderItem={renderContact}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="people-outline" size={32} color={Colors.surfaceAlt} /></View>
              <Typography variant="bodyLargeStrong" textAlign="center">No hay contactos aún</Typography>
              <Typography variant="bodyBase" color={Colors.textSecondary} textAlign="center" style={{ marginTop: 8 }}>
                Aparecerán aquí cuando compartas billeteras o envíes tickets.
              </Typography>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBtn: { padding: 8, backgroundColor: Colors.white, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', ...Shadows.card },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F5F5F5', 
    borderRadius: 28, 
    paddingHorizontal: 16, 
    height: 56 
  },
  searchInput: { 
    flex: 1, 
    marginLeft: 12, 
    fontFamily: FontFamily.regular, 
    fontSize: 16, 
    color: Colors.textPrimary,
    // @ts-ignore
    outlineStyle: 'none'
  },
  listContent: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 40 },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: BorderRadius.card,
    marginBottom: 12,
    ...Shadows.card,
  },
  avatarWrapper: { marginRight: 16 },
  avatarImg: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: { 
    width: 52, 
    height: 52, 
    borderRadius: 26, 
    backgroundColor: Colors.primary, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  cardContent: { flex: 1 },
  subInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  ratingBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFBEB', 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 8, 
    marginLeft: 10 
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyIcon: { 
    width: 72, 
    height: 72, 
    borderRadius: 36, 
    backgroundColor: Colors.white, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 20,
    ...Shadows.card
  }
});
