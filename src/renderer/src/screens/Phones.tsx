import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { usePhones, usePhonePurchases, usePhoneSaleInfo } from '../hooks/usePhones'
import { formatPKR } from '../../../shared/format'
import type {
  PhoneRow,
  PhoneInput,
  PurchaseRow
} from '../../../shared/api-types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function toPaisa(rupees: string): number {
  const n = parseFloat(rupees)
  return Number.isNaN(n) ? 0 : Math.round(n * 100)
}

function fromPaisa(paisa: number): string {
  return (paisa / 100).toString()
}

function maskImei(imei: string): string {
  if (imei.length < 8) return imei
  return imei.slice(0, 4) + '••••' + imei.slice(-4)
}

function normalizeImei(raw: string): string {
  return raw.replace(/[^0-9]/g, '')
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

const BRANDS = ['iPhone', 'Samsung', 'Xiaomi', 'Oppo', 'Vivo', 'OnePlus', 'Realme', 'Infinix', 'Tecno', 'Huawei', 'Google', 'Other']

const STATUS_CONFIG: Record<PhoneRow['status'], { label: string; classes: string }> = {
  in_stock: { label: 'In Stock', classes: 'bg-green-100 text-green-700' },
  sold: { label: 'Sold', classes: 'bg-gray-200 text-gray-600' },
  returned: { label: 'Returned', classes: 'bg-red-100 text-red-700' }
}

const CONDITION_CONFIG: Record<PhoneRow['condition'], { label: string; classes: string }> = {
  new: { label: 'New', classes: 'bg-blue-100 text-blue-700' },
  used: { label: 'Used', classes: 'bg-orange-100 text-orange-700' }
}

type FilterChip = 'All' | 'iPhone' | 'Android' | 'New' | 'Used' | 'In Stock' | 'Sold'

const CHIP_LIST: FilterChip[] = ['All', 'iPhone', 'Android', 'New', 'Used', 'In Stock', 'Sold']

function isActive(chip: FilterChip, active: Set<FilterChip>): boolean {
  return active.has(chip)
}

function toggleChip(chip: FilterChip, active: Set<FilterChip>): Set<FilterChip> {
  const next = new Set(active)
  if (chip === 'All') return new Set<FilterChip>(['All'])
  next.delete('All')
  if (next.has(chip)) {
    next.delete(chip)
    if (next.size === 0) next.add('All')
  } else {
    next.add(chip)
  }
  return next
}

function matchesChips(phone: PhoneRow, chips: Set<FilterChip>): boolean {
  if (chips.has('All')) return true
  let pass = true
  if (chips.has('iPhone')) pass = pass && phone.brand.toLowerCase() === 'iphone'
  if (chips.has('Android')) pass = pass && phone.brand.toLowerCase() !== 'iphone'
  if (chips.has('New')) pass = pass && phone.condition === 'new'
  if (chips.has('Used')) pass = pass && phone.condition === 'used'
  if (chips.has('In Stock')) pass = pass && phone.status === 'in_stock'
  if (chips.has('Sold')) pass = pass && phone.status === 'sold'
  return pass
}

function searchMatches(phone: PhoneRow, q: string): boolean {
  if (!q) return true
  const norm = normalizeImei(q)
  const normImei = normalizeImei(phone.imei)
  if (normImei.includes(norm)) return true
  const haystack = `${phone.brand} ${phone.model}`.toLowerCase()
  return haystack.includes(q.toLowerCase())
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

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
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

// ─── Phone Form ─────────────────────────────────────────────────────────────

function PhoneForm({
  phone,
  existingImeis,
  onSave,
  onClose
}: {
  phone: PhoneRow | null
  existingImeis: string[]
  onSave: (input: PhoneInput) => Promise<void>
  onClose: () => void
}) {
  const isEdit = !!phone
  const [brand, setBrand] = useState(phone?.brand ?? '')
  const [model, setModel] = useState(phone?.model ?? '')
  const [imeiRaw, setImeiRaw] = useState(phone?.imei ?? '')
  const [condition, setCondition] = useState<'new' | 'used'>(phone?.condition ?? 'new')
  const [storage, setStorage] = useState(phone?.storage ?? '')
  const [ram, setRam] = useState(phone?.ram ?? '')
  const [purchaseRupees, setPurchaseRupees] = useState(
    phone ? fromPaisa(phone.purchase_price_paisa) : ''
  )
  const [saleRupees, setSaleRupees] = useState(
    phone ? fromPaisa(phone.sale_price_paisa) : ''
  )
  const [status, setStatus] = useState<PhoneRow['status']>(phone?.status ?? 'in_stock')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cleanImei = normalizeImei(imeiRaw)
  const purchasePaisa = toPaisa(purchaseRupees)
  const salePaisa = toPaisa(saleRupees)

  const imeiError = useMemo(() => {
    if (!cleanImei) return null
    if (cleanImei.length !== 15) return 'IMEI must be exactly 15 digits'
    const isDupe = existingImeis.some((e) => normalizeImei(e) === cleanImei && e !== phone?.imei)
    if (isDupe) return 'This IMEI already exists in inventory'
    return null
  }, [cleanImei, existingImeis, phone?.imei])

  const priceWarning =
    salePaisa > 0 && purchasePaisa > 0 && salePaisa < purchasePaisa
      ? 'Sale price is below purchase price'
      : null

  const canSubmit =
    brand.trim() &&
    model.trim() &&
    cleanImei.length === 15 &&
    !imeiError &&
    purchasePaisa >= 0 &&
    salePaisa > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      const input: PhoneInput = {
        brand: brand.trim(),
        model: model.trim(),
        imei: cleanImei,
        condition,
        storage: storage.trim() || undefined,
        ram: ram.trim() || undefined,
        purchase_price_paisa: purchasePaisa,
        sale_price_paisa: salePaisa,
        status: isEdit ? status : undefined
      }
      await onSave(input)
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
      {/* Brand + Model */}
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
            placeholder="e.g. iPhone 15 Pro Max"
            className={inputClass}
          />
        </div>
      </div>

      {/* IMEI */}
      <div>
        <label className={labelClass}>IMEI</label>
        <input
          type="text"
          value={imeiRaw}
          onChange={(e) => setImeiRaw(e.target.value.replace(/[^0-9\- ]/g, ''))}
          placeholder="15-digit IMEI number"
          maxLength={20}
          className={inputClass}
          disabled={isEdit}
        />
        {imeiError && <p className="text-red-600 text-xs mt-1">{imeiError}</p>}
      </div>

      {/* Condition */}
      <div>
        <label className={labelClass}>Condition</label>
        <div className="flex gap-2">
          {(['new', 'used'] as const).map((c) => (
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
          <label className={labelClass}>Storage</label>
          <input
            type="text"
            value={storage}
            onChange={(e) => setStorage(e.target.value)}
            placeholder="e.g. 256GB"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>RAM</label>
          <input
            type="text"
            value={ram}
            onChange={(e) => setRam(e.target.value)}
            placeholder="e.g. 8GB"
            className={inputClass}
          />
        </div>
      </div>

      {/* Prices */}
      <div className="grid grid-cols-2 gap-3">
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
        <div>
          <label className={labelClass}>Sale Price (PKR)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={saleRupees}
            onChange={(e) => setSaleRupees(e.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
        </div>
      </div>
      {priceWarning && <p className="text-amber-600 text-xs font-medium">{priceWarning}</p>}

      {/* Status (edit only) */}
      {isEdit && (
        <div>
          <label className={labelClass}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as PhoneRow['status'])} className={inputClass}>
            <option value="in_stock">In Stock</option>
            <option value="sold">Sold</option>
            <option value="returned">Returned</option>
          </select>
        </div>
      )}

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
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Phone'}
        </button>
      </div>
    </form>
  )
}

// ─── Phone Detail Slide-over ────────────────────────────────────────────────

function PhoneDetail({
  phoneId,
  onClose,
  onEdit,
  onDelete
}: {
  phoneId: number
  onClose: () => void
  onEdit: (phone: PhoneRow) => void
  onDelete: (phone: PhoneRow) => void
}) {
  const { data: phone, loading: phoneLoading } = usePhones()
  const { data: purchases } = usePhonePurchases(phoneId)
  const { data: saleInfo } = usePhoneSaleInfo(phoneId)

  const phoneData = useMemo(() => {
    if (!phone) return null
    return phone.find((p) => p.id === phoneId) ?? null
  }, [phone, phoneId])

  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (phoneLoading || !phoneData) {
    return (
      <div
        ref={panelRef}
        className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex items-center justify-center"
      >
        <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    )
  }

  const st = STATUS_CONFIG[phoneData.status]
  const cond = CONDITION_CONFIG[phoneData.condition]

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
            {phoneData.brand} {phoneData.model}
          </h2>
          <p className="text-sm text-gray-500">{phoneData.imei}</p>
        </div>
        <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${st.classes}`}>
          {st.label}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Specs */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Details</h3>
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <DetailRow label="Brand" value={phoneData.brand} />
            <DetailRow label="Model" value={phoneData.model} />
            <DetailRow label="IMEI" value={phoneData.imei} mono />
            <DetailRow
              label="Condition"
              value={
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${cond.classes}`}>
                  {cond.label}
                </span>
              }
            />
            {phoneData.storage && <DetailRow label="Storage" value={phoneData.storage} />}
            {phoneData.ram && <DetailRow label="RAM" value={phoneData.ram} />}
            <DetailRow label="Purchase Price" value={formatPKR(phoneData.purchase_price_paisa)} />
            <DetailRow label="Sale Price" value={formatPKR(phoneData.sale_price_paisa)} bold />
            <DetailRow label="Added" value={formatDate(phoneData.created_at)} />
            {phoneData.updated_at !== phoneData.created_at && (
              <DetailRow label="Last Updated" value={formatDateTime(phoneData.updated_at)} />
            )}
            {phoneData.notes && <DetailRow label="Notes" value={phoneData.notes} />}
          </div>
        </section>

        {/* Purchase history */}
        {purchases && purchases.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Purchase / Intake History
            </h3>
            <div className="space-y-2">
              {purchases.map((pur: PurchaseRow) => (
                <div key={pur.id} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{pur.seller_name}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatPKR(pur.purchase_price_paisa)}
                    </span>
                  </div>
                  {pur.seller_cnic && (
                    <p className="text-xs text-gray-500">CNIC: {pur.seller_cnic}</p>
                  )}
                  {pur.notes && <p className="text-xs text-gray-500 mt-1">{pur.notes}</p>}
                  <p className="text-xs text-gray-400 mt-1">{formatDateTime(pur.created_at)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Sale info */}
        {saleInfo && (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Sale Record
            </h3>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900">
                  Sold to {saleInfo.customer_name}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatPKR(saleInfo.total_paisa)}
                </span>
              </div>
              <p className="text-xs text-gray-500">Receipt: {saleInfo.receipt_number}</p>
              <p className="text-xs text-gray-500">
                Payment: {saleInfo.payment_method.toUpperCase()}
              </p>
              <p className="text-xs text-gray-400 mt-1">{formatDateTime(saleInfo.sold_at)}</p>
            </div>
          </section>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex gap-3 px-5 py-4 border-t border-gray-200">
        <button
          onClick={() => {
            onEdit(phoneData)
            onClose()
          }}
          className="h-11 flex-1 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Edit
        </button>
        <button
          onClick={() => {
            onDelete(phoneData)
            onClose()
          }}
          className="h-11 flex-1 rounded-lg border border-red-300 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          Delete
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

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function Phones(): JSX.Element {
  const { data: phones, loading, error, refetch } = usePhones()
  const [search, setSearch] = useState('')
  const [activeChips, setActiveChips] = useState<Set<FilterChip>>(new Set(['All']))
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPhone, setEditingPhone] = useState<PhoneRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PhoneRow | null>(null)
  const [detailPhoneId, setDetailPhoneId] = useState<number | null>(null)

  const existingImeis = useMemo(() => phones?.map((p) => p.imei) ?? [], [phones])

  const filtered = useMemo(() => {
    if (!phones) return []
    let list = phones
    if (search.trim()) {
      list = list.filter((p) => searchMatches(p, search))
    }
    list = list.filter((p) => matchesChips(p, activeChips))
    return list
  }, [phones, search, activeChips])

  const openAdd = useCallback(() => {
    setEditingPhone(null)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((phone: PhoneRow) => {
    setEditingPhone(phone)
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingPhone(null)
  }, [])

  const handleSave = useCallback(
    async (input: PhoneInput) => {
      if (editingPhone) {
        const res = await window.api.phones.update(editingPhone.id, input)
        if (!res.success) throw new Error(res.error)
      } else {
        const res = await window.api.phones.create(input)
        if (!res.success) throw new Error(res.error)
      }
      refetch()
    },
    [editingPhone, refetch]
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    const res = await window.api.phones.delete(deleteTarget.id)
    if (!res.success) throw new Error(res.error)
    setDeleteTarget(null)
    refetch()
  }, [deleteTarget, refetch])

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-12 bg-white rounded-xl border border-gray-200 animate-pulse" />
        <div className="flex gap-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-9 w-20 bg-gray-200 rounded-full animate-pulse" />
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
        <p className="text-red-600 font-medium">Failed to load phones</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Phones</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {phones?.length ?? 0} phones tracked by IMEI
          </p>
        </div>
        <button
          onClick={openAdd}
          className="h-11 px-5 rounded-lg bg-primary-600 text-sm font-medium text-white hover:bg-primary-700 flex items-center gap-2"
        >
          <PlusIcon />
          Add Phone
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
          placeholder="Search by IMEI or model..."
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {CHIP_LIST.map((chip) => (
          <button
            key={chip}
            onClick={() => setActiveChips(toggleChip(chip, activeChips))}
            className={`h-9 px-4 rounded-full text-sm font-medium transition-colors ${
              isActive(chip, activeChips)
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <p className="text-gray-500 text-sm">
            {search || !activeChips.has('All')
              ? 'No phones match your filters'
              : 'No phones yet. Add your first phone!'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[140px_1fr_140px_80px_90px_120px_100px_48px] gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <span>Brand</span>
            <span>Model</span>
            <span>IMEI</span>
            <span>Cond.</span>
            <span>Specs</span>
            <span className="text-right">Sale Price</span>
            <span>Status</span>
            <span />
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-100">
            {filtered.map((p) => {
              const st = STATUS_CONFIG[p.status]
              const cond = CONDITION_CONFIG[p.condition]
              return (
                <div
                  key={p.id}
                  onClick={() => setDetailPhoneId(p.id)}
                  className="grid grid-cols-[140px_1fr_140px_80px_90px_120px_100px_48px] gap-2 px-4 items-center min-h-[44px] cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900 truncate">{p.brand}</span>
                  <span className="text-sm text-gray-900 truncate">{p.model}</span>
                  <span className="text-sm text-gray-600 font-mono">{maskImei(p.imei)}</span>
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold w-fit ${cond.classes}`}>
                    {cond.label}
                  </span>
                  <span className="text-xs text-gray-500 truncate">
                    {[p.storage, p.ram].filter(Boolean).join(' / ') || '—'}
                  </span>
                  <span className="text-sm text-gray-900 text-right font-medium">
                    {formatPKR(p.sale_price_paisa)}
                  </span>
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold w-fit ${st.classes}`}>
                    {st.label}
                  </span>
                  <div className="flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(p)
                      }}
                      className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                      title="Delete phone"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingPhone ? 'Edit Phone' : 'Add Phone'}
      >
        <PhoneForm
          phone={editingPhone}
          existingImeis={existingImeis}
          onSave={handleSave}
          onClose={closeModal}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Phone"
        message={`Are you sure you want to delete "${deleteTarget?.brand} ${deleteTarget?.model}" (IMEI: ${deleteTarget?.imei})? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Detail Slide-over */}
      {detailPhoneId && (
        <PhoneDetail
          phoneId={detailPhoneId}
          onClose={() => setDetailPhoneId(null)}
          onEdit={(phone) => {
            openEdit(phone)
          }}
          onDelete={(phone) => {
            setDeleteTarget(phone)
          }}
        />
      )}
    </div>
  )
}
