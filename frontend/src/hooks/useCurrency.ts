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

    if (symbol && (!currencyCode || currencyCode === defaultCurrency)) {
       return `${symbol} ${new Intl.NumberFormat('en-US', options).format(num)}`
    }

    options.style = 'currency'
    options.currency = cur

    return new Intl.NumberFormat('en-US', options).format(num)
  }

  return { formatCurrency, defaultCurrency, symbol }
}
