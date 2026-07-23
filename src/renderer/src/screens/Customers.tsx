import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useCustomersWithBalance } from '../hooks/useCustomers'
import { formatPKR } from '../../../shared/format'
import type {
  CustomerWithBalance,
  SaleRow,
  CustomerPaymentRow
} from '../../../shared/api-types'

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

const PAYMENT_METHODS = ['cash', 'jazzcash', 'easypaisa'] as const

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa'
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

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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

// ─── Confirm Dialog ─────────────────────────────────────────────────────────

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="h-11 px-5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="h-11 px-5 rounded-lg bg-primary-600 text-sm font-medium text-white hover:bg-primary-700"
        >
          {confirmLabel ?? 'Confirm'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Customer Form ──────────────────────────────────────────────────────────

function CustomerForm({
  customer,
  onSave,
  onClose
}: {
  customer?: { id: number; name: string; phone_number: string | null }
  onSave: (name: string, phone: string) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(customer?.name ?? '')
  const [phone, setPhone] = useState(customer?.phone_number ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = name.trim().length > 0 && !saving

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      await onSave(name.trim(), phone.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save customer')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full h-11 px-3 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div>
        <label className={labelClass}>Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Customer name"
          className={inputClass}
          autoFocus
        />
      </div>

      <div>
        <label className={labelClass}>Phone Number</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="03XX XXXXXXX"
          className={inputClass}
        />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button
          onClick={onClose}
          className="h-11 px-5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="h-11 px-5 rounded-lg bg-primary-600 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : customer ? 'Update Customer' : 'Add Customer'}
        </button>
      </div>
    </div>
  )
}

// ─── Receive Payment Modal ──────────────────────────────────────────────────

function ReceivePaymentModal({
  customer,
  onClose,
  onSaved
}: {
  customer: CustomerWithBalance
  onClose: () => void
  onSaved: () => void
}) {
  const [amountRupees, setAmountRupees] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const amountPaisa = Math.round(parseFloat(amountRupees || '0') * 100)
  const canSubmit = amountPaisa > 0 && !saving
  const isOverpayment =
    customer.outstanding_paisa > 0 && amountPaisa > customer.outstanding_paisa

  const doSubmit = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await window.api.payments.create({
        customer_id: customer.id,
        amount_paisa: amountPaisa,
        payment_method: paymentMethod as 'cash' | 'jazzcash' | 'easypaisa',
        notes: notes.trim() || undefined
      })
      if (!res.success) throw new Error(res.error)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    if (isOverpayment) {
      setShowConfirm(true)
    } else {
      doSubmit()
    }
  }

  const inputClass =
    'w-full h-11 px-3 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <>
      <Modal open onClose={onClose} title="Receive Payment">
        <div className="space-y-4">
          {/* Customer info */}
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{customer.name}</p>
              <p className="text-xs text-gray-500">Outstanding balance</p>
            </div>
            <p className="text-lg font-bold text-red-600">
              {formatPKR(customer.outstanding_paisa)}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className={labelClass}>Amount (Rs.) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              placeholder="0.00"
              className={inputClass}
              autoFocus
            />
          </div>

          <div>
            <label className={labelClass}>Payment Method</label>
            <div className="flex gap-2">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm}
                  onClick={() => setPaymentMethod(pm)}
                  className={`h-10 px-4 rounded-full text-sm font-medium transition-colors ${
                    paymentMethod === pm
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {PAYMENT_LABELS[pm]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Note (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Payment for receipt R-..."
              className={inputClass}
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={onClose}
              className="h-11 px-5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="h-11 px-5 rounded-lg bg-primary-600 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={showConfirm}
        title="Confirm Overpayment"
        message={`Payment of ${formatPKR(amountPaisa)} exceeds the outstanding balance of ${formatPKR(customer.outstanding_paisa)}. This will create a credit balance of ${formatPKR(amountPaisa - customer.outstanding_paisa)}. Continue?`}
        confirmLabel="Confirm Payment"
        onConfirm={() => {
          setShowConfirm(false)
          doSubmit()
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}

// ─── Customer Detail (slide-over) ──────────────────────────────────────────

type TimelineEntry = {
  key: string
  type: 'sale' | 'payment'
  date: string
  reference: string | null
  amount: number
  paymentMethod: string | null
  notes: string | null
  runningBalance: number
}

function CustomerDetail({
  customer,
  onClose,
  onReceivePayment
}: {
  customer: CustomerWithBalance
  onClose: () => void
  onReceivePayment: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [sales, setSales] = useState<SaleRow[]>([])
  const [payments, setPayments] = useState<CustomerPaymentRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([
      window.api.sales.getByCustomer(customer.id),
      window.api.payments.getByCustomer(customer.id)
    ])
      .then(([salesRes, paymentsRes]) => {
        if (cancelled) return
        setSales(salesRes.success ? salesRes.data : [])
        setPayments(paymentsRes.success ? paymentsRes.data : [])
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [customer.id])

  const timeline = useMemo((): TimelineEntry[] => {
    const entries: TimelineEntry[] = []

    for (const sale of sales) {
      if (sale.payment_method !== 'udhaar') continue
      entries.push({
        key: `sale-${sale.id}`,
        type: 'sale',
        date: sale.created_at,
        reference: sale.receipt_number,
        amount: sale.total_paisa,
        paymentMethod: sale.payment_method,
        notes: null,
        runningBalance: 0
      })
    }

    for (const payment of payments) {
      entries.push({
        key: `payment-${payment.id}`,
        type: 'payment',
        date: payment.created_at,
        reference: null,
        amount: -payment.amount_paisa,
        paymentMethod: payment.payment_method,
        notes: payment.notes,
        runningBalance: 0
      })
    }

    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let balance = 0
    for (const entry of entries) {
      balance += entry.amount
      entry.runningBalance = balance
    }

    return entries
  }, [sales, payments])

  return (
    <div
      ref={panelRef}
      className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 shrink-0">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <ChevronLeftIcon />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">{customer.name}</h2>
          {customer.phone_number && (
            <p className="text-sm text-gray-500">{customer.phone_number}</p>
          )}
        </div>
        <button
          onClick={onReceivePayment}
          className="h-10 px-4 rounded-lg bg-primary-600 text-sm font-medium text-white hover:bg-primary-700 flex items-center gap-2 shrink-0"
        >
          <PlusIcon />
          Receive Payment
        </button>
      </div>

      {/* Balance card */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Outstanding Balance</p>
        <p
          className={`text-2xl font-bold ${customer.outstanding_paisa > 0 ? 'text-red-600' : 'text-green-600'}`}
        >
          {customer.outstanding_paisa > 0
            ? formatPKR(customer.outstanding_paisa)
            : 'Settled'}
        </p>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : timeline.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500 text-sm">No udhaar history yet</p>
          </div>
        ) : (
          <div className="p-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              History ({timeline.length})
            </h3>
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_90px_120px_120px] gap-2 px-4 py-2.5 bg-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span>Date</span>
                <span>Type</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Balance</span>
              </div>
              <div className="divide-y divide-gray-200">
                {timeline.map((entry) => (
                  <div
                    key={entry.key}
                    className="grid grid-cols-[1fr_90px_120px_120px] gap-2 px-4 py-3 items-center"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {formatDateTime(entry.date)}
                      </p>
                      {entry.reference && (
                        <p className="text-xs text-gray-500 truncate">{entry.reference}</p>
                      )}
                      {entry.notes && (
                        <p className="text-xs text-gray-400 truncate italic">{entry.notes}</p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit ${
                        entry.type === 'sale'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {entry.type === 'sale' ? 'Udhaar' : PAYMENT_LABELS[entry.paymentMethod ?? ''] ?? 'Payment'}
                    </span>
                    <span
                      className={`text-sm font-medium text-right ${
                        entry.type === 'sale' ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {entry.type === 'sale' ? '+' : '-'}
                      {formatPKR(Math.abs(entry.amount))}
                    </span>
                    <span
                      className={`text-sm font-medium text-right ${
                        entry.runningBalance > 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {formatPKR(Math.abs(entry.runningBalance))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function Customers(): JSX.Element {
  const { data: customers, loading, error, refetch } = useCustomersWithBalance()

  const [search, setSearch] = useState('')
  const [detailCustomer, setDetailCustomer] = useState<CustomerWithBalance | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [detailVersion, setDetailVersion] = useState(0)

  const filtered = useMemo(() => {
    if (!customers) return []
    let list = [...customers]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone_number && c.phone_number.includes(q))
      )
    }

    list.sort((a, b) => b.outstanding_paisa - a.outstanding_paisa)

    return list
  }, [customers, search])

  const summary = useMemo(() => {
    if (!customers) return { totalOutstanding: 0, withBalance: 0, total: 0 }
    let totalOutstanding = 0
    let withBalance = 0
    for (const c of customers) {
      totalOutstanding += c.outstanding_paisa
      if (c.outstanding_paisa > 0) withBalance++
    }
    return { totalOutstanding, withBalance, total: customers.length }
  }, [customers])

  useEffect(() => {
    if (detailCustomer && customers) {
      const updated = customers.find((c) => c.id === detailCustomer.id)
      if (updated) setDetailCustomer(updated)
    }
  }, [customers])

  const handleCreateCustomer = useCallback(
    async (name: string, phone: string) => {
      const res = await window.api.customers.create({
        name,
        phone_number: phone || undefined
      })
      if (!res.success) throw new Error(res.error)
      refetch()
    },
    [refetch]
  )

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="flex gap-3">
          {[...Array(2)].map((_, i) => (
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
        <p className="text-red-600 font-medium">Failed to load customers</p>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers (Udhaar)</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {summary.total} customers, {summary.withBalance} with outstanding balance
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="h-11 px-5 rounded-lg bg-primary-600 text-sm font-medium text-white hover:bg-primary-700 flex items-center gap-2"
        >
          <PlusIcon />
          New Customer
        </button>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Total Customers</p>
          <p className="text-lg font-bold text-gray-900">{summary.total}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Total Outstanding</p>
          <p className="text-lg font-bold text-red-600">{formatPKR(summary.totalOutstanding)}</p>
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
          placeholder="Search by name or phone..."
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <p className="text-gray-500 text-sm">
            {search ? 'No customers match your search' : 'No customers yet'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-[1fr_180px_150px] gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <span>Name</span>
            <span>Phone</span>
            <span className="text-right">Outstanding</span>
          </div>

          <div className="divide-y divide-gray-100">
            {filtered.map((customer) => (
              <div
                key={customer.id}
                onClick={() => setDetailCustomer(customer)}
                className="grid grid-cols-[1fr_180px_150px] gap-2 px-4 items-center min-h-[44px] cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900 truncate">
                  {customer.name}
                </span>
                <span className="text-sm text-gray-600 truncate">
                  {customer.phone_number ?? '\u2014'}
                </span>
                <span
                  className={`text-sm font-medium text-right ${
                    customer.outstanding_paisa > 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {customer.outstanding_paisa > 0
                    ? formatPKR(customer.outstanding_paisa)
                    : 'Settled'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      <Modal open={showNewForm} onClose={() => setShowNewForm(false)} title="New Customer">
        <CustomerForm onSave={handleCreateCustomer} onClose={() => setShowNewForm(false)} />
      </Modal>

      {/* Customer Detail Slide-over */}
      {detailCustomer && (
        <CustomerDetail
          key={`detail-${detailCustomer.id}-${detailVersion}`}
          customer={detailCustomer}
          onClose={() => setDetailCustomer(null)}
          onReceivePayment={() => setShowPaymentModal(true)}
        />
      )}

      {/* Receive Payment Modal */}
      {showPaymentModal && detailCustomer && (
        <ReceivePaymentModal
          customer={detailCustomer}
          onClose={() => setShowPaymentModal(false)}
          onSaved={() => {
            refetch()
            setShowPaymentModal(false)
            setDetailVersion((v) => v + 1)
          }}
        />
      )}
    </div>
  )
}
