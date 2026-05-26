export const PERSONAL_QUESTIONS = [
  'Como funcionan las transferencias en peIApp',
  'Resumen de cobros pendientes para los próximos 7 días',
  'Consejos para ahorrar en esta billetera',
  'Cuales fueron mis mayores gastos en este mes',
  'Que gastos extras tuve este mes respecto al mes anterior',
];

export const BUSINESS_QUESTIONS = [
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

export const COMMUNITY_QUESTIONS = [
  'Como funcionan las transferencias en peIApp',
  'Resumen de cobros pendientes para los próximos 7 días',
];

export const OTHER_QUESTIONS = [
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

export const WALLET_AI_QUESTIONS_MAP: Record<string, string[]> = {
  personal: PERSONAL_QUESTIONS,
  business: BUSINESS_QUESTIONS,
  products: BUSINESS_QUESTIONS,
  services: BUSINESS_QUESTIONS,
  negocio_productos: BUSINESS_QUESTIONS,
  negocio_servicios: BUSINESS_QUESTIONS,
  shared: COMMUNITY_QUESTIONS,
  community: COMMUNITY_QUESTIONS,
  mycollects: BUSINESS_QUESTIONS,
  mypays: BUSINESS_QUESTIONS,
  otro: OTHER_QUESTIONS,
};
