/**
 * Format cents to display currency.
 * @param cents - integer cents (e.g. 10000 = €100.00)
 * @param currency - ISO currency code (EUR, GBP, USD, etc.)
 * @param locale - BCP 47 locale string (defaults based on currency)
 */
export function formatCurrency(
  cents: number,
  currency: string = 'EUR',
  locale?: string
): string {
  const resolvedLocale = locale ?? getCurrencyLocale(currency)
  return new Intl.NumberFormat(resolvedLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

function getCurrencyLocale(currency: string): string {
  const map: Record<string, string> = {
    EUR: 'de-DE',
    GBP: 'en-GB',
    USD: 'en-US',
    CHF: 'de-CH',
    SEK: 'sv-SE',
    NOK: 'nb-NO',
    DKK: 'da-DK',
    PLN: 'pl-PL',
    CZK: 'cs-CZ',
    RON: 'ro-RO',
    BGN: 'bg-BG',
    HUF: 'hu-HU',
  }
  return map[currency] ?? 'en-US'
}

/**
 * Format a date for display.
 * @param date - Date or ISO string
 * @param locale - BCP 47 locale string (default: 'en-GB')
 */
export function formatDate(
  date: Date | string,
  locale: string = 'en-GB'
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

/**
 * Format a date with time.
 */
export function formatDateTime(
  date: Date | string,
  locale: string = 'en-GB'
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}
