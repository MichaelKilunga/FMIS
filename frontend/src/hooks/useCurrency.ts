import { useSettingsStore } from '../store'

export function useCurrency() {
  const { settings } = useSettingsStore()
  
  const defaultCurrency = (settings['currency.default'] as string) || 'USD'
  const symbol = (settings['currency.symbol'] as string) || ''

  const formatCurrency = (amount: number | string | undefined | null, currencyCode?: string, compact?: boolean) => {
    if (amount === null || amount === undefined) return '--'
    const num = Number(amount)
    if (isNaN(num)) return '--'

    const cur = currencyCode || defaultCurrency

    const options: Intl.NumberFormatOptions = {
        minimumFractionDigits: compact ? 1 : 2,
        maximumFractionDigits: compact ? 1 : 2,
    }

    if (compact) {
        options.notation = 'compact'
    }

    // Only use custom symbol logic if global symbol is defined AND 
    // either no specific currency was requested OR it matches our default
    if (symbol.trim() && (!currencyCode || currencyCode === defaultCurrency)) {
       return `${symbol.trim()} ${new Intl.NumberFormat('en-US', options).format(num)}`
    }

    // Standard currency formatting (e.g., $1,000.00 or TZS 1,000.00)
    options.style = 'currency'
    options.currency = cur

    return new Intl.NumberFormat('en-US', options).format(num)
  }

  return { formatCurrency, defaultCurrency, symbol }
}
