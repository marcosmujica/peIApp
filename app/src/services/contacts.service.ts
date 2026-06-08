import * as Contacts from 'expo-contacts';
import { Platform } from 'react-native';

import { useAuthStore } from '@/store/auth.store';

export interface PhoneContact {
  id: string;
  name: string;
  imageUri?: string;
  initials: string;
  phoneNumbers?: string[];
}

export const normalizePhone = (phone?: string) => {
  if (!phone) return '';
  // Remove spaces, hyphens, and other symbols except + and digits
  let cleaned = phone.replace(/[^+0-9]/g, '');
  
  if (cleaned.startsWith('+')) return cleaned.replace(/\+/g, '');
  
  // If it doesn't start with +, add the user's country prefix
  const user = useAuthStore.getState().user;
  const userPhone = user?.phoneNumber;
  let prefix = '+598'; // Default fallback (Uruguay)
  
  if (userPhone && userPhone.startsWith('+')) {
    // Determine prefix by checking common Latin American prefix patterns
    // Priority prefixes (Latam)
    const prefixes = [
      '+598', '+54', '+55', '+56', '+57', '+58', '+51', '+52', '+595', '+591', '+593', 
      '+506', '+503', '+502', '+509', '+504', '+505', '+507', '+1'
    ];
    
    for (const p of prefixes) {
      if (userPhone.startsWith(p)) {
        prefix = p;
        break;
      }
    }
  }

  const prefixDigits = prefix.replace(/\+/g, '');
  
  // If the number already starts with the user's prefix, it is already normalized
  if (cleaned.startsWith(prefixDigits)) {
    return cleaned;
  }
  
  // Check if it starts with any other known Latin American prefix and has international length (>= 10 digits)
  const otherLatamPrefixes = [
    '598', '54', '55', '56', '57', '58', '51', '52', '595', '591', '593', 
    '506', '503', '502', '509', '504', '505', '507'
  ];
  for (const latamP of otherLatamPrefixes) {
    if (cleaned.startsWith(latamP) && cleaned.length >= 10) {
      return cleaned;
    }
  }
  
  // Remove leading local zero if present (common in Argentina and other countries)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  const final = prefixDigits + cleaned;
  return final;
};

const generateMockContacts = (count: number): PhoneContact[] => {
  const firstNames = ['Juan', 'María', 'Carlos', 'Ana', 'Pedro', 'Sofía', 'Diego', 'Lucía', 'Mateo', 'Valentina'];
  const lastNames = ['García', 'Rodríguez', 'López', 'Martínez', 'González', 'Pérez', 'Sánchez', 'Romero', 'Álvarez', 'Torres'];
  
  const mockContacts: PhoneContact[] = [
    {
      id: 'mock-marcos',
      name: 'DEMO_MARCOS',
      initials: 'DM',
      phoneNumbers: ['+59896725662'],
    },
    {
      id: 'mock-virginia',
      name: 'DEMO_1',
      initials: 'D1',
      phoneNumbers: ['+59811223344'],
    },
    {
      id: 'mock-marcelo',
      name: 'DEMO_2',
      initials: 'D2',
      phoneNumbers: ['+59822334455'],
    },
    {
      id: 'mock-valentina',
      name: 'DEMO_3',
      initials: 'D3',
      phoneNumbers: ['+59833445566'],
    },
    {
      id: 'mock-valentina',
      name: 'DEMO_4',
      initials: 'D4',
      phoneNumbers: ['+59844556677'],
    },
    {
      id: 'mock-valentina',
      name: 'DEMO_5',
      initials: 'D5',
      phoneNumbers: ['+59855667788'],
    },
    {
      id: 'mock-valentina',
      name: 'DEMO_6',
      initials: 'D6',
      phoneNumbers: ['+59866778899'],
    },
    {
      id: 'mock-valentina',
      name: 'DEMO_7',
      initials: 'D7',
      phoneNumbers: ['+59877889900'],
    },
    {
      id: 'mock-valentina',
      name: 'DEMO_8',
      initials: 'D8',
      phoneNumbers: ['+59888990011'],
    },
    {
      id: 'mock-no-normalizado',
      name: 'DEMO_NO_NORMALIZADO',
      initials: 'DN',
      phoneNumbers: ['096775523323'],
    }
  ];

  const randomContacts = Array.from({ length: count - 1 }, (_, i) => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${firstName} ${lastName}`;
    const initials = name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
      
    // Generar un número de teléfono mock aleatorio estilo internacional
    const mockPhone = `+54911${Math.floor(10000000 + Math.random() * 90000000)}`;

    return {
      id: `mock-${i}`,
      name,
      initials,
      phoneNumbers: [mockPhone],
    };
  });

  return [...mockContacts, ...randomContacts].sort((a, b) => a.name.localeCompare(b.name));
};

export const getContacts = async (): Promise<PhoneContact[]> => {
  if (Platform.OS === 'web') {
    return generateMockContacts(100);
  }

  const { status } = await Contacts.requestPermissionsAsync();
  if (status === 'granted') {
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.Image, Contacts.Fields.PhoneNumbers],
    });

    return data
      .filter((contact: Contacts.Contact) => contact.phoneNumbers && contact.phoneNumbers.length > 0)
      .map((contact: Contacts.Contact) => {
      const initials = (contact.name || '')
        .split(' ')
        .map((n: string) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '??';
        
      const phoneNumbers = contact.phoneNumbers 
        ? contact.phoneNumbers.map(p => normalizePhone(p.number)).filter(Boolean)
        : [];

      return {
        id: (contact as any).id || (contact as any).lookupKey || Math.random().toString(),
        name: contact.name || 'Sin nombre',
        imageUri: contact.image?.uri,
        initials,
        phoneNumbers,
      };
    })
    .filter(c => c.phoneNumbers && c.phoneNumbers.length > 0)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }
  
  return [];
};

export const getContactByPhoneNumber = async (phoneNumber: string): Promise<PhoneContact | null> => {
  const contacts = await getContacts();
  const normalizedTarget = normalizePhone(phoneNumber);
  
  if (!normalizedTarget) return null;

  for (const contact of contacts) {
    if (contact.phoneNumbers && contact.phoneNumbers.some(p => p.includes(normalizedTarget) || normalizedTarget.includes(p))) {
      return contact;
    }
  }

  return null;
};
