/**
 * Formatea un número como moneda según el locale y la moneda dada.
 * Ej: formatCurrency(1500, 'ARS') => "$1.500,00"
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formatea un porcentaje
 * Ej: formatPercent(0.4) => "40%"
 */
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
