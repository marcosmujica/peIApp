/**
 * wallets.local.ts
 * Servicio de almacenamiento local para billeteras.
 * Persiste la metadata (id, nombre, tipo, moneda) en AsyncStorage.
 * El balance siempre viene del servidor — aquí lo cacheamos como número
 * o null si no se pudo obtener.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const WALLETS_KEY = 'peiapp_local_wallets';

export interface WalletGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string; // ISO
  createdAt: string; // ISO
}

export interface DistributionList {
  id: string;
  name: string;
  contacts: Array<{
    name: string;
    phone: string;
  }>;
}

export interface LocalWallet {
  id: string;
  name: string;
  type: string;
  currency: string;
  avatarUrl?: string; // Nuevo
  defaultPaymentMethod?: string;
  helpToCollect?: boolean;
  /** Último balance conocido del servidor. null = sin dato. */
  balance: number | null;
  updatedAt: string; // ISO
  lastAccessedAt?: string; // ISO
  members?: Array<{
    userId: string;
    displayName: string;
    avatarUrl?: string;
    role?: string; // e.g. 'owner', 'member'
  }>;
  distributionLists?: DistributionList[]; // Nuevo
  goals?: WalletGoal[]; // Nuevo: Metas de corto/largo plazo

  // Chat integration (Last message from any ticket in this wallet)
  lastChatMessage?: string;
  lastChatSenderAvatar?: string;
  lastChatIsSeen?: boolean;
  lastChatSenderId?: string;
  lastChatTimestamp?: string;
  warningThreshold?: number;
  alertThreshold?: number;
  defaultTransactionType?: 'income' | 'expense';
  includeInGeneralBalance?: boolean;
  overdueCount?: number;
  totalIncomes?: number;
  totalExpenses?: number;
  pendingIncomes?: number;
  pendingExpenses?: number;
  enabledPanels?: string[];
  enabledCategories?: Array<{ categoryKey: string; type: 'income' | 'expense' }>;
  aiQuestions?: string[];
  aiHistory?: Array<{
    question: string;
    answer: string;
    timestamp: string;
  }>;
}

/** Lee todas las billeteras guardadas localmente. */
export async function getLocalWallets(): Promise<LocalWallet[]> {
  try {
    const raw = await AsyncStorage.getItem(WALLETS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalWallet[];
  } catch {
    return [];
  }
}

/** Guarda (reemplaza) la lista completa de billeteras en local. */
export async function saveLocalWallets(wallets: LocalWallet[]): Promise<void> {
  try {
    await AsyncStorage.setItem(WALLETS_KEY, JSON.stringify(wallets));
  } catch {
    // falla silenciosa — la app sigue funcionando
  }
}

/** Agrega o actualiza una sola billetera por id. */
export async function upsertLocalWallet(wallet: LocalWallet): Promise<void> {
  const all = await getLocalWallets();
  const idx = all.findIndex(w => w.id === wallet.id);
  if (idx >= 0) {
    all[idx] = wallet;
  } else {
    all.push(wallet);
  }
  await saveLocalWallets(all);
}

/** Actualiza solo el balance de una billetera por id. */
export async function updateLocalBalance(id: string, balance: number): Promise<void> {
  const all = await getLocalWallets();
  const idx = all.findIndex(w => w.id === id);
  if (idx >= 0) {
    all[idx].balance = balance;
    all[idx].updatedAt = new Date().toISOString();
    await saveLocalWallets(all);
  }
}

/**
 * Combina la lista local con los balances del servidor.
 * Si el servidor provee una billetera que no existe localmente la agrega.
 */
export async function mergeServerWallets(
  serverWallets: Array<any>
): Promise<LocalWallet[]> {
  const local = await getLocalWallets();
  const localMap = new Map(local.map(w => [w.id, w]));

  const merged: LocalWallet[] = serverWallets.map(sw => {
    const existing = localMap.get(sw.id);
    return {
      id: sw.id,
      name: sw.name,
      type: sw.type,
      currency: sw.currency,
      defaultPaymentMethod: sw.defaultPaymentMethod,
      helpToCollect: sw.helpToCollect,
      avatarUrl: (sw as any).avatarUrl || existing?.avatarUrl,
      balance: sw.balance,
      totalIncomes: sw.totalIncomes,
      totalExpenses: sw.totalExpenses,
      pendingIncomes: sw.pendingIncomes,
      pendingExpenses: sw.pendingExpenses,
      updatedAt: new Date().toISOString(),
      lastAccessedAt: existing?.lastAccessedAt,
      members: (sw as any).members || existing?.members,
      distributionLists: (sw as any).distributionLists || existing?.distributionLists,
      warningThreshold: (sw as any).warningThreshold || existing?.warningThreshold,
      alertThreshold: (sw as any).alertThreshold || existing?.alertThreshold,
      // Persist search/chat metadata if available
      lastChatMessage: existing?.lastChatMessage,
      lastChatSenderAvatar: existing?.lastChatSenderAvatar,
      lastChatIsSeen: existing?.lastChatIsSeen,
      lastChatSenderId: existing?.lastChatSenderId,
      lastChatTimestamp: existing?.lastChatTimestamp,
      defaultTransactionType: sw.defaultTransactionType || existing?.defaultTransactionType,
      includeInGeneralBalance: sw.includeInGeneralBalance ?? existing?.includeInGeneralBalance ?? true,
      enabledPanels: (sw as any).enabledPanels || existing?.enabledPanels,
      aiQuestions: (sw as any).aiQuestions || existing?.aiQuestions,
      aiHistory: (sw as any).aiHistory || existing?.aiHistory,
      goals: (sw as any).goals || existing?.goals,
      enabledCategories: (sw as any).categories?.map((c: any) => ({ categoryKey: c.categoryKey, type: c.type })) || existing?.enabledCategories,
    };
  });

  await saveLocalWallets(merged);
  return merged;
}

/** Marca una billetera como accedida recientemente. */
export async function markWalletAccessed(id: string): Promise<void> {
  const all = await getLocalWallets();
  const idx = all.findIndex(w => w.id === id);
  if (idx >= 0) {
    all[idx].lastAccessedAt = new Date().toISOString();
    await saveLocalWallets(all);
  }
}

/** Actualiza la info de chat de una billetera */
export async function updateLocalWalletChat(walletId: string, data: {
  lastChatMessage: string;
  lastChatSenderAvatar?: string;
  lastChatIsSeen: boolean;
  lastChatSenderId: string;
}): Promise<void> {
  const all = await getLocalWallets();
  const idx = all.findIndex(w => w.id === walletId);
  if (idx >= 0) {
    // Solo actualizar si es más reciente (o si no hay timestamp)
    // Para simplificar por ahora siempre actualizamos si llega uno nuevo
    all[idx] = {
      ...all[idx],
      ...data,
      lastChatTimestamp: new Date().toISOString()
    };
    await saveLocalWallets(all);
  }
}
