const RUBRO_KEYWORDS: Record<string, string[]> = {
  // Gastos
  alquiler: ['alquiler', 'expensas', 'casa', 'departamento', 'alquila', 'piso', 'renta'],
  servicios: ['luz', 'agua', 'gas', 'edenor', 'desur', 'aysa', 'metrogas', 'ablu'],
  telefonia: ['internet', 'wifi', 'celular', 'telefono', 'movistar', 'claro', 'personal', 'fibertel', 'telecentro'],
  sueldos: ['sueldo', 'jornal', 'salario', 'nomina', 'aguinaldo', 'bono'],
  mercaderia: ['mercaderia', 'insumo', 'stock', 'materia prima', 'compra'],
  transporte: ['transporte', 'viaje', 'uber', 'taxi', 'colectivo', 'subte', 'pasaje'],
  combustible: ['combustible', 'nafta', 'gasoil', 'gasolina', 'shell', 'ypf', 'axion', 'lubricante'],
  salud: ['salud', 'farmacia', 'medico', 'doctor', 'remedio', 'clinica', 'hospital', 'obra social', 'prepaga'],
  educacion: ['educacion', 'colegio', 'escuela', 'universidad', 'curso', 'cuota', 'matricula'],
  impuestos: ['impuesto', 'tasa', 'afip', 'arba', 'iva', 'ganancias', 'monotributo'],
  seguros: ['seguro', 'poliza', 'sancor', 'rivadavia', 'mapfre'],
  reparaciones: ['reparacion', 'mantenimiento', 'arreglo', 'ferreteria', 'pintura', 'plomero', 'electricista'],
  ocio: ['entretenimiento', 'ocio', 'cine', 'teatro', 'bar', 'restaurante', 'boliche', 'salida', 'netflix', 'spotify', 'disney'],
  bancos: ['banco', 'comision', 'mantenimiento cuenta'],
  multas: ['multa', 'recargo', 'infraccion'],
  comida: ['comida', 'alimento', 'supermercado', 'almacen', 'verduleria', 'carniceria', 'panaderia', 'almuerzo', 'cena', 'desayuno'],
  ropa: ['ropa', 'zapatillas', 'indumentaria', 'vestimenta', 'remera', 'pantalon', 'abrigo'],
  
  // Ingresos
  honorarios: ['honorarios', 'profesional', 'asesoria', 'consultora'],
  ventas_prod: ['venta', 'vendido', 'cobro cliente', 'pedido'],
  servicios_ing: ['servicio', 'consultoria', 'trabajo'],
  sueldo_ing: ['sueldo', 'quincena', 'aguinaldo', 'nomina'],
};

/**
 * Predice el rubro basado en la descripción usando un mapeo de palabras clave.
 * Simula el comportamiento de una IA de clasificación simple.
 */
export const predictRubro = (description: string, type: 'income' | 'expense'): string | null => {
  if (!description || description.length < 3) return null;

  const text = description.toLowerCase();
  
  for (const [rubroId, keywords] of Object.entries(RUBRO_KEYWORDS)) {
    // Verificar si alguna palabra clave está en la descripción
    if (keywords.some(keywords => text.includes(keywords))) {
      // Validar si el rubroId es apropiado para el tipo (income/expense)
      // Algunos IDs son específicos de ingresos (terminan en _ing o son honorarios/ventas)
      if (type === 'income') {
        const incomeSpecific = ['honorarios', 'ventas_prod', 'servicios_ing', 'sueldo_ing', 'intereses', 'regalos'];
        if (incomeSpecific.includes(rubroId) || rubroId.endsWith('_ing')) return rubroId;
      } else {
        const expenseSpecific = [
            'alquiler', 'servicios', 'telefonia', 'sueldos', 'mercaderia', 
            'transporte', 'combustible', 'salud', 'educacion', 'impuestos', 
            'seguros', 'reparaciones', 'ocio', 'bancos', 'multas', 'comida', 'ropa'
        ];
        if (expenseSpecific.includes(rubroId)) return rubroId;
      }
    }
  }

  return null;
};
