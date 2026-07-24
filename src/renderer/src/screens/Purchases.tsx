import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { usePurchasesWithPhone } from '../hooks/usePurchases'
import { useSettings } from '../hooks/useSettings'
import { formatPKR } from '../../../shared/format'
import type { PurchaseWithPhone, PurchaseWithPhoneInput } from '../../../shared/api-types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function toPaisa(rupees: string): number {
  const n = parseFloat(rupees)
  return Number.isNaN(n) ? 0 : Math.round(n * 100)
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return iso
  }
}

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

function validateCnic(raw: string): string | null {
  const digits = raw.replace(/[^0-9]/g, '')
  if (digits.length === 0) return null
  if (digits.length !== 13) return 'CNIC must be exactly 13 digits'
  return null
}

const BRANDS = ['iPhone', 'Samsung', 'Xiaomi', 'Oppo', 'Vivo', 'OnePlus', 'Realme', 'Infinix', 'Tecno', 'Huawei', 'Google', 'Other']

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

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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

function ChevronLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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

// ─── Modal ──────────────────────────────────────────────────────────────────

function Modal({
  open,
  onClose,
  title,
  children
}: {
  open: boolean
  onClose: () => void
  title: string
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
  onConfirm,
  onCancel
}: {
  open: boolean
  title: string
  message: string
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
          className="h-11 px-5 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </Modal>
  )
}

// ─── Purchase Form ──────────────────────────────────────────────────────────

function PurchaseForm({
  onSave,
  onClose
}: {
  onSave: (input: PurchaseWithPhoneInput) => Promise<void>
  onClose: () => void
}) {
  const [sellerName, setSellerName] = useState('')
  const [sellerCnic, setSellerCnic] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [imeiRaw, setImeiRaw] = useState('')
  const [condition, setCondition] = useState<'new' | 'used'>('used')
  const [storage, setStorage] = useState('')
  const [ram, setRam] = useState('')
  const [purchaseRupees, setPurchaseRupees] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cleanImei = imeiRaw.replace(/[^0-9]/g, '')
  const purchasePaisa = toPaisa(purchaseRupees)
  const cnicError = validateCnic(sellerCnic)

  const canSubmit =
    sellerName.trim() &&
    brand.trim() &&
    model.trim() &&
    cleanImei.length === 15 &&
    purchasePaisa > 0 &&
    !cnicError

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      await onSave({
        seller_name: sellerName.trim(),
        seller_cnic: sellerCnic.trim() || undefined,
        brand: brand.trim(),
        model: model.trim(),
        imei: cleanImei,
        condition,
        storage: storage.trim() || undefined,
        ram: ram.trim() || undefined,
        purchase_price_paisa: purchasePaisa,
        notes: notes.trim() || undefined
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full h-11 px-3 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Seller */}
      <div>
        <label className={labelClass}>Seller Name</label>
        <input
          type="text"
          value={sellerName}
          onChange={(e) => setSellerName(e.target.value)}
          placeholder="e.g. Ahmed Khan"
          className={inputClass}
          autoFocus
        />
      </div>
      <div>
        <label className={labelClass}>Seller CNIC (optional)</label>
        <input
          type="text"
          value={sellerCnic}
          onChange={(e) => setSellerCnic(e.target.value.replace(/[^0-9-]/g, ''))}
          placeholder="35202-1234567-1"
          maxLength={15}
          className={inputClass}
        />
        {cnicError && <p className="text-red-600 text-xs mt-1">{cnicError}</p>}
      </div>

      {/* Phone */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Brand</label>
          <select value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass}>
            <option value="">Select brand</option>
            {BRANDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Model</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. iPhone 13"
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>IMEI</label>
        <input
          type="text"
          value={imeiRaw}
          onChange={(e) => setImeiRaw(e.target.value.replace(/[^0-9 ]/g, ''))}
          placeholder="15-digit IMEI number"
          maxLength={20}
          className={inputClass}
        />
        {cleanImei.length > 0 && cleanImei.length !== 15 && (
          <p className="text-red-600 text-xs mt-1">IMEI must be exactly 15 digits ({cleanImei.length}/15)</p>
        )}
      </div>

      {/* Condition */}
      <div>
        <label className={labelClass}>Condition</label>
        <div className="flex gap-2">
          {(['used', 'new'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCondition(c)}
              className={`h-11 flex-1 rounded-lg border text-sm font-medium transition-colors ${
                condition === c
                  ? c === 'new'
                    ? 'bg-blue-50 border-blue-400 text-blue-700'
                    : 'bg-orange-50 border-orange-400 text-orange-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {c === 'new' ? 'New' : 'Used'}
            </button>
          ))}
        </div>
      </div>

      {/* Storage + RAM */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Storage (optional)</label>
          <input
            type="text"
            value={storage}
            onChange={(e) => setStorage(e.target.value)}
            placeholder="e.g. 128GB"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>RAM (optional)</label>
          <input
            type="text"
            value={ram}
            onChange={(e) => setRam(e.target.value)}
            placeholder="e.g. 6GB"
            className={inputClass}
          />
        </div>
      </div>

      {/* Purchase Price */}
      <div>
        <label className={labelClass}>Purchase Price (PKR)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={purchaseRupees}
          onChange={(e) => setPurchaseRupees(e.target.value)}
          placeholder="0.00"
          className={inputClass}
        />
      </div>

      {/* Condition Notes */}
      <div>
        <label className={labelClass}>Condition Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. screen scratch, battery health 84%"
          rows={3}
          className={`${inputClass} h-auto py-2.5 resize-none`}
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onClose}
          className="h-11 px-5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit || saving}
          className="h-11 px-5 rounded-lg bg-primary-600 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Recording...' : 'Record Purchase'}
        </button>
      </div>
    </form>
  )
}

// ─── Purchase Detail Slide-over ─────────────────────────────────────────────

function PurchaseDetail({
  purchase,
  onClose,
  onPrint
}: {
  purchase: PurchaseWithPhone
  onClose: () => void
  onPrint: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      ref={panelRef}
      className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200">
        <button
          onClick={onClose}
          className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <ChevronLeftIcon />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">
            {purchase.brand} {purchase.model}
          </h2>
          <p className="text-sm text-gray-500">{purchase.imei}</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Seller */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Seller Information
          </h3>
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <DetailRow label="Name" value={purchase.seller_name} />
            <DetailRow label="CNIC" value={purchase.seller_cnic ?? '—'} mono />
            <DetailRow label="Purchase Price" value={formatPKR(purchase.purchase_price_paisa)} bold />
            <DetailRow label="Date" value={formatDateTime(purchase.created_at)} />
          </div>
        </section>

        {/* Phone */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Phone Details
          </h3>
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <DetailRow label="Brand" value={purchase.brand} />
            <DetailRow label="Model" value={purchase.model} />
            <DetailRow label="IMEI" value={purchase.imei} mono />
            <DetailRow
              label="Condition"
              value={
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                    purchase.condition === 'new'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {purchase.condition === 'new' ? 'New' : 'Used'}
                </span>
              }
            />
            {purchase.storage && <DetailRow label="Storage" value={purchase.storage} />}
            {purchase.ram && <DetailRow label="RAM" value={purchase.ram} />}
            <DetailRow
              label="Status"
              value={
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    purchase.phone_status === 'in_stock'
                      ? 'bg-green-100 text-green-700'
                      : purchase.phone_status === 'sold'
                        ? 'bg-gray-200 text-gray-600'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {purchase.phone_status === 'in_stock'
                    ? 'In Stock'
                    : purchase.phone_status === 'sold'
                      ? 'Sold'
                      : 'Returned'}
                </span>
              }
            />
            {purchase.notes && <DetailRow label="Condition Notes" value={purchase.notes} />}
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="flex gap-3 px-5 py-4 border-t border-gray-200">
        <button
          onClick={onPrint}
          className="h-11 flex-1 rounded-lg bg-primary-600 text-sm font-medium text-white hover:bg-primary-700 flex items-center justify-center gap-2"
        >
          <PrinterIcon />
          Print Purchase Slip
        </button>
        <button
          onClick={onClose}
          className="h-11 px-5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
  mono,
  bold
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span
        className={`text-sm text-right ${mono ? 'font-mono text-gray-700' : bold ? 'font-semibold text-gray-900' : 'text-gray-900'}`}
      >
        {value}
      </span>
    </div>
  )
}

// ─── Print Slip ─────────────────────────────────────────────────────────────

function PurchaseSlip({ purchase, shopName }: { purchase: PurchaseWithPhone; shopName?: string }) {
  return (
    <div className="purchase-slip">
      <div className="slip-content">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900">{shopName || 'SAKA MOBILES'}</h1>
          <p className="text-sm text-gray-500">Purchase Slip</p>
        </div>

        <div className="border-t border-b border-gray-300 py-4 mb-4 space-y-2">
          <SlipRow label="Date" value={formatDateTime(purchase.created_at)} />
          <SlipRow label="Seller" value={purchase.seller_name} />
          <SlipRow label="CNIC" value={purchase.seller_cnic ?? '—'} />
        </div>

        <div className="border-b border-gray-300 pb-4 mb-4 space-y-2">
          <SlipRow label="Phone" value={`${purchase.brand} ${purchase.model}`} />
          <SlipRow label="IMEI" value={purchase.imei} />
          <SlipRow
            label="Condition"
            value={purchase.condition === 'new' ? 'New' : 'Used'}
          />
          {purchase.storage && <SlipRow label="Storage" value={purchase.storage} />}
          {purchase.ram && <SlipRow label="RAM" value={purchase.ram} />}
          {purchase.notes && <SlipRow label="Notes" value={purchase.notes} />}
        </div>

        <div className="mb-8">
          <SlipRow label="Purchase Price" value={formatPKR(purchase.purchase_price_paisa)} bold />
        </div>

        <div className="flex justify-between mt-16 pt-4 border-t border-gray-300">
          <div className="text-center">
            <div className="w-40 border-t border-gray-400 mt-12 pt-1">
              <p className="text-xs text-gray-500">Seller Signature</p>
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

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function Purchases(): JSX.Element {
  const { data: purchases, loading, error, refetch } = usePurchasesWithPhone()
  const { data: settings } = useSettings()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [detailPurchase, setDetailPurchase] = useState<PurchaseWithPhone | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PurchaseWithPhone | null>(null)
  const [printTarget, setPrintTarget] = useState<PurchaseWithPhone | null>(null)

  const filtered = useMemo(() => {
    if (!purchases) return []
    if (!search.trim()) return purchases
    const q = search.toLowerCase()
    return purchases.filter(
      (p) =>
        p.seller_name.toLowerCase().includes(q) ||
        `${p.brand} ${p.model}`.toLowerCase().includes(q) ||
        p.imei.includes(q.replace(/[^0-9]/g, '')) ||
        (p.seller_cnic && p.seller_cnic.includes(q.replace(/[^0-9]/g, '')))
    )
  }, [purchases, search])

  const handleSave = useCallback(
    async (input: PurchaseWithPhoneInput) => {
      const res = await window.api.purchases.createWithPhone(input)
      if (!res.success) throw new Error(res.error)
      refetch()
    },
    [refetch]
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    const res = await window.api.purchases.delete(deleteTarget.id)
    if (!res.success) throw new Error(res.error)
    setDeleteTarget(null)
    refetch()
  }, [deleteTarget, refetch])

  const handlePrint = useCallback((purchase: PurchaseWithPhone) => {
    setPrintTarget(purchase)
  }, [])

  useEffect(() => {
    if (!printTarget) return
    const timer = setTimeout(() => {
      window.print()
      setPrintTarget(null)
    }, 200)
    return () => clearTimeout(timer)
  }, [printTarget])

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-12 bg-white rounded-xl border border-gray-200 animate-pulse" />
        <div className="bg-white rounded-xl border border-gray-200 h-96 animate-pulse" />
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">Failed to load purchases</p>
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
      {/* Print slip (hidden, rendered only for print) */}
      {printTarget && <PurchaseSlip purchase={printTarget} shopName={settings?.shopName} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {purchases?.length ?? 0} purchase records
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="h-11 px-5 rounded-lg bg-primary-600 text-sm font-medium text-white hover:bg-primary-700 flex items-center gap-2"
        >
          <PlusIcon />
          New Purchase
        </button>
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
          placeholder="Search by seller, model, IMEI, or CNIC..."
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <p className="text-gray-500 text-sm">
            {search
              ? 'No purchases match your search'
              : 'No purchases yet. Record your first phone intake!'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[120px_1fr_1fr_140px_120px_100px] gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <span>Date</span>
            <span>Seller</span>
            <span>Phone</span>
            <span>IMEI</span>
            <span className="text-right">Price</span>
            <span />
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-100">
            {filtered.map((p) => (
              <div
                key={p.id}
                onClick={() => setDetailPurchase(p)}
                className="grid grid-cols-[120px_1fr_1fr_140px_120px_100px] gap-2 px-4 items-center min-h-[44px] cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm text-gray-600">{formatDate(p.created_at)}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.seller_name}</p>
                  {p.seller_cnic && (
                    <p className="text-xs text-gray-400 font-mono truncate">{p.seller_cnic}</p>
                  )}
                </div>
                <span className="text-sm text-gray-900 truncate">
                  {p.brand} {p.model}
                </span>
                <span className="text-sm text-gray-600 font-mono truncate">{p.imei}</span>
                <span className="text-sm text-gray-900 text-right font-medium">
                  {formatPKR(p.purchase_price_paisa)}
                </span>
                <div className="flex justify-end gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePrint(p)
                    }}
                    className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-600"
                    title="Print purchase slip"
                  >
                    <PrinterIcon />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTarget(p)
                    }}
                    className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                    title="Delete purchase"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Purchase Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="New Purchase">
        <PurchaseForm onSave={handleSave} onClose={() => setFormOpen(false)} />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Purchase"
        message={`Are you sure you want to delete the purchase from "${deleteTarget?.seller_name}" for "${deleteTarget?.brand} ${deleteTarget?.model}" (IMEI: ${deleteTarget?.imei})? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Detail Slide-over */}
      {detailPurchase && (
        <PurchaseDetail
          purchase={detailPurchase}
          onClose={() => setDetailPurchase(null)}
          onPrint={() => handlePrint(detailPurchase)}
        />
      )}
    </div>
  )
}
