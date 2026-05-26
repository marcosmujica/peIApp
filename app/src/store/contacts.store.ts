import { create } from 'zustand';
import { getContacts, PhoneContact } from '../services/contacts.service';

interface ContactsState {
  contacts: PhoneContact[];
  isLoading: boolean;
  loadContacts: () => Promise<void>;
  getContactName: (phoneNumber?: string, fallback?: string) => string;
  getContactAvatar: (phoneNumber?: string) => string | undefined;
}

const normalizePhone = (phone?: string) => {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
};

export const useContactsStore = create<ContactsState>((set, get) => ({
  contacts: [],
  isLoading: false,

  loadContacts: async () => {
    set({ isLoading: true });
    try {
      const contacts = await getContacts();
      set({ contacts, isLoading: false });
    } catch (e) {
      console.log('Error loading contacts:', e);
      set({ isLoading: false });
    }
  },

  getContactName: (phoneNumber?: string, fallback: string = 'Usuario') => {
    if (!phoneNumber) return fallback;
    const { contacts } = get();
    const normalizedTarget = normalizePhone(phoneNumber);
    
    if (!normalizedTarget) return fallback;

    for (const contact of contacts) {
      if (
        contact.phoneNumbers && 
        contact.phoneNumbers.some(p => p.includes(normalizedTarget) || normalizedTarget.includes(p))
      ) {
        return contact.name;
      }
    }

    return fallback;
  },

  getContactAvatar: (phoneNumber?: string) => {
    if (!phoneNumber) return undefined;
    const { contacts } = get();
    const normalizedTarget = normalizePhone(phoneNumber);
    
    if (!normalizedTarget) return undefined;

    for (const contact of contacts) {
      if (
        contact.phoneNumbers && 
        contact.phoneNumbers.some(p => p.includes(normalizedTarget) || normalizedTarget.includes(p))
      ) {
        return contact.imageUri;
      }
    }

    return undefined;
  }
}));

export const getContactNameStatic = (phoneNumber?: string, fallback: string = 'Usuario') => {
  return useContactsStore.getState().getContactName(phoneNumber, fallback);
};

export const getContactAvatarStatic = (phoneNumber?: string) => {
  return useContactsStore.getState().getContactAvatar(phoneNumber);
};
