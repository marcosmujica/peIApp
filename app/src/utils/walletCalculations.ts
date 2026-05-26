import { LocalTicket } from '@/storage/tickets.local';
import { LocalWallet } from '@/storage/wallets.local';
import { SYSTEM_WALLET_NAME } from '@/constants';

export interface WalletStats {
  balance: number;
  overdueCount: number;
  totalIncome: number;
  totalExpense: number;
  pendingIncome: number;
  pendingExpense: number;
  pendingCount: number;
}

export interface PendingGroup {
  incomes: number;
  expenses: number;
  count: number;
}

export interface PendingSummary {
  overdue: PendingGroup;
  today: PendingGroup;
  next7Days: PendingGroup;
  restOfMonth: PendingGroup;
}

/**
 * Calculates wallet statistics based on a list of tickets.
 * This is the source of truth for wallet balances in the app.
 * Logic:
 * - Balance = Sum(income.amountPaid) - Sum(expense.amountPaid)
 * - Cancelled tickets are ignored.
 * - Overdue count: pending tickets with dueDate in the past.
 */
export function calculateWalletStats(
  wallet: LocalWallet,
  allTickets: LocalTicket[]
): WalletStats {
  const isSystem = wallet.name.toLowerCase() === SYSTEM_WALLET_NAME.toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const walletTickets = allTickets.filter(t => 
    (t.walletId === wallet.id || (isSystem && !t.walletId)) && t.status !== 'cancelled'
  );

  let balance = 0;
  let totalIncome = 0;
  let totalExpense = 0;
  let pendingIncome = 0;
  let pendingExpense = 0;
  let pendingCount = 0;
  let overdueCount = 0;

  for (const t of walletTickets) {
    const amountPaid = Number(t.amountPaid) || 0;
    const amountTotal = Number(t.amount) || 0;
    const remaining = Math.max(0, amountTotal - amountPaid);

    const isIncome = t.type === 'income' || ((t as any).globalType === 'transfer' && t.description?.includes('Recibo Dinero'));

    if (isIncome) {
      balance += amountPaid;
      totalIncome += amountTotal;
      if (t.status === 'pending') {
        pendingIncome += remaining;
      }
    } else {
      balance -= amountPaid;
      totalExpense += amountTotal;
      if (t.status === 'pending') {
        pendingExpense += remaining;
      }
    }

    if (t.status === 'pending') {
      pendingCount++;
    }

    if (t.status === 'pending' && t.dueDate) {
      const due = new Date(t.dueDate);
      due.setHours(0, 0, 0, 0);
      if (due < today) {
        overdueCount++;
      }
    }
  }

  return {
    balance,
    overdueCount,
    totalIncome,
    totalExpense,
    pendingIncome,
    pendingExpense,
    pendingCount
  };
}

/**
 * Convenience function to process a list of wallets with their corresponding tickets.
 */
export function processWalletsWithTickets(
  wallets: LocalWallet[],
  tickets: LocalTicket[]
): LocalWallet[] {
  return wallets.map(w => {
    const stats = calculateWalletStats(w, tickets);
    return {
      ...w,
      balance: stats.balance,
      overdueCount: stats.overdueCount,
      // We can also attach other stats if needed, or just let screens call calculateWalletStats
      totalIncomes: stats.totalIncome,
      totalExpenses: stats.totalExpense,
      pendingIncomes: stats.pendingIncome,
      pendingExpenses: stats.pendingExpense,
      pendingCount: stats.pendingCount,
    } as LocalWallet;
  });
}

/**
 * Calculates a summary of pending tickets categorized by date and currency:
 * - Overdue: dueDate < today
 * - Today: dueDate == today
 * - Next 7 Days: today < dueDate <= today + 7 days
 */
export function calculatePendingSummary(tickets: LocalTicket[]): Record<string, PendingSummary> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextWeekEnd = new Date(today);
  nextWeekEnd.setDate(today.getDate() + 7);

  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);

  const summaries: Record<string, PendingSummary> = {};

  tickets.filter(t => t.status === 'pending').forEach(t => {
    if (!t.dueDate) return;

    const currency = t.currency || 'UYU';
    if (!summaries[currency]) {
      summaries[currency] = {
        overdue: { incomes: 0, expenses: 0, count: 0 },
        today: { incomes: 0, expenses: 0, count: 0 },
        next7Days: { incomes: 0, expenses: 0, count: 0 },
        restOfMonth: { incomes: 0, expenses: 0, count: 0 },
      };
    }
    
    const summary = summaries[currency];

    const dueDate = new Date(t.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const dueTime = dueDate.getTime();

    const amountPaid = Number(t.amountPaid) || 0;
    const amountTotal = Number(t.amount) || 0;
    const remaining = Math.max(0, amountTotal - amountPaid);
    const isIncome = t.type === 'income' || ((t as any).globalType === 'transfer' && t.description?.includes('Recibo Dinero'));

    let targetGroup: PendingGroup | null = null;

    if (dueTime < today.getTime()) {
      targetGroup = summary.overdue;
    } else if (dueTime === today.getTime()) {
      targetGroup = summary.today;
    } else if (dueTime <= nextWeekEnd.getTime()) {
      targetGroup = summary.next7Days;
    } else if (dueTime <= monthEnd.getTime()) {
      targetGroup = summary.restOfMonth;
    }

    if (targetGroup) {
      if (isIncome) targetGroup.incomes += remaining;
      else targetGroup.expenses += remaining;
      targetGroup.count++;
    }
  });

  return summaries;
}
