import AsyncStorage from '@react-native-async-storage/async-storage';

const TICKETS_KEY = 'peiapp_local_tickets';

export interface LocalTicket {
  id: string; // Puede ser un id temporal si es offline
  walletId: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  description: string;
  contactName?: string;
  toUser?: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'cancelled';
  paymentMethod?: string;
  paymentProcedure?: string;
  privateNote?: string;
  generatePeilink: boolean;
  helpToCollect: boolean;
  expenses?: number;
  expensesDetail?: string;
  reference?: string;
  initialAmount?: number;
  initialDueDate?: string;
  amountPaid?: number;
  source?: string;
  sourceInfo?: string;
  comment?: string;
  role?: string;
  ownerRating?: number;
  participantRating?: number;


  attachmentUrl?: string;
  ownerId: string; // ID del creador
  ownerAvatarUrl?: string; // Avatar del creador (from backend)
  ownerDisplayName?: string; // Nombre del creador
  toUserAvatarUrl?: string; // Avatar del asignado (from backend)
  toUserDisplayName?: string; // Nombre del asignado

  ownerUserObj?: {
    userId: string;
    phone: string;
    displayName?: string;
    avatarUrl?: string;
  };
  toUserObj?: {
    userId: string;
    phone: string;
    displayName?: string;
    avatarUrl?: string;
  };

  synced: boolean; // Para saber si ya se subió al server
  createdAt: string;
  rubroIncome?: string;
  rubroExpense?: string;
  rubro?: string; // Unified rubro filter
  globalType?: 'ticket' | 'transfer' | 'adjustment';

  // Chat integration
  lastChatMessage?: string;
  lastChatSenderAvatar?: string;
  lastChatIsSeen?: boolean;
  lastChatSenderId?: string;
  shortId?: string;
}

export async function getLocalTickets(): Promise<LocalTicket[]> {
  try {
    const raw = await AsyncStorage.getItem(TICKETS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalTicket[];
  } catch {
    return [];
  }
}

export async function saveLocalTickets(tickets: LocalTicket[]): Promise<void> {
  try {
    await AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
  } catch {
    // Falla silenciosa
  }
}

export async function addLocalTicket(ticket: LocalTicket): Promise<void> {
  const all = await getLocalTickets();
  const exists = all.some(t => t.id === ticket.id);
  if (!exists) {
    all.push(ticket);
    await saveLocalTickets(all);
  }
}

export async function updateLocalTicket(ticketId: string, data: Partial<LocalTicket>): Promise<void> {
  const all = await getLocalTickets();
  const idx = all.findIndex(x => x.id === ticketId);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...data };
    await saveLocalTickets(all);
  }
}

export async function mergeServerTickets(serverTickets: any[]): Promise<LocalTicket[]> {
  const local = await getLocalTickets();
  const localMap = new Map(local.map(t => [t.id, t]));

  // Track which server IDs we updated
  const serverIds = new Set(serverTickets.map(st => st.ticketId));

  // Merge server data
  for (const st of serverTickets) {
    const existing = localMap.get(st.ticketId);
    localMap.set(st.ticketId, {
      ...existing,
      id: st.ticketId,
      walletId: st.walletId,
      type: st.type,
      amount: Number(st.amount),
      currency: st.currency,
      description: st.description,
      contactName: st.contactName,
      toUser: st.toUser,
      dueDate: st.dueDate,
      status: st.status,
      paymentMethod: st.paymentMethod,
      paymentProcedure: st.paymentProcedure,
      privateNote: st.privateNote,
      generatePeilink: st.generatePeilink,
      helpToCollect: st.helpToCollect,
      expenses: Number(st.expenses || 0),
      expensesDetail: st.expensesDetail,
      reference: st.reference,
      initialAmount: st.initialAmount ? Number(st.initialAmount) : undefined,
      initialDueDate: st.initialDueDate,
      amountPaid: Number(st.amountPaid || 0),
      source: st.source,
      sourceInfo: st.sourceInfo,
      comment: st.comment,
      role: st.role,

      attachmentUrl: st.attachmentUrl,

      ownerId: st.ownerId,
      ownerAvatarUrl: st.owner?.avatarUrl,
      ownerDisplayName: st.owner?.displayName,
      toUserAvatarUrl: st.toUserObj?.avatarUrl,
      toUserDisplayName: st.toUserObj?.displayName,

      ownerUserObj: st.ownerUserObj,
      toUserObj: st.toUserObj,

      synced: true,
      createdAt: st.createdAt,
      rubroIncome: st.rubroIncome,
      rubroExpense: st.rubroExpense,
      rubro: st.rubro,
      toRubro: st.toRubro,
      globalType: st.globalType,
      shortId: st.shortId,
    });
  }

  // Final list: 
  // 1. All Server Tickets (updated in localMap)
  // 2. Any Local Ticket (synced: false) that was NOT in the server response (it shouldn't be anyway)
  // IMPORTANT: Remove any Local Ticket (synced: true) that is NOT in the server response anymore.
  const merged: LocalTicket[] = [];
  for (const t of localMap.values()) {
    if (!t.synced || serverIds.has(t.id)) {
      merged.push(t);
    }
  }

  await saveLocalTickets(merged);
  return merged;
}

export async function clearLocalTickets(): Promise<void> {
  await AsyncStorage.removeItem(TICKETS_KEY);
}

