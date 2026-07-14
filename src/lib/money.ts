// Central money formatter. Prefixes the base currency symbol (defaults to
// "Rs" — Sri Lanka Rupee, matching Kadahapola's operations) and enforces
// two decimal places. Kept simple: no multi-currency shopping yet.
//
// Callers pass a value; we render "Rs 1,234,567.89". For non-money numeric
// displays keep using toLocaleString() directly.

export function formatMoney(v: number | null | undefined, opts?: { unit?: string; decimals?: number }): string {
  const unit = opts?.unit ?? 'Rs'
  const decimals = opts?.decimals ?? 2
  const n = Number(v ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `${unit} ${n}`
}
