import React, { useMemo } from 'react';
import {
  View, StyleSheet, Dimensions, TouchableOpacity, ScrollView
} from 'react-native';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/components/ui/Typography';
import { Colors, FontFamily, Shadows, BorderRadius } from '@/constants/theme';
import { LocalTicket } from '@/storage/tickets.local';
import { LocalWallet } from '@/storage/wallets.local';

const { width } = Dimensions.get('window');
const PANEL_WIDTH = (width - 48) / 1; // Full width or 2 columns? User said "serie de paneles-card". Let's use full width for better readability or 2 per row if small.

interface PanelProps {
  tickets: LocalTicket[];
  currency: string;
}

/**
 * Panel 1: Resumen del mes
 */
export const MonthSummaryPanel: React.FC<PanelProps> = ({ tickets, currency }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthTickets = tickets.filter(t => {
      const d = new Date(t.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.status !== 'cancelled';
    });

    const income = monthTickets.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum, 0);
    const expense = monthTickets.reduce((sum, t) => t.type === 'expense' ? sum + t.amount : sum, 0);

    return { income, expense, balance: income - expense };
  }, [tickets]);

  return (
    <View style={styles.panelClassicCard}>
      <View style={styles.panelHeader}>
        <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
          <Ionicons name="calendar-outline" size={20} color="#16A34A" />
        </View>
        <Typography variant="bodyLargeStrong" style={{ flex: 1 }}>Resumen del mes</Typography>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Typography variant="labelXSmall" color={Colors.textTertiary} uppercase>Cobrado Total</Typography>
          <Typography variant="bodyLargeStrong" color="#16A34A">$ {stats.income.toLocaleString('es-AR')}</Typography>
        </View>
        <View style={styles.statItem}>
          <Typography variant="labelXSmall" color={Colors.textTertiary} uppercase>Pagado Total</Typography>
          <Typography variant="bodyLargeStrong" color="#DC2626">$ {stats.expense.toLocaleString('es-AR')}</Typography>
        </View>
      </View>

      <View style={styles.netInfo}>
        <Typography variant="labelSmall" color={Colors.textSecondary}>GANANCIA: </Typography>
        <Typography variant="labelSmall" style={{ color: stats.balance >= 0 ? '#16A34A' : '#DC2626', fontFamily: FontFamily.bold }}>
          $ {Math.abs(stats.balance).toLocaleString('es-AR')}
        </Typography>
      </View>
    </View>
  );
};

/**
 * Panel 2: Ventas por día ($)
 */
export const SalesByAmountPanel: React.FC<PanelProps> = ({ tickets }) => {
  const dayData = useMemo(() => {
    const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    const values = [0, 0, 0, 0, 0, 0, 0];
    
    // Filter last 30 days or just all if specific to wallet
    tickets.filter(t => t.type === 'income' && t.status !== 'cancelled').forEach(t => {
      const d = new Date(t.createdAt).getDay();
      values[d] += t.amount;
    });

    const max = Math.max(...values, 1);
    return values.map((v, i) => ({ label: days[i], value: v, height: (v / max) * 60 }));
  }, [tickets]);

  return (
    <View style={styles.panelIntegrated}>
      <View style={styles.panelHeader}>
        <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
          <Ionicons name="stats-chart-outline" size={20} color="#2563EB" />
        </View>
        <Typography variant="bodyLargeStrong" style={{ flex: 1 }}>Ventas por día ($)</Typography>
      </View>

      <View style={styles.chartContainer}>
        {dayData.map((d, i) => (
          <View key={i} style={styles.chartBarCol}>
            <Typography variant="labelXSmall" style={{ marginBottom: 2, fontSize: 8 }}>
              {d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value}
            </Typography>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { height: d.height, backgroundColor: '#2563EB' }]} />
            </View>
            <Typography variant="labelXSmall" color={Colors.textTertiary} style={{ marginTop: 4 }}>{d.label}</Typography>
          </View>
        ))}
      </View>
    </View>
  );
};

/**
 * Panel 3: Ventas por día (Cantidad)
 */
export const SalesByCountPanel: React.FC<PanelProps> = ({ tickets }) => {
  const dayData = useMemo(() => {
    const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    const values = [0, 0, 0, 0, 0, 0, 0];
    
    tickets.filter(t => t.type === 'income' && t.status !== 'cancelled').forEach(t => {
      const d = new Date(t.createdAt).getDay();
      values[d] += 1;
    });

    const max = Math.max(...values, 1);
    return values.map((v, i) => ({ label: days[i], value: v, height: (v / max) * 60 }));
  }, [tickets]);

  return (
    <View style={styles.panelIntegrated}>
      <View style={styles.panelHeader}>
        <View style={[styles.iconBox, { backgroundColor: '#FDF2F8' }]}>
          <Ionicons name="people-outline" size={20} color="#DB2777" />
        </View>
        <Typography variant="bodyLargeStrong" style={{ flex: 1 }}>Ventas por día (Cantidad)</Typography>
      </View>

      <View style={styles.chartContainer}>
        {dayData.map((d, i) => (
          <View key={i} style={styles.chartBarCol}>
            <Typography variant="labelXSmall" style={{ marginBottom: 2, fontSize: 8 }}>
              {d.value}
            </Typography>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { height: d.height, backgroundColor: '#DB2777' }]} />
            </View>
            <Typography variant="labelXSmall" color={Colors.textTertiary} style={{ marginTop: 4 }}>{d.label}</Typography>
          </View>
        ))}
      </View>
    </View>
  );
};
import { getRubroLabel, getRubroIcon } from '@/constants/rubros';

/**
 * Panel 4: Qué pago este mes (Categorías)
 */
export const ExpensesByCategoryPanel: React.FC<PanelProps> = ({ tickets }) => {
  const categoryData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthExpenses = tickets.filter(t => {
      const d = new Date(t.createdAt);
      return t.type === 'expense' && t.status !== 'cancelled' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const categories: Record<string, number> = {};
    let total = 0;

    monthExpenses.forEach(t => {
      const rubro = t.rubro || t.rubroExpense || 'otros';
      categories[rubro] = (categories[rubro] || 0) + t.amount;
      total += t.amount;
    });

    const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1'];
    
    // Sort by amount descending
    const sorted = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .map(([id, amount], index) => ({
        id,
        label: getRubroLabel(id, 'expense'),
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        color: COLORS[index % COLORS.length]
      }));

    return { sorted, total };
  }, [tickets]);

  return (
    <View style={styles.panelIntegrated}>
      <View style={styles.panelHeader}>
        <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
          <Ionicons name="pie-chart-outline" size={20} color="#16A34A" />
        </View>
        <Typography variant="bodyLargeStrong" style={{ flex: 1 }}>Gastos del mes</Typography>
      </View>

      {categoryData.sorted.length > 0 ? (
        <View>
          {/* True SVG Pie Chart */}
          <View style={{ alignItems: 'center', marginVertical: 16 }}>
            <Svg width="160" height="160" viewBox="-80 -80 160 160">
              {(() => {
                let cumulativePercent = 0;
                return categoryData.sorted.map((item) => {
                  const slicePercent = item.percentage / 100;
                  
                  if (slicePercent <= 0) return null;
                  
                  if (slicePercent >= 0.999) {
                    return <Circle key={item.id} r="80" fill={item.color} />;
                  }

                  const startAngle = (cumulativePercent - 0.25) * 2 * Math.PI;
                  const endAngle = (cumulativePercent + slicePercent - 0.25) * 2 * Math.PI;

                  const startX = Math.cos(startAngle) * 80;
                  const startY = Math.sin(startAngle) * 80;

                  const endX = Math.cos(endAngle) * 80;
                  const endY = Math.sin(endAngle) * 80;

                  const largeArcFlag = slicePercent > 0.5 ? 1 : 0;
                  
                  cumulativePercent += slicePercent;
                  
                  const pathData = [
                    `M 0 0`,
                    `L ${startX.toFixed(2)} ${startY.toFixed(2)}`,
                    `A 80 80 0 ${largeArcFlag} 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`,
                    `Z`,
                  ].join(' ');

                  return <Path key={item.id} d={pathData} fill={item.color} />;
                });
              })()}
            </Svg>
          </View>

          <View style={{ marginTop: 16, gap: 8 }}>
            {categoryData.sorted.map(item => (
              <View key={item.id} style={styles.categoryDetailRow}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: item.color + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={getRubroIcon(item.id, 'expense') as any} size={14} color={item.color} />
                </View>
                <Typography variant="bodySmall" style={{ flex: 1 }}>
                  {item.label}
                </Typography>
                <Typography variant="bodySmallStrong">$ {item.amount.toLocaleString('es-AR')}</Typography>
                <Typography variant="labelXSmall" color="secondary" style={{ width: 45, textAlign: 'right' }}>
                  {Math.round(item.percentage)}%
                </Typography>
              </View>
            ))}
            <View style={styles.categoryTotalRow}>
              <Typography variant="bodySmallStrong" style={{ flex: 1 }}>Total del mes</Typography>
              <Typography variant="bodyLargeStrong" color="primary">$ {categoryData.total.toLocaleString('es-AR')}</Typography>
            </View>
          </View>
        </View>
      ) : (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <Typography variant="captionBase" color="secondary">No hay gastos registrados este mes</Typography>
        </View>
      )}
    </View>
  );
};


// ─── GOALS PANEL ─────────────────────────────────────────────────────────────

const getRemainingTime = (deadline: string): string => {
  const now = new Date();
  const target = new Date(deadline);
  
  // Normalizar a medianoche para evitar problemas de horas
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  
  if (target.getTime() < now.getTime()) return 'Meta vencida';
  if (target.getTime() === now.getTime()) return 'Vence hoy';

  let months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  let days = target.getDate() - now.getDate();

  if (days < 0) {
    months -= 1;
    // Obtener días del mes anterior al target para ajustar
    const lastMonth = new Date(target.getFullYear(), target.getMonth(), 0);
    days += lastMonth.getDate();
  }

  const parts = [];
  if (months > 0) parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? 'día' : 'días'}`);

  return `Faltan ${parts.join(' y ')}`;
};

export const GoalsPanel: React.FC<{ wallet: LocalWallet, tickets: LocalTicket[], onManageGoals: () => void }> = ({ wallet, tickets, onManageGoals }) => {
  const goals = wallet.goals || [];

  const computedCurrentAmount = useMemo(() => {
    return tickets.reduce((acc, t) => {
      if (t.status === 'cancelled') return acc;
      const tTime = new Date(t.dueDate || t.createdAt).setHours(0,0,0,0);
      const todayTime = new Date().setHours(0,0,0,0);
      if (tTime <= todayTime) {
        const amt = Number(t.amountPaid) || 0;
        return t.type === 'income' ? acc + amt : acc - amt;
      }
      return acc;
    }, 0);
  }, [tickets]);

  return (
    <View style={styles.panelClassicCard}>
      <View style={styles.panelHeader}>
        <View style={[styles.iconBox, { backgroundColor: '#F3F4F6' }]}>
          <Ionicons name="flag-outline" size={20} color="#737373" />
        </View>
        <Typography variant="bodyLargeStrong" style={{ flex: 1 }}>Mis Metas</Typography>
        <TouchableOpacity onPress={onManageGoals} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Typography variant="labelSmall" color={Colors.textSecondary}>Administrar</Typography>
          <Ionicons name="chevron-forward" size={14} color={Colors.textSecondary} style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      </View>

      {goals.length === 0 ? (
        <TouchableOpacity 
          onPress={onManageGoals}
          style={{ alignItems: 'center', paddingVertical: 12 }}
        >
          <View style={{ 
            width: 32, 
            height: 32, 
            borderRadius: 16, 
            borderWidth: 1.5, 
            borderColor: '#a8a69e', 
            alignItems: 'center', 
            justifyContent: 'center', 
            marginBottom: 8 
          }}>
            <Ionicons name="add" size={18} color="#a8a69e" />
          </View>
          <Typography variant="bodySmall" style={{ color: '#1a1a1a', fontFamily: FontFamily.medium }}>
            Personalizá tus metas
          </Typography>
        </TouchableOpacity>
      ) : (
        <View style={{ gap: 16 }}>
          {goals.map(goal => {
            const progress = Math.min(100, Math.max(0, (computedCurrentAmount / goal.targetAmount) * 100));
            const remaining = Math.max(0, goal.targetAmount - computedCurrentAmount);
            return (
              <View key={goal.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Typography variant="bodySmallStrong">{goal.name}</Typography>
                  <Typography variant="bodySmallStrong" color="primary">{progress.toFixed(0)}%</Typography>
                </View>
                <View style={{ height: 10, backgroundColor: '#f2f2f0', borderRadius: 100, overflow: 'hidden', marginBottom: 6 }}>
                  <View style={{ height: '100%', width: `${progress}%`, backgroundColor: '#143327', borderRadius: 100 }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Typography variant="labelXSmall" color="secondary">Voy: ${Math.round(computedCurrentAmount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}</Typography>
                    {goal.deadline && (
                      <Typography variant="labelXSmall" style={{ color: new Date(goal.deadline).setHours(0,0,0,0) < new Date().setHours(0,0,0,0) ? '#EF4444' : '#1a1a1a', fontFamily: FontFamily.semibold, marginTop: 2 }}>
                        {getRemainingTime(goal.deadline)}
                      </Typography>
                    )}
                  </View>
                  <Typography variant="labelXSmall" color="secondary">Falta: ${Math.round(remaining).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}</Typography>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

/**
 * Panel 5: Semanas más activas (Últimos 3 meses)
 */
export const ActiveWeeksPanel: React.FC<PanelProps> = ({ tickets }) => {
  const weekData = useMemo(() => {
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    const values = [0, 0, 0, 0, 0];
    const labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5'];
    tickets
      .filter(t => t.type === 'income' && t.status !== 'cancelled')
      .filter(t => new Date(t.createdAt) >= threeMonthsAgo)
      .forEach(t => {
        const date = new Date(t.createdAt);
        const day = date.getDate();
        const weekIdx = Math.min(Math.floor((day - 1) / 7), 4);
        values[weekIdx] += t.amount;
      });
    const max = Math.max(...values, 1);
    const bestWeekIdx = values.indexOf(Math.max(...values));
    return {
      bars: values.map((v, i) => ({
        label: labels[i],
        value: v,
        height: (v / max) * 60,
        isBest: i === bestWeekIdx && v > 0
      })),
      bestWeek: bestWeekIdx + 1,
      hasData: values.some(v => v > 0)
    };
  }, [tickets]);

  return (
    <View style={styles.panelClassicCard}>
      <View style={styles.panelHeader}>
        <View style={[styles.iconBox, { backgroundColor: '#F5F3FF' }]}>
          <Ionicons name="trending-up-outline" size={20} color="#7C3AED" />
        </View>
        <View style={{ flex: 1 }}>
          <Typography variant="bodyLargeStrong">Semanas más activas</Typography>
          <Typography variant="captionBase" color="tertiary">Promedio últimos 3 meses</Typography>
        </View>
      </View>
      {weekData.hasData ? (
        <View>
          <View style={[styles.chartContainer, { height: 100, marginBottom: 16 }]}>
            {weekData.bars.map((d, i) => (
              <View key={i} style={styles.chartBarCol}>
                <Typography variant="labelXSmall" style={{ marginBottom: 4, fontSize: 8, color: d.isBest ? '#7C3AED' : Colors.textTertiary }}>
                  {d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : Math.round(d.value)}
                </Typography>
                <View style={[styles.barTrack, { width: 24, borderRadius: 4 }]}>
                  <View style={[styles.barFill, { height: d.height, backgroundColor: d.isBest ? '#7C3AED' : '#C4B5FD', borderRadius: 4 }]} />
                </View>
                <Typography variant="labelXSmall" color={d.isBest ? 'primary' : 'tertiary'} style={{ marginTop: 6, fontFamily: d.isBest ? FontFamily.bold : FontFamily.regular }}>{d.label}</Typography>
              </View>
            ))}
          </View>
          <View style={styles.insightBox}>
            <Ionicons name="bulb-outline" size={16} color="#7C3AED" />
            <Typography variant="labelSmall" style={{ color: '#4C1D95', flex: 1, marginLeft: 8 }}>
              Tu mejor volumen de ventas suele ocurrir en la <Typography variant="labelSmall" style={{ fontFamily: FontFamily.bold }}>Semana {weekData.bestWeek}</Typography> de cada mes.
            </Typography>
          </View>
        </View>
      ) : (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <Typography variant="captionBase" color="secondary">No hay suficientes datos de ventas</Typography>
        </View>
      )}
    </View>
  );
};

/**
 * Panel 6: Comparativa de Ganancias (Línea - Últimos 3 meses)
 */
export const GainsComparisonPanel: React.FC<PanelProps> = ({ tickets }) => {
  const chartData = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const data = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth();
      const y = d.getFullYear();
      const monthTickets = tickets.filter(t => {
        const td = new Date(t.createdAt);
        return td.getMonth() === m && td.getFullYear() === y && t.status !== 'cancelled';
      });
      const income = monthTickets.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum, 0);
      const expense = monthTickets.reduce((sum, t) => t.type === 'expense' ? sum + t.amount : sum, 0);
      data.push({ label: months[m], gain: income - expense });
    }
    const values = data.map(d => d.gain);
    const minVal = Math.min(...values, 0);
    const maxVal = Math.max(...values, 1000);
    const range = Math.max(maxVal - minVal, 1);
    const points = data.map((d, i) => {
      const x = (i * 110) + 30;
      const y = 80 - ((d.gain - minVal) / range * 60);
      return { x, y, ...d };
    });
    return { points };
  }, [tickets]);

  const pathData = `M ${chartData.points.map(p => `${p.x},${p.y}`).join(' L ')}`;

  return (
    <View style={styles.panelClassicCard}>
      <View style={styles.panelHeader}>
        <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
          <Ionicons name="analytics-outline" size={20} color="#059669" />
        </View>
        <Typography variant="bodyLargeStrong">Tendencia de Ganancias</Typography>
      </View>
      <View style={{ height: 120, justifyContent: 'center', alignItems: 'center' }}>
        <Svg width="280" height="110" viewBox="0 0 280 110">
          <Path d="M 0 90 L 280 90" stroke="#F3F4F6" strokeWidth="1" />
          <Path d={pathData} fill="none" stroke="#059669" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          {chartData.points.map((p, i) => (
            <React.Fragment key={i}>
              <Circle cx={p.x} cy={p.y} r="5" fill="#059669" stroke="white" strokeWidth="2" />
              <SvgText x={p.x} y={p.y - 12} fontSize="10" fontWeight="bold" fill={p.gain >= 0 ? '#059669' : '#DC2626'} textAnchor="middle">
                ${Math.abs(p.gain) >= 1000 ? `${(Math.abs(p.gain)/1000).toFixed(1)}k` : Math.round(Math.abs(p.gain))}
              </SvgText>
              <SvgText x={p.x} y={105} fontSize="10" fill="#9CA3AF" textAnchor="middle">{p.label}</SvgText>
            </React.Fragment>
          ))}
        </Svg>
      </View>
      <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 }}>
         <Typography variant="labelSmall" color="secondary">
           {chartData.points[2].gain >= chartData.points[1].gain ? '📈 Tu ganancia subió respecto al mes anterior.' : '📉 Tu ganancia bajó respecto al mes anterior.'}
         </Typography>
      </View>
    </View>
  );
};

/**
 * Panel 7: Próximos Pagos (7 días)
 */
export const UpcomingPaymentsPanel: React.FC<PanelProps & { onTicketPress?: (t: LocalTicket) => void }> = ({ tickets, onTicketPress }) => {
  const upcoming = useMemo(() => {
    const now = new Date();
    const next7Days = new Date();
    next7Days.setDate(now.getDate() + 7);
    now.setHours(0, 0, 0, 0);
    next7Days.setHours(23, 59, 59, 999);

    return tickets
      .filter(t => {
        if (t.type !== 'expense' || (t.status !== 'pending' && t.status !== 'partial')) return false;
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        return d >= now && d <= next7Days;
      })
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  }, [tickets]);

  return (
    <View style={styles.panelClassicCard}>
      <View style={styles.panelHeader}>
        <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
          <Ionicons name="notifications-outline" size={20} color="#DC2626" />
        </View>
        <Typography variant="bodyLargeStrong" style={{ flex: 1 }}>Próximos Vencimientos</Typography>
        {upcoming.length > 0 && (
          <View style={{ backgroundColor: '#DC2626', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
            <Typography variant="labelXSmall" style={{ color: 'white', fontWeight: 'bold' }}>{upcoming.length}</Typography>
          </View>
        )}
      </View>

      {upcoming.length > 0 ? (
        <View style={{ gap: 10 }}>
          {upcoming.slice(0, 4).map(t => {
            const dueDate = new Date(t.dueDate!);
            const isToday = dueDate.toDateString() === new Date().toDateString();
            const remaining = t.amount - (Number(t.amountPaid) || 0);

            return (
              <TouchableOpacity 
                key={t.id} 
                style={styles.upcomingRow}
                onPress={() => onTicketPress?.(t)}
              >
                <View style={{ flex: 1 }}>
                  <Typography variant="bodySmallStrong" numberOfLines={1}>{t.concept || 'Gasto sin nombre'}</Typography>
                  <Typography variant="labelXSmall" style={{ color: isToday ? '#DC2626' : '#9CA3AF' }}>
                    {isToday ? 'Vence hoy' : `Vence el ${dueDate.getDate()}/${dueDate.getMonth() + 1}`}
                  </Typography>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Typography variant="bodySmallStrong" color="error">$ {remaining.toLocaleString('es-AR')}</Typography>
                  <Ionicons name="chevron-forward" size={12} color="#D1D5DB" />
                </View>
              </TouchableOpacity>
            );
          })}
          {upcoming.length > 4 && (
            <Typography variant="labelXSmall" color="secondary" style={{ textAlign: 'center', marginTop: 4 }}>
              + {upcoming.length - 4} vencimientos más
            </Typography>
          )}
        </View>
      ) : (
        <View style={{ paddingVertical: 12, alignItems: 'center' }}>
          <Typography variant="captionBase" color="tertiary">No hay pagos para los próximos 7 días</Typography>
        </View>
      )}
    </View>
  );
};

/**
 * Panel 8: Flujo de Caja Semanal (Cronológico - 10 semanas)
 */
export const WeeklyCashFlowPanel: React.FC<PanelProps> = ({ tickets }) => {
  const { flowData, advice } = useMemo(() => {
    const data = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Obtener las últimas 10 semanas
    for (let i = 9; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - (i * 7) - now.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const weekTickets = tickets.filter(t => {
        const td = new Date(t.createdAt);
        return td >= start && td <= end && t.status !== 'cancelled';
      });

      const income = weekTickets.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum, 0);
      const expense = weekTickets.reduce((sum, t) => t.type === 'expense' ? sum + t.amount : sum, 0);

      data.push({
        label: `${start.getDate()}/${start.getMonth() + 1}`,
        income,
        expense
      });
    }

    const maxAmt = Math.max(...data.flatMap(d => [d.income, d.expense]), 1000);
    const mapped = data.map(d => ({
      ...d,
      incomeHeight: (d.income / maxAmt) * 50,
      expenseHeight: (d.expense / maxAmt) * 50
    }));

    // --- Análisis para generar consejo ---
    const totalIncome = data.reduce((s, d) => s + d.income, 0);
    const totalExpense = data.reduce((s, d) => s + d.expense, 0);
    const weeksWithData = data.filter(d => d.income > 0 || d.expense > 0).length;
    const deficitWeeks = data.filter(d => d.expense > d.income && (d.income > 0 || d.expense > 0)).length;
    const surplusWeeks = data.filter(d => d.income > d.expense && d.income > 0).length;
    const zeroIncomeWeeks = data.filter(d => d.income === 0 && d.expense > 0).length;

    // Tendencia reciente (últimas 3 vs anteriores 3)
    const recent3 = data.slice(-3);
    const prev3 = data.slice(-6, -3);
    const recentNet = recent3.reduce((s, d) => s + (d.income - d.expense), 0);
    const prevNet = prev3.reduce((s, d) => s + (d.income - d.expense), 0);

    let adviceText = '';
    let adviceNegative = false;

    if (weeksWithData === 0) {
      adviceText = 'Empezá a registrar tus cobros y pagos para recibir consejos personalizados sobre tu flujo de caja.';
    } else if (deficitWeeks >= 6) {
      adviceText = 'La mayoría de tus semanas tienen más gastos que ingresos. Revisá si podés reducir gastos fijos o buscar nuevas fuentes de ingreso para equilibrar tu flujo.';
      adviceNegative = true;
    } else if (zeroIncomeWeeks >= 3) {
      adviceText = 'Hay varias semanas sin ingresos registrados. Intentá mantener un flujo de cobros más constante para evitar depender de semanas puntuales.';
      adviceNegative = true;
    } else if (totalExpense > totalIncome && totalIncome > 0) {
      const deficit = totalExpense - totalIncome;
      adviceText = `En las últimas 10 semanas gastaste $${deficit.toLocaleString('es-AR')} más de lo que ingresaste. Tratá de priorizar los gastos esenciales y postergar los que puedas.`;
      adviceNegative = true;
    } else if (recentNet < prevNet && prevNet > 0) {
      adviceText = 'Tu balance neto bajó en las últimas semanas. Prestá atención a los gastos recientes para que no se convierta en una tendencia.';
      adviceNegative = true;
    } else if (surplusWeeks >= 7) {
      adviceText = 'Excelente: la mayoría de tus semanas cierran con superávit. Considerá destinar parte de ese excedente a un fondo de reserva o inversión.';
    } else if (totalIncome > totalExpense) {
      adviceText = 'Tu flujo general es positivo. Mantené este ritmo y tratá de ser consistente en los cobros para evitar semanas sin ingresos.';
    } else {
      adviceText = 'Tu flujo está equilibrado. Seguí monitoreando semana a semana para detectar cualquier cambio a tiempo.';
    }

    return { flowData: mapped, advice: { text: adviceText, negative: adviceNegative } };
  }, [tickets]);

  return (
    <View style={styles.panelClassicCard}>
      <View style={styles.panelHeader}>
        <View style={[styles.iconBox, { backgroundColor: '#F0F9FF' }]}>
          <Ionicons name="swap-vertical-outline" size={20} color="#0369A1" />
        </View>
        <Typography variant="bodyLargeStrong">Flujo Semanal</Typography>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', gap: 16, paddingLeft: 4 }}>
          {flowData.map((d, i) => (
            <View key={i} style={{ alignItems: 'center', width: 45 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 60, marginBottom: 8 }}>
                <View style={[styles.barFill, { width: 8, height: d.incomeHeight, backgroundColor: '#10B981', borderRadius: 2 }]} />
                <View style={[styles.barFill, { width: 8, height: d.expenseHeight, backgroundColor: '#EF4444', borderRadius: 2 }]} />
              </View>
              <Typography variant="labelXSmall" color="tertiary" style={{ fontSize: 9 }}>{d.label}</Typography>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#10B981' }} />
          <Typography variant="labelXSmall" color="secondary">Cobros</Typography>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#EF4444' }} />
          <Typography variant="labelXSmall" color="secondary">Pagos</Typography>
        </View>
      </View>

      {/* Consejo financiero */}
      <View style={{ 
        backgroundColor: '#F9FAFB', 
        padding: 14, 
        borderRadius: 12, 
        marginTop: 14 
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <Ionicons name="bulb-outline" size={14} color={advice.negative ? '#DC2626' : '#9CA3AF'} style={{ marginTop: 2 }} />
          <Typography variant="labelSmall" style={{ color: advice.negative ? '#DC2626' : '#6B7280', lineHeight: 20, flex: 1 }}>
            {advice.text}
          </Typography>
        </View>
      </View>
    </View>
  );
};

/**
 * Panel 9: Horarios más activos (Últimos 30 días)
 */
export const ActiveHoursPanel: React.FC<PanelProps> = ({ tickets }) => {
  const hourData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const hours = Array(24).fill(0);
    
    tickets
      .filter(t => {
        const d = new Date(t.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.status !== 'cancelled';
      })
      .forEach(t => {
        const hour = new Date(t.createdAt).getHours();
        hours[hour] += 1;
      });

    const maxVal = Math.max(...hours, 1);
    const peakHour = hours.indexOf(Math.max(...hours));

    // Agrupar en franjas para el insight
    const slots = {
      morning: hours.slice(6, 12).reduce((a, b) => a + b, 0),
      afternoon: hours.slice(12, 18).reduce((a, b) => a + b, 0),
      evening: hours.slice(18, 24).reduce((a, b) => a + b, 0),
      night: hours.slice(0, 6).reduce((a, b) => a + b, 0),
    };

    let bestSlotLabel = 'la Tarde';
    let maxSlot = slots.afternoon;
    if (slots.morning > maxSlot) { bestSlotLabel = 'la Mañana'; maxSlot = slots.morning; }
    if (slots.evening > maxSlot) { bestSlotLabel = 'la Noche'; maxSlot = slots.evening; }
    if (slots.night > maxSlot) { bestSlotLabel = 'la Madrugada'; }

    return {
      hours: hours.map((v, i) => ({ 
        h: i, 
        value: v, 
        height: (v / maxVal) * 50,
        isPeak: i === peakHour && v > 0 
      })),
      peakHour,
      bestSlotLabel,
      hasData: hours.some(v => v > 0)
    };
  }, [tickets]);

  return (
    <View style={styles.panelClassicCard}>
      <View style={styles.panelHeader}>
        <View style={[styles.iconBox, { backgroundColor: '#FFF7ED' }]}>
          <Ionicons name="time-outline" size={20} color="#EA580C" />
        </View>
        <Typography variant="bodyLargeStrong">Horarios con más ventas</Typography>
      </View>

      {hourData.hasData ? (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 80 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingBottom: 10, paddingLeft: 4 }}>
              {hourData.hours.map((d, i) => (
                <View key={i} style={{ alignItems: 'center', width: 20 }}>
                  <View style={[styles.barFill, { 
                    width: 6, 
                    height: d.height + 2, 
                    backgroundColor: d.isPeak ? '#EA580C' : '#FFEDD5',
                    borderRadius: 3 
                  }]} />
                  <Typography variant="labelXSmall" color="tertiary" style={{ fontSize: 7, marginTop: 4 }}>
                    {d.h.toString().padStart(2, '0')}
                  </Typography>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={[styles.insightBox, { backgroundColor: '#FFF7ED' }]}>
            <Ionicons name="flash-outline" size={16} color="#EA580C" />
            <Typography variant="labelSmall" style={{ color: '#7C2D12', flex: 1, marginLeft: 8 }}>
              Tu pico de ventas es a las <Typography variant="labelSmall" style={{ fontFamily: FontFamily.bold }}>{hourData.peakHour}:00 hs</Typography>. El bloque más activo es <Typography variant="labelSmall" style={{ fontFamily: FontFamily.bold }}>{hourData.bestSlotLabel}</Typography>.
            </Typography>
          </View>
        </View>
      ) : (
        <View style={{ paddingVertical: 12, alignItems: 'center' }}>
          <Typography variant="captionBase" color="tertiary">No hay datos suficientes para este mes</Typography>
        </View>
      )}
    </View>
  );
};

/**
 * Panel 10: Gastos por Medio de Pago (Mes Actual)
 */
export const ExpensesByPaymentMethodPanel: React.FC<PanelProps> = ({ tickets }) => {
  const paymentData = useMemo(() => {
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);

    const expenses = tickets.filter(t => {
      const d = new Date(t.createdAt);
      return t.type === 'expense' && t.status !== 'cancelled' && d >= threeMonthsAgo;
    });

    const methods: Record<string, number> = {};
    let total = 0;

    expenses.forEach(t => {
      const method = t.paymentMethod || 'otro';
      methods[method] = (methods[method] || 0) + t.amount;
      total += t.amount;
    });

    const labels: Record<string, { label: string, icon: string, color: string }> = {
      cash: { label: 'Efectivo', icon: 'cash-outline', color: '#10B981' },
      transfer: { label: 'Transferencia', icon: 'swap-horizontal-outline', color: '#3B82F6' },
      card: { label: 'Tarjeta', icon: 'card-outline', color: '#6366F1' },
      debit: { label: 'Débito', icon: 'wallet-outline', color: '#8B5CF6' },
      qr: { label: 'QR / Digital', icon: 'qr-code-outline', color: '#F59E0B' },
      otro: { label: 'Otro', icon: 'ellipsis-horizontal-outline', color: '#9CA3AF' }
    };

    const sorted = Object.entries(methods)
      .sort((a, b) => b[1] - a[1])
      .map(([id, amount]) => ({
        id,
        ...labels[id] || labels.otro,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0
      }));

    return { sorted, total };
  }, [tickets]);

  return (
    <View style={styles.panelClassicCard}>
      <View style={styles.panelHeader}>
        <View style={[styles.iconBox, { backgroundColor: '#F3F4F6' }]}>
          <Ionicons name="wallet-outline" size={20} color="#4B5563" />
        </View>
        <View style={{ flex: 1 }}>
          <Typography variant="bodyLargeStrong">Pagos por medio</Typography>
          <Typography variant="captionBase" color="tertiary">Últimos 3 meses</Typography>
        </View>
      </View>

      {paymentData.sorted.length > 0 ? (
        <View style={{ gap: 12 }}>
          {paymentData.sorted.map(item => (
            <View key={item.id} style={styles.categoryDetailRow}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: item.color + '15', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={item.icon as any} size={16} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Typography variant="bodySmallStrong">{item.label}</Typography>
                <View style={{ height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${item.percentage}%`, backgroundColor: item.color }} />
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                <Typography variant="bodySmallStrong">$ {item.amount.toLocaleString('es-AR')}</Typography>
                <Typography variant="labelXSmall" color="tertiary">{Math.round(item.percentage)}%</Typography>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ paddingVertical: 12, alignItems: 'center' }}>
          <Typography variant="captionBase" color="tertiary">No hay pagos registrados en los últimos 3 meses</Typography>
        </View>
      )}
    </View>
  );
};

/**
 * Panel 11: Cobros por Medio de Pago (Últimos 3 meses)
 */
export const IncomeByPaymentMethodPanel: React.FC<PanelProps> = ({ tickets }) => {
  const incomeData = useMemo(() => {
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);

    const incomeTickets = tickets.filter(t => {
      const d = new Date(t.createdAt);
      return t.type === 'income' && t.status !== 'cancelled' && d >= threeMonthsAgo;
    });

    const methods: Record<string, number> = {};
    let total = 0;

    incomeTickets.forEach(t => {
      const method = t.paymentMethod || 'otro';
      methods[method] = (methods[method] || 0) + t.amount;
      total += t.amount;
    });

    const labels: Record<string, { label: string, icon: string, color: string }> = {
      cash: { label: 'Efectivo', icon: 'cash-outline', color: '#10B981' },
      transfer: { label: 'Transferencia', icon: 'swap-horizontal-outline', color: '#3B82F6' },
      card: { label: 'Tarjeta', icon: 'card-outline', color: '#6366F1' },
      debit: { label: 'Débito', icon: 'wallet-outline', color: '#8B5CF6' },
      qr: { label: 'QR / Digital', icon: 'qr-code-outline', color: '#F59E0B' },
      otro: { label: 'Otro', icon: 'ellipsis-horizontal-outline', color: '#9CA3AF' }
    };

    const sorted = Object.entries(methods)
      .sort((a, b) => b[1] - a[1])
      .map(([id, amount]) => ({
        id,
        ...labels[id] || labels.otro,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0
      }));

    return { sorted, total };
  }, [tickets]);

  return (
    <View style={styles.panelClassicCard}>
      <View style={styles.panelHeader}>
        <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
          <Ionicons name="trending-up-outline" size={20} color="#059669" />
        </View>
        <View style={{ flex: 1 }}>
          <Typography variant="bodyLargeStrong">Cobros por medio</Typography>
          <Typography variant="captionBase" color="tertiary">Últimos 3 meses</Typography>
        </View>
      </View>

      {incomeData.sorted.length > 0 ? (
        <View style={{ gap: 12 }}>
          {incomeData.sorted.map(item => (
            <View key={item.id} style={styles.categoryDetailRow}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: item.color + '15', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={item.icon as any} size={16} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Typography variant="bodySmallStrong">{item.label}</Typography>
                <View style={{ height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${item.percentage}%`, backgroundColor: item.color }} />
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                <Typography variant="bodySmallStrong">$ {item.amount.toLocaleString('es-AR')}</Typography>
                <Typography variant="labelXSmall" color="tertiary">{Math.round(item.percentage)}%</Typography>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ paddingVertical: 12, alignItems: 'center' }}>
          <Typography variant="captionBase" color="tertiary">No hay cobros registrados en los últimos 3 meses</Typography>
        </View>
      )}
    </View>
  );
};

/**
 * Panel 12: Diagnóstico Financiero
 * Analiza múltiples dimensiones para generar un veredicto de salud financiera.
 */
export const WalletHealthPanel: React.FC<PanelProps> = ({ tickets }) => {
  const diagnosis = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // --- 1. Datos del mes actual ---
    const thisMonthTickets = tickets.filter(t => {
      const d = new Date(t.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.status !== 'cancelled';
    });
    const incomeThisMonth = thisMonthTickets.reduce((s, t) => t.type === 'income' ? s + t.amount : s, 0);
    const expenseThisMonth = thisMonthTickets.reduce((s, t) => t.type === 'expense' ? s + t.amount : s, 0);
    const netThisMonth = incomeThisMonth - expenseThisMonth;

    // --- 2. Datos del mes anterior (para tendencia) ---
    const prevMonthTickets = tickets.filter(t => {
      const d = new Date(t.createdAt);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear && t.status !== 'cancelled';
    });
    const incomeLastMonth = prevMonthTickets.reduce((s, t) => t.type === 'income' ? s + t.amount : s, 0);
    const expenseLastMonth = prevMonthTickets.reduce((s, t) => t.type === 'expense' ? s + t.amount : s, 0);
    const netLastMonth = incomeLastMonth - expenseLastMonth;

    // --- 3. Pendientes globales ---
    const pendingIncome = tickets.filter(t => t.type === 'income' && (t.status === 'pending' || t.status === 'partial'));
    const pendingExpense = tickets.filter(t => t.type === 'expense' && (t.status === 'pending' || t.status === 'partial'));
    const amountPendingToCollect = pendingIncome.reduce((s, t) => s + (t.amount - (Number(t.amountPaid) || 0)), 0);
    const amountPendingToPay = pendingExpense.reduce((s, t) => s + (t.amount - (Number(t.amountPaid) || 0)), 0);

    // --- 4. Ratio de cobertura (ingresos / gastos) ---
    const coverageRatio = expenseThisMonth > 0 ? incomeThisMonth / expenseThisMonth : (incomeThisMonth > 0 ? 999 : 1);

    // --- 5. Tasa de cobro del mes (completados / total income) ---
    const totalIncomeTickets = thisMonthTickets.filter(t => t.type === 'income').length;
    const completedIncomeTickets = thisMonthTickets.filter(t => t.type === 'income' && t.status === 'completed').length;
    const collectionRate = totalIncomeTickets > 0 ? (completedIncomeTickets / totalIncomeTickets) * 100 : 0;

    // --- 6. Calcular puntuación de salud (0-100) ---
    let score = 50; // Base

    // Cobertura: +20 si cubres gastos con creces, -20 si no
    if (coverageRatio >= 1.5) score += 20;
    else if (coverageRatio >= 1.0) score += 10;
    else if (coverageRatio >= 0.7) score -= 5;
    else score -= 15;

    // Tendencia: +15 si mejoraste vs mes pasado
    if (netThisMonth > netLastMonth) score += 15;
    else if (netThisMonth === netLastMonth) score += 5;
    else score -= 10;

    // Cobrabilidad: +10 si cobras >80%
    if (collectionRate >= 80) score += 10;
    else if (collectionRate >= 50) score += 5;
    else if (totalIncomeTickets > 0) score -= 5;

    // Deuda neta: +5 si te deben más de lo que debés
    if (amountPendingToCollect > amountPendingToPay) score += 5;
    else if (amountPendingToPay > amountPendingToCollect * 2) score -= 10;

    // Clamp
    score = Math.max(0, Math.min(100, score));

    // --- 7. Determinar nivel y mensaje ---
    let level: 'excellent' | 'good' | 'tight' | 'critical';
    let emoji: string;
    let color: string;
    let bgColor: string;
    let label: string;

    if (score >= 75) {
      level = 'excellent'; emoji = '🟢'; color = '#059669'; bgColor = '#ECFDF5'; label = 'Excelente';
    } else if (score >= 55) {
      level = 'good'; emoji = '🟡'; color = '#CA8A04'; bgColor = '#FEFCE8'; label = 'Estable';
    } else if (score >= 35) {
      level = 'tight'; emoji = '🟠'; color = '#EA580C'; bgColor = '#FFF7ED'; label = 'Ajustada';
    } else {
      level = 'critical'; emoji = '🔴'; color = '#DC2626'; bgColor = '#FEF2F2'; label = 'Crítica';
    }

    // --- 8. Generar narrativa dinámica ---
    const parts: string[] = [];

    if (incomeThisMonth === 0 && expenseThisMonth === 0) {
      parts.push('Aún no hay movimientos registrados este mes.');
    } else {
      // Cobertura
      if (coverageRatio >= 1.5) {
        parts.push(`Tus ingresos superan a los gastos por un buen margen.`);
      } else if (coverageRatio >= 1.0) {
        parts.push(`Tus ingresos cubren los gastos, pero sin mucho margen.`);
      } else {
        parts.push(`Tus gastos están superando a los ingresos este mes.`);
      }

      // Tendencia
      if (netThisMonth > netLastMonth && netLastMonth !== 0) {
        parts.push(`Vas mejor que el mes pasado.`);
      } else if (netThisMonth < netLastMonth && netLastMonth !== 0) {
        parts.push(`La tendencia bajó comparado con el mes anterior.`);
      }

      // Pendientes
      if (amountPendingToCollect > 0 || amountPendingToPay > 0) {
        if (amountPendingToCollect > 0 && amountPendingToPay > 0) {
          parts.push(`Tenés $${amountPendingToCollect.toLocaleString('es-AR')} por cobrar y $${amountPendingToPay.toLocaleString('es-AR')} por pagar.`);
        } else if (amountPendingToCollect > 0) {
          parts.push(`Tenés $${amountPendingToCollect.toLocaleString('es-AR')} pendiente de cobro.`);
        } else {
          parts.push(`Tenés $${amountPendingToPay.toLocaleString('es-AR')} pendiente de pago.`);
        }
      }
    }

    const hasData = incomeThisMonth > 0 || expenseThisMonth > 0 || pendingIncome.length > 0 || pendingExpense.length > 0;

    return {
      score, level, emoji, color, bgColor, label,
      narrative: parts.join(' '),
      incomeThisMonth, expenseThisMonth, netThisMonth,
      coverageRatio, collectionRate,
      amountPendingToCollect, amountPendingToPay,
      pendingIncomeCount: pendingIncome.length,
      pendingExpenseCount: pendingExpense.length,
      hasData,
    };
  }, [tickets]);

  return (
    <View style={styles.panelClassicCard}>
      {/* Header con indicador de salud */}
      <View style={[styles.panelHeader, { marginBottom: 12 }]}>
        <View style={[styles.iconBox, { backgroundColor: diagnosis.bgColor }]}>
          <Ionicons name="pulse-outline" size={20} color={diagnosis.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Typography variant="bodyLargeStrong">Diagnóstico Financiero</Typography>
          <Typography variant="captionBase" color="tertiary">Situación actual de la billetera</Typography>
        </View>
      </View>

      {diagnosis.hasData ? (
        <View>
          {/* Indicador principal */}
          <View style={{ 
            backgroundColor: diagnosis.bgColor, 
            borderRadius: 16, 
            padding: 16, 
            alignItems: 'center', 
            marginBottom: 16 
          }}>
            <Typography variant="bodyLargeStrong" style={{ fontSize: 28, marginBottom: 4 }}>
              {diagnosis.emoji}
            </Typography>
            <Typography variant="bodyLargeStrong" style={{ color: diagnosis.color, fontSize: 18 }}>
              {diagnosis.label}
            </Typography>
            <View style={{ 
              width: '80%', height: 6, backgroundColor: '#E5E7EB', 
              borderRadius: 3, marginTop: 10, overflow: 'hidden' 
            }}>
              <View style={{ 
                height: '100%', 
                width: `${diagnosis.score}%`, 
                backgroundColor: diagnosis.color, 
                borderRadius: 3 
              }} />
            </View>
            <Typography variant="labelXSmall" color="tertiary" style={{ marginTop: 6 }}>
              Puntaje: {diagnosis.score} / 100
            </Typography>
          </View>

          {/* Métricas compactas */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <View style={{ flex: 1, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10, alignItems: 'center' }}>
              <Typography variant="labelXSmall" color="tertiary">Cobertura</Typography>
              <Typography variant="bodySmallStrong" style={{ color: diagnosis.coverageRatio >= 1 ? '#059669' : '#DC2626' }}>
                {diagnosis.coverageRatio >= 10 ? '∞' : `${(diagnosis.coverageRatio * 100).toFixed(0)}%`}
              </Typography>
            </View>
            <View style={{ flex: 1, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10, alignItems: 'center' }}>
              <Typography variant="labelXSmall" color="tertiary">Cobrado</Typography>
              <Typography variant="bodySmallStrong" style={{ color: '#3B82F6' }}>
                {diagnosis.collectionRate.toFixed(0)}%
              </Typography>
            </View>
            <View style={{ flex: 1, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10, alignItems: 'center' }}>
              <Typography variant="labelXSmall" color="tertiary">Por cobrar</Typography>
              <Typography variant="bodySmallStrong" style={{ color: '#F59E0B' }}>
                {diagnosis.pendingIncomeCount}
              </Typography>
            </View>
            <View style={{ flex: 1, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10, alignItems: 'center' }}>
              <Typography variant="labelXSmall" color="tertiary">Por pagar</Typography>
              <Typography variant="bodySmallStrong" style={{ color: '#EF4444' }}>
                {diagnosis.pendingExpenseCount}
              </Typography>
            </View>
          </View>

          {/* Narrativa inteligente */}
          <View style={{ 
            backgroundColor: diagnosis.bgColor, 
            padding: 14, 
            borderRadius: 12, 
            borderLeftWidth: 3, 
            borderLeftColor: diagnosis.color 
          }}>
            <Typography variant="labelSmall" style={{ color: diagnosis.color, lineHeight: 20 }}>
              {diagnosis.narrative}
            </Typography>
          </View>
        </View>
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <View style={{ 
            width: 56, height: 56, borderRadius: 28, 
            backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', 
            marginBottom: 14 
          }}>
            <Ionicons name="pulse-outline" size={28} color="#D1D5DB" />
          </View>
          <Typography variant="bodySmallStrong" color="secondary" style={{ marginBottom: 6 }}>
            Todavía no hay suficiente información
          </Typography>
          <Typography variant="captionBase" color="tertiary" style={{ textAlign: 'center', lineHeight: 20, paddingHorizontal: 12 }}>
            A medida que registres cobros y pagos, este panel te mostrará un diagnóstico completo de la salud financiera de tu billetera con puntaje, tendencias y recomendaciones.
          </Typography>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  panelClassicCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.strokeSubtle,
    ...Shadows.card,
  },
  panelIntegrated: {
    paddingVertical: 16,
    marginBottom: 16,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
  },
  netInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    paddingHorizontal: 8,
  },
  chartBarCol: {
    alignItems: 'center',
    width: 32,
  },
  barTrack: {
    height: 60,
    width: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  categoryDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryTotalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  insightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
});
