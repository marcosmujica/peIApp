import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAT_MESSAGES_KEY_PREFIX = 'peiapp_chat_messages_';

export interface ChatMessage {
  id: string;
  ticketId: string;
  sender: 'me' | 'other';
  text?: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'file';
  time: string;
  createdAt: string;
  senderName?: string;
  replyToChatId?: string;
  replyToMessage?: string;
  replyToSenderName?: string;
}

/** Obtiene los mensajes de un ticket específico */
export async function getTicketMessages(ticketId: string): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(`${CHAT_MESSAGES_KEY_PREFIX}${ticketId}`);
    if (!raw) return [];
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

/** Guarda la lista completa de mensajes para un ticket */
export async function saveTicketMessages(ticketId: string, messages: ChatMessage[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${CHAT_MESSAGES_KEY_PREFIX}${ticketId}`, JSON.stringify(messages));
  } catch {
    // falla silenciosa
  }
}

/** Agrega un mensaje a un ticket */
export async function addTicketMessage(ticketId: string, message: ChatMessage): Promise<void> {
  const all = await getTicketMessages(ticketId);
  // Evitar duplicados por ID
  if (all.some(m => m.id === message.id)) return;
  
  all.push(message);
  await saveTicketMessages(ticketId, all);
}
