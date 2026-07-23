import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useProducts } from '../hooks/useProducts'
import { formatPKR } from '../../../shared/format'
import type { ProductRow, ProductInput } from '../../../shared/api-types'

const FIXED_CATEGORIES = ['Chargers', 'Cables', 'Covers', 'Glass', 'Headphones', 'Other']

const EMPTY_FORM: ProductInput = {
  name: '',
  category: '',
  purchase_price_paisa: 0,
  sale_price_paisa: 0,
  quantity: 0,
  low_stock_threshold: 5
}

function toPaisa(rupees: string): number {
  const n = parseFloat(rupees)
  return Number.isNaN(n) ? 0 : Math.round(n * 100)
}

function fromPaisa(paisa: number): string {
  return (paisa / 100).toString()
}

// ─── Search Icon ────────────────────────────────────────────────────────────
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

// ─── Modal Overlay ──────────────────────────────────────────────────────────
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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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

// ─── Product Form ───────────────────────────────────────────────────────────
function ProductForm({
  product,
  allCategories,
  onSave,
  onClose
}: {
  product: ProductRow | null
  allCategories: string[]
  onSave: (input: ProductInput) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(product?.name ?? EMPTY_FORM.name)
  const [category, setCategory] = useState(product?.category ?? EMPTY_FORM.category)
  const [purchaseRupees, setPurchaseRupees] = useState(
    product ? fromPaisa(product.purchase_price_paisa) : ''
  )
  const [saleRupees, setSaleRupees] = useState(
    product ? fromPaisa(product.sale_price_paisa) : ''
  )
  const [quantity, setQuantity] = useState(product?.quantity?.toString() ?? '0')
  const [threshold, setThreshold] = useState(product?.low_stock_threshold?.toString() ?? '5')
  const [newCategory, setNewCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const useNewCategory = category === '__new__'
  const effectiveCategory = useNewCategory ? newCategory.trim() : category
  const purchasePaisa = toPaisa(purchaseRupees)
  const salePaisa = toPaisa(saleRupees)
  const qty = parseInt(quantity, 10) || 0
  const thresh = parseInt(threshold, 10) || 0

  const priceWarning =
    salePaisa > 0 && purchasePaisa > 0 && salePaisa < purchasePaisa
      ? 'Sale price is below purchase price'
      : null

  const canSubmit =
    name.trim() && effectiveCategory && purchasePaisa >= 0 && salePaisa >= 0 && qty >= 0 && thresh >= 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      await onSave({
        name: name.trim(),
        category: effectiveCategory,
        purchase_price_paisa: purchasePaisa,
        sale_price_paisa: salePaisa,
        quantity: qty,
        low_stock_threshold: thresh
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
      {/* Name */}
      <div>
        <label className={labelClass}>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Samsung 25W Charger"
          className={inputClass}
          autoFocus
        />
      </div>

      {/* Category */}
      <div>
        <label className={labelClass}>Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputClass}
        >
          <option value="">Select a category</option>
          {allCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value="__new__">+ Add new category</option>
        </select>
        {useNewCategory && (
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Enter new category name"
            className={`${inputClass} mt-2`}
            autoFocus
          />
        )}
      </div>

      {/* Prices row */}
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
      {priceWarning && (
        <p className="text-amber-600 text-xs font-medium">{priceWarning}</p>
      )}

      {/* Quantity + Threshold row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Quantity</label>
          <input
            type="number"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Low Stock Threshold</label>
          <input
            type="number"
            min="0"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}

      {/* Actions */}
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
          {saving ? 'Saving...' : product ? 'Save Changes' : 'Add Item'}
        </button>
      </div>
    </form>
  )
}

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function Accessories(): JSX.Element {
  const { data: products, loading, error, refetch } = useProducts()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null)

  // Build category list from fixed set + data
  const categories = useMemo(() => {
    if (!products) return FIXED_CATEGORIES
    const fromData = new Set(products.map((p) => p.category))
    const merged: string[] = []
    for (const c of FIXED_CATEGORIES) {
      merged.push(c)
      fromData.delete(c)
    }
    for (const c of fromData) merged.push(c)
    return merged
  }, [products])

  // Filtered products
  const filtered = useMemo(() => {
    if (!products) return []
    let list = products
    if (activeCategory !== 'All') {
      list = list.filter((p) => p.category === activeCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      )
    }
    return list
  }, [products, activeCategory, search])

  const openAdd = useCallback(() => {
    setEditingProduct(null)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((product: ProductRow) => {
    setEditingProduct(product)
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingProduct(null)
  }, [])

  const handleSave = useCallback(
    async (input: ProductInput) => {
      if (editingProduct) {
        const res = await window.api.products.update(editingProduct.id, input)
        if (!res.success) throw new Error(res.error)
      } else {
        const res = await window.api.products.create(input)
        if (!res.success) throw new Error(res.error)
      }
      refetch()
    },
    [editingProduct, refetch]
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    const res = await window.api.products.delete(deleteTarget.id)
    if (!res.success) throw new Error(res.error)
    setDeleteTarget(null)
    refetch()
  }, [deleteTarget, refetch])

  // ── Loading / Error ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-12 bg-white rounded-xl border border-gray-200 animate-pulse" />
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-9 w-20 bg-gray-200 rounded-full animate-pulse" />
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 h-96 animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">Failed to load accessories</p>
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accessories</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {products?.length ?? 0} items in inventory
          </p>
        </div>
        <button
          onClick={openAdd}
          className="h-11 px-5 rounded-lg bg-primary-600 text-sm font-medium text-white hover:bg-primary-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Item
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
          placeholder="Search by name or category..."
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory('All')}
          className={`h-9 px-4 rounded-full text-sm font-medium transition-colors ${
            activeCategory === 'All'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`h-9 px-4 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <p className="text-gray-500 text-sm">
            {search || activeCategory !== 'All'
              ? 'No items match your filters'
              : 'No accessories yet. Add your first item!'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_120px_80px_120px_120px_64px] gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <span>Name</span>
            <span>Category</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Purchase</span>
            <span className="text-right">Sale</span>
            <span />
          </div>

          {/* Table rows */}
          <div className="divide-y divide-gray-100">
            {filtered.map((p) => {
              const isLow = p.quantity <= p.low_stock_threshold
              return (
                <div
                  key={p.id}
                  onClick={() => openEdit(p)}
                  className={`grid grid-cols-[1fr_120px_80px_120px_120px_64px] gap-2 px-4 items-center min-h-[44px] cursor-pointer transition-colors ${
                    isLow ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-gray-600 truncate">{p.category}</span>
                    {isLow && (
                      <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                        Low
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-900 text-right font-medium">{p.quantity}</span>
                  <span className="text-sm text-gray-600 text-right">{formatPKR(p.purchase_price_paisa)}</span>
                  <span className="text-sm text-gray-900 text-right font-medium">
                    {formatPKR(p.sale_price_paisa)}
                  </span>
                  <div className="flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(p)
                      }}
                      className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                      title="Delete item"
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
              )
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingProduct ? 'Edit Item' : 'Add Item'}
      >
        <ProductForm
          product={editingProduct}
          allCategories={categories}
          onSave={handleSave}
          onClose={closeModal}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Item"
        message={`Are you sure you want to delete "${deleteTarget?.name ?? ''}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
