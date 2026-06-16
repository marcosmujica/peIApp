import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '@/constants/theme';
import { getContacts, PhoneContact } from '@/services/contacts.service';

interface ContactSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectContact: (name: string, phoneNumber?: string) => void;
}

export const ContactSelectorModal: React.FC<ContactSelectorProps> = ({ visible, onClose, onSelectContact }) => {
  const [contacts, setContacts] = useState<PhoneContact[]>([]);
  const [filtered, setFiltered] = useState<PhoneContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible) {
      loadContacts();
    }
  }, [visible]);

  useEffect(() => {
    const searchTrimmed = search.trim();
    if (searchTrimmed) {
      const searchLower = searchTrimmed.toLowerCase();
      const searchDigits = searchTrimmed.replace(/\D/g, '');
      
      setFiltered(
        contacts.filter(c => {
          const nameMatch = c.name?.toLowerCase().includes(searchLower);
          const phoneMatch = searchDigits.length > 0 && c.phoneNumbers?.some(p => p.replace(/\D/g, '').includes(searchDigits));
          return nameMatch || phoneMatch;
        })
      );
    } else {
      setFiltered(contacts);
    }
  }, [search, contacts]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const data = await getContacts();
      setContacts(data);
    } catch (e) {
      console.warn('Error loading contacts:', e);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const split = name.split(' ');
    if (split.length > 1) {
      return (split[0][0] + split[1][0]).toUpperCase();
    }
    return split[0][0].toUpperCase();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Contactos</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#171717" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#737373" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar contacto..."
              placeholderTextColor="#A3A3A3"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color="#A3A3A3" />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#171717" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              keyboardShouldPersistTaps="handled"
              data={filtered}
              keyExtractor={(item) => item.id || Math.random().toString()}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => {
                const phone = item.phoneNumbers && item.phoneNumbers.length > 0 
                  ? item.phoneNumbers[0] 
                  : '';
                
                return (
                  <TouchableOpacity
                    style={styles.contactItem}
                    onPress={() => {
                      onSelectContact(item.name || 'Sin nombre', phone);
                      onClose();
                    }}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{item.name}</Text>
                      {!!phone && <Text style={styles.contactPhone}>{phone}</Text>}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.emptyText}>No hay contactos.</Text>}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  title: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: '#171717',
  },
  closeBtn: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    margin: 16,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    fontFamily: FontFamily.regular,
    color: '#171717',
  },
  list: {
    paddingBottom: 40,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: '#737373',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontFamily: FontFamily.medium,
    color: '#171717',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: '#737373',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#A3A3A3',
    fontFamily: FontFamily.regular,
  },
});
