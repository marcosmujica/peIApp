
export interface WalletTypeConfig {
  type: string;
  defaultCategories: { key: string; type: 'income' | 'expense' }[];
  defaultPanels: string[];
  defaultQuestions: string[];
  defaultOrigins?: { name: string; contacts: { name: string; phone: string }[] }[];
}

// ─── EXPENSES PER TYPE ───────────────────────────────────────────────────────

const EXPENSES_PERSONAL: { key: string; type: 'expense' }[] = [
  { key: 'alquiler_expensas', type: 'expense' },
  { key: 'servicios_basicos', type: 'expense' },
  { key: 'internet_telefonia', type: 'expense' },
  { key: 'transporte_viajes', type: 'expense' },
  { key: 'combustible_lubricantes', type: 'expense' },
  { key: 'salud_farmacia', type: 'expense' },
  { key: 'educacion', type: 'expense' },
  { key: 'impuestos_tasas', type: 'expense' },
  { key: 'seguros', type: 'expense' },
  { key: 'mantenimiento_reparaciones', type: 'expense' },
  { key: 'entretenimiento_ocio', type: 'expense' },
  { key: 'comisiones_bancarias', type: 'expense' },
  { key: 'multas_recargos', type: 'expense' },
  { key: 'alimentacion', type: 'expense' },
  { key: 'ropa_vestimenta', type: 'expense' },
  { key: 'contribuciones', type: 'expense' },
  { key: 'patentes', type: 'expense' },
  { key: 'gimnasio', type: 'expense' },
  { key: 'recreacion', type: 'expense' },
  { key: 'descuentos_concedidos', type: 'expense' },
  { key: 'papeleria', type: 'expense' },
  { key: 'regalos_gastos', type: 'expense' },
  { key: 'convenios_varios', type: 'expense' },
  { key: 'tarjetas_credito', type: 'expense' },
  { key: 'prestamos', type: 'expense' },
  { key: 'hipoteca', type: 'expense' },
  { key: 'estacionamientos_peajes', type: 'expense' },
  { key: 'viajes_vacaciones', type: 'expense' },
  { key: 'retiros_bancarios', type: 'expense' },
];

const EXPENSES_BUSINESS: { key: string; type: 'expense' }[] = [
  { key: 'alquiler_expensas', type: 'expense' },
  { key: 'servicios_basicos', type: 'expense' },
  { key: 'internet_telefonia', type: 'expense' },
  { key: 'sueldos_jornales', type: 'expense' },
  { key: 'compra_mercaderia', type: 'expense' },
  { key: 'transporte_viajes', type: 'expense' },
  { key: 'combustible_lubricantes', type: 'expense' },
  { key: 'impuestos_tasas', type: 'expense' },
  { key: 'seguros', type: 'expense' },
  { key: 'mantenimiento_reparaciones', type: 'expense' },
  { key: 'comisiones_bancarias', type: 'expense' },
  { key: 'multas_recargos', type: 'expense' },
  { key: 'alimentacion', type: 'expense' },
  { key: 'contribuciones', type: 'expense' },
  { key: 'patentes', type: 'expense' },
  { key: 'aportes_patronales', type: 'expense' },
  { key: 'asesoramiento_externo', type: 'expense' },
  { key: 'descuentos_concedidos', type: 'expense' },
  { key: 'papeleria', type: 'expense' },
  { key: 'publicidad_promociones', type: 'expense' },
  { key: 'anticipos_proveedores', type: 'expense' },
  { key: 'convenios_varios', type: 'expense' },
  { key: 'tarjetas_credito', type: 'expense' },
  { key: 'prestamos', type: 'expense' },
  { key: 'estacionamientos_peajes', type: 'expense' },
  { key: 'distribucion_envios', t ype: 'expense' },
  { key: 'retiros_bancarios', type: 'expense' },
];

const EXPENSES_COMMUNITY: { key: string; type: 'expense' }[] = [
  { key: 'alquiler_expensas', type: 'expense' },
  { key: 'servicios_basicos', type: 'expense' },
  { key: 'internet_telefonia', type: 'expense' },
  { key: 'sueldos_jornales', type: 'expense' },
  { key: 'transporte_viajes', type: 'expense' },
  { key: 'combustible_lubricantes', type: 'expense' },
  { key: 'salud_farmacia', type: 'expense' },
  { key: 'educacion', type: 'expense' },
  { key: 'mantenimiento_reparaciones', type: 'expense' },
  { key: 'multas_recargos', type: 'expense' },
  { key: 'alimentacion', type: 'expense' },
  { key: 'aportes_patronales', type: 'expense' },
  { key: 'recreacion', type: 'expense' },
  { key: 'asesoramiento_externo', type: 'expense' },
  { key: 'publicidad_promociones', type: 'expense' },
  { key: 'distribucion_envios', type: 'expense' },
  { key: 'retiros_bancarios', type: 'expense' },
];

const EXPENSES_SHARED: { key: string; type: 'expense' }[] = [
  { key: 'alquiler_expensas', type: 'expense' },
  { key: 'servicios_basicos', type: 'expense' },
  { key: 'internet_telefonia', type: 'expense' },
  { key: 'compra_mercaderia', type: 'expense' },
  { key: 'transporte_viajes', type: 'expense' },
  { key: 'combustible_lubricantes', type: 'expense' },
  { key: 'salud_farmacia', type: 'expense' },
  { key: 'impuestos_tasas', type: 'expense' },
  { key: 'seguros', type: 'expense' },
  { key: 'entretenimiento_ocio', type: 'expense' },
  { key: 'alimentacion', type: 'expense' },
  { key: 'patentes', type: 'expense' },
  { key: 'gimnasio', type: 'expense' },
  { key: 'recreacion', type: 'expense' },
  { key: 'papeleria', type: 'expense' },
  { key: 'regalos_gastos', type: 'expense' },
  { key: 'tarjetas_credito', type: 'expense' },
  { key: 'hipoteca', type: 'expense' },
  { key: 'estacionamientos_peajes', type: 'expense' },
  { key: 'viajes_vacaciones', type: 'expense' },
  { key: 'retiros_bancarios', type: 'expense' },
];

const EXPENSES_OTHER: { key: string; type: 'expense' }[] = [
  { key: 'alquiler_expensas', type: 'expense' },
  { key: 'servicios_basicos', type: 'expense' },
  { key: 'internet_telefonia', type: 'expense' },
  { key: 'compra_mercaderia', type: 'expense' },
  { key: 'transporte_viajes', type: 'expense' },
  { key: 'combustible_lubricantes', type: 'expense' },
  { key: 'salud_farmacia', type: 'expense' },
  { key: 'educacion', type: 'expense' },
  { key: 'impuestos_tasas', type: 'expense' },
  { key: 'seguros', type: 'expense' },
  { key: 'mantenimiento_reparaciones', type: 'expense' },
  { key: 'entretenimiento_ocio', type: 'expense' },
  { key: 'comisiones_bancarias', type: 'expense' },
  { key: 'ropa_vestimenta', type: 'expense' },
  { key: 'contribuciones', type: 'expense' },
  { key: 'patentes', type: 'expense' },
  { key: 'gimnasio', type: 'expense' },
  { key: 'recreacion', type: 'expense' },
  { key: 'asesoramiento_externo', type: 'expense' },
  { key: 'papeleria', type: 'expense' },
  { key: 'regalos_gastos', type: 'expense' },
  { key: 'publicidad_promociones', type: 'expense' },
  { key: 'anticipos_proveedores', type: 'expense' },
  { key: 'convenios_varios', type: 'expense' },
  { key: 'tarjetas_credito', type: 'expense' },
  { key: 'prestamos', type: 'expense' },
  { key: 'hipoteca', type: 'expense' },
  { key: 'estacionamientos_peajes', type: 'expense' },
  { key: 'retiros_bancarios', type: 'expense' },
];

// ─── INCOMES PER TYPE ────────────────────────────────────────────────────────

const INCOME_PERSONAL: { key: string; type: 'income' }[] = [
  { key: 'salarios_adelantos', type: 'income' },
  { key: 'honorarios_profesionales', type: 'income' },
  { key: 'cobros_extraordinarios', type: 'income' },
  { key: 'intereses_rentas', type: 'income' },
  { key: 'dividendos', type: 'income' },
  { key: 'bonificaciones_recibidas', type: 'income' },
  { key: 'regalos_premios', type: 'income' },
  { key: 'subsidios_ayudas', type: 'income' },
  { key: 'venta_activos', type: 'income' },
  { key: 'cobros_varios', type: 'income' },
  { key: 'ahorro_emergencia', type: 'income' },
];

const INCOME_PRODUCTS: { key: string; type: 'income' }[] = [
  { key: 'salarios_adelantos', type: 'income' },
  { key: 'honorarios_profesionales', type: 'income' },
  { key: 'ventas_mercaderias', type: 'income' },
  { key: 'comisiones_ventas', type: 'income' },
  { key: 'cobros_extraordinarios', type: 'income' },
  { key: 'intereses_rentas', type: 'income' },
  { key: 'dividendos', type: 'income' },
  { key: 'bonificaciones_recibidas', type: 'income' },
  { key: 'reembolso_gastos', type: 'income' },
  { key: 'devoluciones_compras', type: 'income' },
  { key: 'venta_activos', type: 'income' },
  { key: 'cobros_varios', type: 'income' },
  { key: 'adelantos_clientes', type: 'income' },
  { key: 'ahorro_emergencia', type: 'income' },
];

const INCOME_SERVICES: { key: string; type: 'income' }[] = [
  { key: 'salarios_adelantos', type: 'income' },
  { key: 'honorarios_profesionales', type: 'income' },
  { key: 'cobros_servicios', type: 'income' },
  { key: 'comisiones_ventas', type: 'income' },
  { key: 'cobros_extraordinarios', type: 'income' },
  { key: 'intereses_rentas', type: 'income' },
  { key: 'dividendos', type: 'income' },
  { key: 'bonificaciones_recibidas', type: 'income' },
  { key: 'reembolso_gastos', type: 'income' },
  { key: 'devoluciones_compras', type: 'income' },
  { key: 'venta_activos', type: 'income' },
  { key: 'cobros_varios', type: 'income' },
  { key: 'adelantos_clientes', type: 'income' },
  { key: 'ahorro_emergencia', type: 'income' },
];

const INCOME_COMMUNITY: { key: string; type: 'income' }[] = [
  { key: 'salarios_adelantos', type: 'income' },
  { key: 'honorarios_profesionales', type: 'income' },
  { key: 'cobros_extraordinarios', type: 'income' },
  { key: 'intereses_rentas', type: 'income' },
  { key: 'dividendos', type: 'income' },
  { key: 'bonificaciones_recibidas', type: 'income' },
  { key: 'venta_activos', type: 'income' },
  { key: 'cobros_varios', type: 'income' },
  { key: 'ahorro_emergencia', type: 'income' },
];

const INCOME_SHARED: { key: string; type: 'income' }[] = [
  { key: 'salarios_adelantos', type: 'income' },
  { key: 'honorarios_profesionales', type: 'income' },
  { key: 'ventas_mercaderias', type: 'income' },
  { key: 'intereses_rentas', type: 'income' },
  { key: 'regalos_premios', type: 'income' },
  { key: 'subsidios_ayudas', type: 'income' },
  { key: 'cobros_varios', type: 'income' },
  { key: 'ahorro_emergencia', type: 'income' },
];

const INCOME_OTHER: { key: string; type: 'income' }[] = [
  { key: 'salarios_adelantos', type: 'income' },
  { key: 'honorarios_profesionales', type: 'income' },
  { key: 'ventas_mercaderias', type: 'income' },
  { key: 'cobros_servicios', type: 'income' },
  { key: 'comisiones_ventas', type: 'income' },
  { key: 'cobros_extraordinarios', type: 'income' },
  { key: 'intereses_rentas', type: 'income' },
  { key: 'dividendos', type: 'income' },
  { key: 'bonificaciones_recibidas', type: 'income' },
  { key: 'devoluciones_compras', type: 'income' },
  { key: 'venta_activos', type: 'income' },
  { key: 'ahorro_emergencia', type: 'income' },
];

// ─── PANELS PER TYPE ─────────────────────────────────────────────────────────

const PERSONAL_PANELS = [
  'indicador_situacion',
  'resumen_mes',
  'tickets_pendientes',
  'semanas_activas',
  'gastos_mes',
  'proximos_pagos',
  'gastos_por_medio_pago',
  'cobros_por_medio_pago',
  
];

const BUSINESS_PANELS = [
  'indicador_situacion',
  'ventas_dia_monto',
  'resumen_mes',
  'tickets_pendientes',
  'comparativo_ganancias',
  'proximos_pagos',
];

const COMMUNITY_PANELS = [
  'indicador_situacion',
  'resumen_mes',
  'tickets_pendientes',
  'proximos_pagos',
  'gastos_por_medio_pago',
  'cobros_por_medio_pago',
];

const SHARED_PANELS = [
  'indicador_situacion',
  'tickets_pendientes',
  'gastos_mes',
  'proximos_pagos',
];

const OTHER_PANELS = [
  'indicador_situacion',
  'ventas_dia_cantidad',
  'ventas_dia_monto',
  'resumen_mes',
  'tickets_pendientes',
  'semanas_activas',
  'gastos_mes',
  'proximos_pagos',
  'movimiento_dinero_semanal',
  'horarios_activos',
];

// ─── QUESTIONS PER TYPE ──────────────────────────────────────────────────────

const PERSONAL_QUESTIONS = [
  'Como funcionan las transferencias en peIApp',
  'Resumen de cobros pendientes para los próximos 7 días',
  'Consejos para ahorrar en esta billetera',
  'Cuales fueron mis mayores gastos en este mes',
  'Que gastos extras tuve este mes respecto al mes anterior',
];

const BUSINESS_QUESTIONS = [
  'Como funcionan las transferencias en peIApp',
  'Resumen de cobros pendientes para los próximos 7 días',
  'Cuales fueron mis mayores gastos en este mes',
  'Cuanto facture, gaste y gane este mes',
  'Cuál es el margen sobre ventas',
  'Cuál es el ciclo de pago a proveedores',
  'flujo de caja proyectado para los próximos 12 meses',
  'Cuál es el punto de equilibrio por cantidad y por valor',
  'Cuál es el ciclo de caja o de cobro',
  'Cuál es la estrategias de crecimiento los ingreso o ventas de productos o servicios',
  'Crecimiento porcentual de ingresos o ventas de productos o servicios',
  'Qué capital requiere y cuál es la estructura de financiamiento actual',
];

const COMMUNITY_QUESTIONS = [
  'Como funcionan las transferencias en peIApp',
  'Resumen de cobros pendientes para los próximos 7 días',
];

const OTHER_QUESTIONS = [
  'Como funcionan las transferencias en peIApp',
  'Resumen de cobros pendientes para los próximos 7 días',
  'Consejos para ahorrar en esta billetera',
  'Cuales fueron mis mayores gastos en este mes',
  'Cuanto facture, gaste y gane este mes',
  'Que gastos extras tuve este mes respecto al mes anterior',
  'Cuál es el margen sobre ventas',
  'Cuál es el ciclo de pago a proveedores',
  'flujo de caja proyectado para los próximos 12 meses',
  'Crecimiento porcentual de ingresos o ventas de productos o servicios',
  'Qué capital requiere y cuál es la estructura de financiamiento actual',
];

// ─── CONFIGS EXPORT ──────────────────────────────────────────────────────────

export const WALLET_CONFIGS: Record<string, WalletTypeConfig> = {
  personal: {
    type: 'personal',
    defaultCategories: [...EXPENSES_PERSONAL, ...INCOME_PERSONAL],
    defaultPanels: PERSONAL_PANELS,
    defaultQuestions: PERSONAL_QUESTIONS,
  },
  business: {
    type: 'business',
    defaultCategories: [...EXPENSES_BUSINESS, ...INCOME_PRODUCTS],
    defaultPanels: BUSINESS_PANELS,
    defaultQuestions: BUSINESS_QUESTIONS,
  },
  products: {
    type: 'products',
    defaultCategories: [...EXPENSES_BUSINESS, ...INCOME_PRODUCTS],
    defaultPanels: BUSINESS_PANELS,
    defaultQuestions: BUSINESS_QUESTIONS,
  },
  services: {
    type: 'services',
    defaultCategories: [...EXPENSES_BUSINESS, ...INCOME_SERVICES],
    defaultPanels: BUSINESS_PANELS,
    defaultQuestions: BUSINESS_QUESTIONS,
  },
  negocio_productos: {
    type: 'negocio_productos',
    defaultCategories: [...EXPENSES_BUSINESS, ...INCOME_PRODUCTS],
    defaultPanels: BUSINESS_PANELS,
    defaultQuestions: BUSINESS_QUESTIONS,
  },
  negocio_servicios: {
    type: 'negocio_servicios',
    defaultCategories: [...EXPENSES_BUSINESS, ...INCOME_SERVICES],
    defaultPanels: BUSINESS_PANELS,
    defaultQuestions: BUSINESS_QUESTIONS,
  },
  shared: {
    type: 'shared',
    defaultCategories: [...EXPENSES_SHARED, ...INCOME_SHARED],
    defaultPanels: SHARED_PANELS,
    defaultQuestions: COMMUNITY_QUESTIONS,
  },
  community: {
    type: 'community',
    defaultCategories: [...EXPENSES_COMMUNITY, ...INCOME_COMMUNITY],
    defaultPanels: COMMUNITY_PANELS,
    defaultQuestions: COMMUNITY_QUESTIONS,
  },
  mycollects: {
    type: 'mycollects',
    defaultCategories: [...INCOME_PRODUCTS, ...INCOME_SERVICES], // Solo ingresos para cobros sin billetera
    defaultPanels: BUSINESS_PANELS,
    defaultQuestions: BUSINESS_QUESTIONS,
  },
  mypays: {
    type: 'mypays',
    defaultCategories: [...EXPENSES_BUSINESS], // Solo gastos para pagos sin billetera
    defaultPanels: BUSINESS_PANELS,
    defaultQuestions: BUSINESS_QUESTIONS,
  },
  otro: {
    type: 'otro',
    defaultCategories: [...EXPENSES_OTHER, ...INCOME_OTHER],
    defaultPanels: OTHER_PANELS,
    defaultQuestions: OTHER_QUESTIONS,
  }
};
