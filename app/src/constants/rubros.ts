export interface RubroItem {
  id: string;
  label: string;
  icon: string;
  isSeparator?: boolean;
}

export const GENERAL_RUBROS_GASTOS: RubroItem[] = [
  { id: 'alquiler_expensas', label: 'Alquiler / Expensas', icon: 'home-outline' },
  { id: 'servicios_basicos', label: 'Servicios (Luz, agua, gas)', icon: 'flash-outline' },
  { id: 'internet_telefonia', label: 'Internet y Telefonía', icon: 'wifi-outline' },
  { id: 'sueldos_jornales', label: 'Sueldos y jornales', icon: 'people-outline' },
  { id: 'compra_mercaderia', label: 'Compra de mercadería / insumos', icon: 'cart-outline' },
  { id: 'transporte_viajes', label: 'Transporte y viajes', icon: 'bus-outline' },
  { id: 'combustible_lubricantes', label: 'Combustible y Lubricantes', icon: 'car-outline' },
  { id: 'salud_farmacia', label: 'Salud y Farmacia', icon: 'medkit-outline' },
  { id: 'educacion', label: 'Educación', icon: 'school-outline' },
  { id: 'impuestos_tasas', label: 'Impuestos y Tasas', icon: 'receipt-outline' },
  { id: 'seguros', label: 'Seguros', icon: 'shield-checkmark-outline' },
  { id: 'mantenimiento_reparaciones', label: 'Mantenimiento y reparaciones', icon: 'construct-outline' },
  { id: 'entretenimiento_ocio', label: 'Entretenimiento y Ocio', icon: 'game-controller-outline' },
  { id: 'comisiones_bancarias', label: 'Comisiones y gastos bancarias', icon: 'card-outline' },
  { id: 'multas_recargos', label: 'Multas y Recargos', icon: 'alert-circle-outline' },
  { id: 'alimentacion', label: 'Alimentación', icon: 'restaurant-outline' },
  { id: 'ropa_vestimenta', label: 'Ropa / Vestimenta', icon: 'shirt-outline' },
  { id: 'contribuciones', label: 'Contribuciones', icon: 'heart-outline' },
  { id: 'patentes', label: 'Patentes', icon: 'id-card-outline' },
  { id: 'aportes_patronales', label: 'Aportes patronales y personales', icon: 'people-circle-outline' },
  { id: 'gimnasio', label: 'Gimnasio', icon: 'fitness-outline' },
  { id: 'recreacion', label: 'Actividades de recreación', icon: 'happy-outline' },
  { id: 'asesoramiento_externo', label: 'Asesoramiento externo', icon: 'briefcase-outline' },
  { id: 'descuentos_concedidos', label: 'Descuentos concedidos', icon: 'pricetag-outline' },
  { id: 'papeleria', label: 'Gastos de papelería', icon: 'document-text-outline' },
  { id: 'regalos_gastos', label: 'Regalos', icon: 'gift-outline' },
  { id: 'publicidad_promociones', label: 'Publicidad y promociones', icon: 'megaphone-outline' },
  { id: 'anticipos_proveedores', label: 'Anticipos a proveedores', icon: 'trending-up-outline' },
  { id: 'convenios_varios', label: 'Convenios varios', icon: 'hand-left-outline' },
  { id: 'tarjetas_credito', label: 'Tarjetas de créditos', icon: 'card-outline' },
  { id: 'prestamos', label: 'Préstamos con instituciones financieras y no financieras', icon: 'business-outline' },
  { id: 'hipoteca', label: 'Hipoteca', icon: 'key-outline' },
  { id: 'estacionamientos_peajes', icon: 'car-sport-outline', label: 'Estacionamientos y peajes' },
  { id: 'viajes_vacaciones', label: 'Viajes y vacaciones', icon: 'airplane-outline' },
  { id: 'distribucion_envios', label: 'Distribución y envíos', icon: 'cube-outline' },
  { id: 'retiros_bancarios', label: 'Retiros de cuentas bancarias', icon: 'cash-outline' },
];

export const GENERAL_RUBROS_INGRESOS: RubroItem[] = [
  { id: 'salarios_adelantos', label: 'Salarios y adelantos', icon: 'cash-outline' },
  { id: 'honorarios_profesionales', label: 'Honorarios profesionales', icon: 'briefcase-outline' },
  { id: 'ventas_mercaderias', label: 'Ventas de mercaderías / productos', icon: 'barcode-outline' },
  { id: 'cobros_servicios', label: 'Cobros por servicios', icon: 'construct-outline' },
  { id: 'comisiones_ventas', label: 'Comisiones por ventas', icon: 'trending-up-outline' },
  { id: 'cobros_extraordinarios', label: 'Cobros Extraordinarios', icon: 'star-outline' },
  { id: 'intereses_rentas', label: 'Intereses y Rentas', icon: 'analytics-outline' },
  { id: 'dividendos', label: 'Dividendos', icon: 'pie-chart-outline' },
  { id: 'bonificaciones_recibidas', label: 'Bonificaciones / Descuentos recibidos', icon: 'gift-outline' },
  { id: 'reembolso_gastos', label: 'Reembolso de gastos', icon: 'refresh-outline' },
  { id: 'regalos_premios', label: 'Regalos y Premios', icon: 'heart-outline' },
  { id: 'subsidios_ayudas', label: 'Subsidios y Ayudas', icon: 'help-buoy-outline' },
  { id: 'devoluciones_compras', label: 'Devoluciones de compras', icon: 'arrow-undo-outline' },
  { id: 'venta_activos', label: 'Venta de activos', icon: 'business-outline' },
  { id: 'cobros_varios', label: 'Cobros varios y Otros', icon: 'ellipsis-horizontal-outline' },
  { id: 'adelantos_clientes', label: 'Adelantos de clientes', icon: 'person-add-outline' },
  { id: 'ahorro_emergencia', label: 'Ahorro de emergencia', icon: 'shield-outline' },
];

export const ALL_EXPENSE_IDS = GENERAL_RUBROS_GASTOS.map(r => r.id);
export const ALL_INCOME_IDS = GENERAL_RUBROS_INGRESOS.map(r => r.id);

export const WALLET_RUBROS_MAP: Record<string, { gastos: string[]; ingresos: string[] }> = {
  personal: { 
    gastos: ['alquiler_expensas', 'servicios_basicos', 'internet_telefonia', 'transporte_viajes', 'alimentacion', 'ropa_vestimenta', 'salud_farmacia', 'entretenimiento_ocio', 'tarjetas_credito'], 
    ingresos: ['salarios_adelantos', 'cobros_varios', 'regalos_premios', 'ahorro_emergencia'] 
  },
  business: { 
    gastos: ['compra_mercaderia', 'sueldos_jornales', 'impuestos_tasas', 'mantenimiento_reparaciones', 'asesoramiento_externo', 'publicidad_promociones', 'comisiones_bancarias', 'aportes_patronales'], 
    ingresos: ['ventas_mercaderias', 'cobros_servicios', 'comisiones_ventas', 'adelantos_clientes'] 
  },
  negocio_productos: { 
    gastos: ['compra_mercaderia', 'sueldos_jornales', 'impuestos_tasas', 'mantenimiento_reparaciones', 'publicidad_promociones', 'distribucion_envios'], 
    ingresos: ['ventas_mercaderias', 'adelantos_clientes', 'cobros_extraordinarios'] 
  },
  negocio_servicios: { 
    gastos: ['sueldos_jornales', 'impuestos_tasas', 'mantenimiento_reparaciones', 'asesoramiento_externo', 'publicidad_promociones', 'transporte_viajes'], 
    ingresos: ['cobros_servicios', 'honorarios_profesionales', 'adelantos_clientes'] 
  },
  shared: { 
    gastos: ['alquiler_expensas', 'servicios_basicos', 'alimentacion', 'recreacion', 'internet_telefonia', 'viajes_vacaciones'], 
    ingresos: ['reembolso_gastos', 'cobros_varios'] 
  },
  otro: { 
    gastos: ['alimentacion', 'transporte_viajes', 'servicios_basicos', 'comisiones_bancarias'], 
    ingresos: ['cobros_varios', 'intereses_rentas', 'reembolso_gastos'] 
  },
  // Alias / Otros casos
  products: { gastos: ['compra_mercaderia', 'distribucion_envios', 'impuestos_tasas'], ingresos: ['ventas_mercaderias'] },
  services: { gastos: ['transporte_viajes', 'asesoramiento_externo', 'impuestos_tasas'], ingresos: ['cobros_servicios', 'honorarios_profesionales'] },
  mycollects: { gastos: [], ingresos: ['cobros_varios', 'salarios_adelantos'] },
  mypays: { gastos: ['servicios_basicos', 'alquiler_expensas', 'tarjetas_credito'], ingresos: [] },
};

export const getRubroLabel = (
  idOrLabel: string | undefined, 
  type: 'income' | 'expense',
  globalType?: 'ticket' | 'transfer' | 'adjustment'
): string => {
  if (globalType === 'transfer') return 'Transferencia';
  if (globalType === 'adjustment') return 'Ajuste de saldo';

  if (!idOrLabel) return type === 'income' ? 'Cobro' : 'Pago';
  
  const list = type === 'income' ? GENERAL_RUBROS_INGRESOS : GENERAL_RUBROS_GASTOS;
  const found = list.find(r => r.id === idOrLabel);
  return found ? found.label : idOrLabel;
};

export const getRubroIcon = (
  idOrLabel: string | undefined, 
  type: 'income' | 'expense',
  globalType?: 'ticket' | 'transfer' | 'adjustment'
): string => {
  if (globalType === 'transfer') return 'swap-horizontal-outline';
  if (globalType === 'adjustment') return 'calculator-outline';

  const fallback = 'receipt-outline';
  if (!idOrLabel) return fallback;
  
  const list = type === 'income' ? GENERAL_RUBROS_INGRESOS : GENERAL_RUBROS_GASTOS;
  const found = list.find(r => r.id === idOrLabel || r.label === idOrLabel);
  
  return found ? found.icon : fallback;
};

export const getPartitionedRubros = (
  type: 'income' | 'expense',
  enabledIds: string[]
): RubroItem[] => {
  const general = type === 'income' ? GENERAL_RUBROS_INGRESOS : GENERAL_RUBROS_GASTOS;
  
  const selected = general
    .filter(r => enabledIds.includes(r.id))
    .sort((a, b) => a.label.localeCompare(b.label));
    
  const others = general
    .filter(r => !enabledIds.includes(r.id))
    .sort((a, b) => a.label.localeCompare(b.label));

  if (others.length === 0) return selected;
  if (selected.length === 0) return others;

  return [
    ...selected,
    { id: 'separator', label: '---', icon: 'remove-outline', isSeparator: true },
    ...others
  ];
};
