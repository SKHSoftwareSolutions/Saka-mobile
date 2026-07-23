/**
 * Format paisa (integer) to PKR currency string.
 * Example: formatPKR(150000) => "Rs. 1,500.00"
 * Example: formatPKR(500) => "Rs. 5.00"
 */
export function formatPKR(paisa: number): string {
  const rupees = paisa / 100
  return `Rs. ${rupees.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}
