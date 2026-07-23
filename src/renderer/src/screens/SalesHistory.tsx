import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useSales, useSaleItems } from '../hooks/useSales'
import { useCustomers } from '../hooks/useCustomers'
import { formatPKR } from '../../../shared/format'
import type { SaleRow, SaleItemRow } from '../../../shared/api-types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function startOfDay(dateStr: string): Date {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(dateStr: string): Date {
  const d = new Date(dateStr)
  d.setHours(23, 59, 59, 999)
  return d
}

const PAYMENT_METHODS = ['All', 'cash', 'jazzcash', 'easypaisa', 'udhaar'] as const

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa',
  udhaar: 'Udhaar'
}

const PAYMENT_COLORS: Record<string, string> = {
  cash: 'bg-green-100 text-green-700',
  jazzcash: 'bg-purple-100 text-purple-700',
  easypaisa: 'bg-blue-100 text-blue-700',
  udhaar: 'bg-amber-100 text-amber-700'
}

// ─── Icons ──────────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function PrinterIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
      />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  )
}

function SortIcon({ asc }: { asc: boolean }) {
  return (
    <svg className="w-3.5 h-3.5 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={asc ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
      />
    </svg>
  )
}

// ─── Modal ──────────────────────────────────────────────────────────────────

function Modal({
  open,
  onClose,
  title,
  wide,
  children
}: {
  open: boolean
  onClose: () => void
  title: string
  wide?: boolean
  children: React.ReactNode
}) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === backdropRef.current) onClose()
      }}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-h-[90vh] overflow-y-auto ${wide ? 'max-w-2xl' : 'max-w-lg'}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Sale Receipt (print) ──────────────────────────────────────────────────

function SaleReceipt({
  sale,
  customerName,
  items
}: {
  sale: SaleRow
  customerName: string
  items: SaleItemRow[]
}) {
  return (
    <div className="sale-receipt">
      <div className="receipt-content">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900">MOBILE HUB POS</h1>
          <p className="text-sm text-gray-500">Sales Receipt</p>
        </div>

        <div className="border-t border-b border-gray-300 py-4 mb-4 space-y-2">
          <SlipRow label="Receipt" value={sale.receipt_number} />
          <SlipRow label="Date" value={formatDateTime(sale.created_at)} />
          <SlipRow label="Customer" value={customerName} />
          <SlipRow label="Payment" value={PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method} />
        </div>

        <div className="border-b border-gray-300 pb-4 mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Items</p>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{item.description}</p>
                  <p className="text-xs text-gray-500">
                    {item.quantity} x {formatPKR(item.unit_price_paisa)}
                  </p>
                </div>
                <span className="text-sm font-medium shrink-0">
                  {formatPKR(item.line_total_paisa)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1 mb-4">
          <SlipRow label="Subtotal" value={formatPKR(sale.subtotal_paisa)} />
          {sale.discount_paisa > 0 && (
            <SlipRow label="Discount" value={`-${formatPKR(sale.discount_paisa)}`} />
          )}
          <div className="border-t border-gray-300 pt-2 mt-2">
            <SlipRow label="TOTAL" value={formatPKR(sale.total_paisa)} bold />
          </div>
        </div>

        <div className="flex justify-between mt-16 pt-4 border-t border-gray-300">
          <div className="text-center">
            <div className="w-40 border-t border-gray-400 mt-12 pt-1">
              <p className="text-xs text-gray-500">Customer Signature</p>
            </div>
          </div>
          <div className="text-center">
            <div className="w-40 border-t border-gray-400 mt-12 pt-1">
              <p className="text-xs text-gray-500">Authorized Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SlipRow({
  label,
  value,
  bold
}: {
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm text-right ${bold ? 'font-bold' : ''}`}>{value}</span>
    </div>
  )
}

// ─── Detail Modal ───────────────────────────────────────────────────────────

function SaleDetailModal({
  sale,
  customerName,
  onClose,
  onPrint
}: {
  sale: SaleRow
  customerName: string
  onClose: () => void
  onPrint: () => void
}) {
  const { data: items, loading } = useSaleItems(sale.id)

  return (
    <Modal open onClose={onClose} title={`Sale ${sale.receipt_number}`} wide>
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Header info */}
          <div className="grid grid-cols-2 gap-4">
            <InfoBlock label="Receipt" value={sale.receipt_number} />
            <InfoBlock label="Date" value={formatDateTime(sale.created_at)} />
            <InfoBlock label="Customer" value={customerName} />
            <InfoBlock
              label="Payment"
              value={
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${PAYMENT_COLORS[sale.payment_method] ?? 'bg-gray-100 text-gray-700'}`}
                >
                  {PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method}
                </span>
              }
            />
          </div>

          {/* Items */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Items
            </h3>
            {items && items.length > 0 ? (
              <div className="bg-gray-50 rounded-xl overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_60px_100px_110px] gap-2 px-4 py-2.5 bg-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span>Description</span>
                  <span className="text-center">Qty</span>
                  <span className="text-right">Unit Price</span>
                  <span className="text-right">Total</span>
                </div>
                <div className="divide-y divide-gray-200">
                  {items.map((item: SaleItemRow) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[1fr_60px_100px_110px] gap-2 px-4 py-3 items-center"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.description}
                        </p>
                      </div>
                      <span className="text-sm text-gray-600 text-center">{item.quantity}</span>
                      <span className="text-sm text-gray-600 text-right">
                        {formatPKR(item.unit_price_paisa)}
                      </span>
                      <span className="text-sm font-medium text-gray-900 text-right">
                        {formatPKR(item.line_total_paisa)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No items found</p>
            )}
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <TotalsRow label="Subtotal" value={formatPKR(sale.subtotal_paisa)} />
            {sale.discount_paisa > 0 && (
              <TotalsRow label="Discount" value={`-${formatPKR(sale.discount_paisa)}`} />
            )}
            <div className="border-t border-gray-200 pt-2 mt-2">
              <TotalsRow label="Total" value={formatPKR(sale.total_paisa)} bold />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={onPrint}
              className="h-11 px-5 rounded-lg bg-primary-600 text-sm font-medium text-white hover:bg-primary-700 flex items-center gap-2"
            >
              <PrinterIcon />
              Reprint Receipt
            </button>
            <button
              onClick={onClose}
              className="h-11 px-5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function InfoBlock({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <div className="text-sm font-medium text-gray-900">{value}</div>
    </div>
  )
}

function TotalsRow({
  label,
  value,
  bold
}: {
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
        {label}
      </span>
      <span className={`text-sm ${bold ? 'font-bold text-gray-900' : 'text-gray-900'}`}>
        {value}
      </span>
    </div>
  )
}

// ─── Main Screen ────────────────────────────────────────────────────────────

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom'

export default function SalesHistory(): JSX.Element {
  const { data: sales, loading, error, refetch } = useSales()
  const { data: customers } = useCustomers()

  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<string>('All')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [detailSale, setDetailSale] = useState<SaleRow | null>(null)
  const [printTarget, setPrintTarget] = useState<SaleRow | null>(null)
  const [printItems, setPrintItems] = useState<SaleItemRow[]>([])
  const [sortAsc, setSortAsc] = useState(false)

  // Customer name lookup
  const customerMap = useMemo(() => {
    const map = new Map<number, string>()
    if (customers) {
      for (const c of customers) {
        map.set(c.id, c.name)
      }
    }
    return map
  }, [customers])

  function getCustomerName(sale: SaleRow): string {
    if (!sale.customer_id) return 'Walk-in'
    return customerMap.get(sale.customer_id) ?? 'Walk-in'
  }

  // Date range calculation
  const dateRange = useMemo((): { from: Date | null; to: Date | null } => {
    const now = new Date()
    switch (dateFilter) {
      case 'today': {
        const d = new Date(now)
        return { from: startOfDay(toISODate(d)), to: endOfDay(toISODate(d)) }
      }
      case 'week': {
        const d = new Date(now)
        d.setDate(d.getDate() - 7)
        return { from: d, to: now }
      }
      case 'month': {
        const d = new Date(now)
        d.setMonth(d.getMonth() - 1)
        return { from: d, to: now }
      }
      case 'custom': {
        if (!customFrom && !customTo) return { from: null, to: null }
        return {
          from: customFrom ? startOfDay(customFrom) : null,
          to: customTo ? endOfDay(customTo) : null
        }
      }
      default:
        return { from: null, to: null }
    }
  }, [dateFilter, customFrom, customTo])

  // Filtered sales
  const filtered = useMemo(() => {
    if (!sales) return []
    let list = [...sales]

    // Payment filter
    if (paymentFilter !== 'All') {
      list = list.filter((s) => s.payment_method === paymentFilter)
    }

    // Date filter
    if (dateRange.from || dateRange.to) {
      list = list.filter((s) => {
        const d = new Date(s.created_at)
        if (dateRange.from && d < dateRange.from) return false
        if (dateRange.to && d > dateRange.to) return false
        return true
      })
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (s) =>
          s.receipt_number.toLowerCase().includes(q) ||
          getCustomerName(s).toLowerCase().includes(q)
      )
    }

    // Sort by date
    list.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return sortAsc ? dateA - dateB : dateB - dateA
    })

    return list
  }, [sales, paymentFilter, dateRange, search, customerMap, sortAsc])

  // Summary stats
  const summary = useMemo(() => {
    let totalPaisa = 0
    let count = 0
    for (const s of filtered) {
      totalPaisa += s.total_paisa
      count++
    }
    return { totalPaisa, count }
  }, [filtered])

  const handlePrint = useCallback(async (sale: SaleRow) => {
    try {
      const res = await window.api.sales.getItems(sale.id)
      setPrintItems(res.success ? res.data : [])
    } catch {
      setPrintItems([])
    }
    setPrintTarget(sale)
  }, [])

  useEffect(() => {
    if (!printTarget) return
    const timer = setTimeout(() => {
      window.print()
      setPrintTarget(null)
      setPrintItems([])
    }, 200)
    return () => clearTimeout(timer)
  }, [printTarget])

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="flex gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 w-24 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 h-96 animate-pulse" />
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">Failed to load sales</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button
          onClick={refetch}
          className="h-11 mt-4 px-5 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Print receipt (hidden) */}
      {printTarget && (
        <SaleReceipt
          sale={printTarget}
          customerName={getCustomerName(printTarget)}
          items={printItems}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {sales?.length ?? 0} total sales
        </p>
      </div>

      {/* Date range filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <CalendarIcon />
          <span className="font-medium">Period:</span>
        </div>
        {(['all', 'today', 'week', 'month', 'custom'] as DateFilter[]).map((df) => (
          <button
            key={df}
            onClick={() => setDateFilter(df)}
            className={`h-9 px-4 rounded-full text-sm font-medium transition-colors ${
              dateFilter === df
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {df === 'all'
              ? 'All Time'
              : df === 'today'
                ? 'Today'
                : df === 'week'
                  ? 'Last 7 Days'
                  : df === 'month'
                    ? 'Last 30 Days'
                    : 'Custom'}
          </button>
        ))}
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-9 px-3 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-500">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-9 px-3 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}
      </div>

      {/* Payment method chips */}
      <div className="flex gap-2 flex-wrap">
        {PAYMENT_METHODS.map((pm) => (
          <button
            key={pm}
            onClick={() => setPaymentFilter(pm)}
            className={`h-9 px-4 rounded-full text-sm font-medium transition-colors ${
              paymentFilter === pm
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {pm === 'All' ? 'All Methods' : PAYMENT_LABELS[pm] ?? pm}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Filtered Results</p>
          <p className="text-lg font-bold text-gray-900">{summary.count} sales</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Total Amount</p>
          <p className="text-lg font-bold text-primary-700">{formatPKR(summary.totalPaisa)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by receipt number or customer..."
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <p className="text-gray-500 text-sm">
            {search || paymentFilter !== 'All' || dateFilter !== 'all'
              ? 'No sales match your filters'
              : 'No sales yet'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[140px_1fr_1fr_80px_130px_110px] gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <span>Receipt #</span>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="flex items-center hover:text-gray-700 transition-colors"
            >
              Date & Time
              <SortIcon asc={sortAsc} />
            </button>
            <span>Customer</span>
            <span className="text-center">Items</span>
            <span className="text-right">Total</span>
            <span>Payment</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-100">
            {filtered.map((sale) => {
              const pmColor = PAYMENT_COLORS[sale.payment_method] ?? 'bg-gray-100 text-gray-700'
              return (
                <div
                  key={sale.id}
                  onClick={() => setDetailSale(sale)}
                  className="grid grid-cols-[140px_1fr_1fr_80px_130px_110px] gap-2 px-4 items-center min-h-[44px] cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-mono font-medium text-gray-900">
                    {sale.receipt_number}
                  </span>
                  <span className="text-sm text-gray-600 truncate">
                    {formatDateTime(sale.created_at)}
                  </span>
                  <span className="text-sm text-gray-900 truncate">
                    {getCustomerName(sale)}
                  </span>
                  <span className="text-sm text-gray-500 text-center">
                    {sale.item_count}
                  </span>
                  <span className="text-sm text-gray-900 text-right font-medium">
                    {formatPKR(sale.total_paisa)}
                  </span>
                  <span
                    className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit ${pmColor}`}
                  >
                    {PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailSale && (
        <SaleDetailModal
          sale={detailSale}
          customerName={getCustomerName(detailSale)}
          onClose={() => setDetailSale(null)}
          onPrint={() => handlePrint(detailSale)}
        />
      )}
    </div>
  )
}
