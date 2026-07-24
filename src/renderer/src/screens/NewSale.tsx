import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useProducts } from '../hooks/useProducts'
import { usePhones } from '../hooks/usePhones'
import { useCustomers } from '../hooks/useCustomers'
import { useSettings } from '../hooks/useSettings'
import { formatPKR } from '../../../shared/format'
import type { SaleInput, SaleRow, SaleItemRow } from '../../../shared/api-types'

interface CartItem {
  id: string
  type: 'product' | 'phone'
  productId?: number
  phoneId?: number
  description: string
  unitPricePaisa: number
  quantity: number
  maxQuantity: number
}

const PAYMENT_METHODS = ['cash', 'jazzcash', 'easypaisa', 'udhaar'] as const
const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa',
  udhaar: 'Udhaar (Credit)'
}

function ReceiptRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm text-right ${bold ? 'font-bold' : ''}`}>{value}</span>
    </div>
  )
}

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

export default function NewSale(): JSX.Element {
  const { data: products, loading: loadingProducts } = useProducts()
  const { data: phones, loading: loadingPhones } = usePhones()
  const { data: customers } = useCustomers()
  const { data: settings } = useSettings()

  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'products' | 'phones'>('products')
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [discountRupees, setDiscountRupees] = useState('')
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [completedSale, setCompletedSale] = useState<SaleRow | null>(null)
  const [completedItems, setCompletedItems] = useState<SaleItemRow[]>([])
  const [completedCustomer, setCompletedCustomer] = useState('Walk-in')

  const discountPaisa = useMemo(() => {
    const n = parseFloat(discountRupees)
    return Number.isNaN(n) ? 0 : Math.round(n * 100)
  }, [discountRupees])

  const subtotalPaisa = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPricePaisa * item.quantity, 0),
    [cart]
  )
  const totalPaisa = Math.max(0, subtotalPaisa - discountPaisa)

  const addToCart = useCallback(
    (item: CartItem) => {
      setCart((prev) => {
        const existing = prev.find((c) => c.id === item.id)
        if (existing) {
          if (existing.quantity >= existing.maxQuantity) return prev
          return prev.map((c) =>
            c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
          )
        }
        return [...prev, { ...item, quantity: 1 }]
      })
    },
    []
  )

  const updateQty = useCallback((id: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.id === id ? { ...c, quantity: Math.max(0, qty) } : c))
        .filter((c) => c.quantity > 0)
    )
  }, [])

  const removeItem = useCallback((id: string) => {
    setCart((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const filteredProducts = useMemo(() => {
    if (!products) return []
    if (!search.trim()) return products.filter((p) => p.quantity > 0)
    const q = search.toLowerCase()
    return products.filter(
      (p) =>
        p.quantity > 0 &&
        (p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
    )
  }, [products, search])

  const filteredPhones = useMemo(() => {
    if (!phones) return []
    const inStock = phones.filter((p) => p.status === 'in_stock')
    if (!search.trim()) return inStock
    const q = search.toLowerCase()
    return inStock.filter(
      (p) =>
        p.brand.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        p.imei.includes(q)
    )
  }, [phones, search])

  const handleCreateCustomer = useCallback(async () => {
    if (!newCustomerName.trim()) return
    const res = await window.api.customers.create({
      name: newCustomerName.trim(),
      phone_number: newCustomerPhone.trim() || undefined
    })
    if (res.success) {
      setSelectedCustomer(res.data.id)
      setShowCustomerModal(false)
      setNewCustomerName('')
      setNewCustomerPhone('')
    }
  }, [newCustomerName, newCustomerPhone])

  const handleSubmit = useCallback(async () => {
    if (cart.length === 0) return
    setSubmitting(true)
    setError('')
    try {
      const input: SaleInput = {
        subtotal_paisa: subtotalPaisa,
        discount_paisa: discountPaisa,
        total_paisa: totalPaisa,
        payment_method: paymentMethod as SaleInput['payment_method'],
        items: cart.map((item) => ({
          product_id: item.productId,
          phone_id: item.phoneId,
          description: item.description,
          quantity: item.quantity,
          unit_price_paisa: item.unitPricePaisa,
          line_total_paisa: item.unitPricePaisa * item.quantity
        }))
      }
      if (selectedCustomer) {
        input.customer_id = selectedCustomer
      }
      const res = await window.api.sales.create(input)
      if (!res.success) {
        setError(res.error)
        return
      }
      const sale = res.data
      const itemsRes = await window.api.sales.getItems(sale.id)
      const custName = selectedCustomer && customers
        ? customers.find((c) => c.id === selectedCustomer)?.name ?? 'Walk-in'
        : 'Walk-in'
      setCompletedSale(sale)
      setCompletedItems(itemsRes.success ? itemsRes.data : [])
      setCompletedCustomer(custName)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }, [cart, subtotalPaisa, discountPaisa, totalPaisa, paymentMethod, selectedCustomer])

  if (loadingProducts || loadingPhones) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="flex gap-4">
          <div className="flex-1 bg-white rounded-xl border border-gray-200 h-96 animate-pulse" />
          <div className="w-80 bg-white rounded-xl border border-gray-200 h-96 animate-pulse" />
        </div>
      </div>
    )
  }

  if (completedSale) {
    const handleNewSale = () => {
      setCart([])
      setSelectedCustomer(null)
      setDiscountRupees('')
      setPaymentMethod('cash')
      setCompletedSale(null)
      setCompletedItems([])
    }
    return (
      <div className="space-y-4">
        {/* Printable receipt (hidden on screen) */}
        <div className="sale-receipt">
          <div className="receipt-content">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-gray-900">{settings?.shopName || 'SAKA MOBILES'}</h1>
              <p className="text-sm text-gray-500">Sales Receipt</p>
            </div>
            <div className="border-t border-b border-gray-300 py-4 mb-4 space-y-2">
              <ReceiptRow label="Receipt" value={completedSale.receipt_number} />
              <ReceiptRow label="Date" value={new Date(completedSale.created_at).toLocaleString('en-PK')} />
              <ReceiptRow label="Customer" value={completedCustomer} />
              <ReceiptRow label="Payment" value={PAYMENT_LABELS[completedSale.payment_method] ?? completedSale.payment_method} />
            </div>
            <div className="border-b border-gray-300 pb-4 mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Items</p>
              <div className="space-y-2">
                {completedItems.map((item) => (
                  <div key={item.id} className="flex justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{item.description}</p>
                      <p className="text-xs text-gray-500">{item.quantity} x {formatPKR(item.unit_price_paisa)}</p>
                    </div>
                    <span className="text-sm font-medium shrink-0">{formatPKR(item.line_total_paisa)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1 mb-4">
              <ReceiptRow label="Subtotal" value={formatPKR(completedSale.subtotal_paisa)} />
              {completedSale.discount_paisa > 0 && (
                <ReceiptRow label="Discount" value={`-${formatPKR(completedSale.discount_paisa)}`} />
              )}
              <div className="border-t border-gray-300 pt-2 mt-2">
                <ReceiptRow label="TOTAL" value={formatPKR(completedSale.total_paisa)} bold />
              </div>
            </div>
            {settings?.receiptFooter && (
              <div className="mt-6 pt-4 border-t border-gray-300">
                <p className="text-xs text-gray-500 text-center whitespace-pre-line">{settings.receiptFooter}</p>
              </div>
            )}
          </div>
        </div>

        {/* On-screen completion view */}
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Sale Completed!</h2>
            <p className="text-gray-500 text-sm mt-1">Receipt: {completedSale.receipt_number}</p>
            <p className="text-gray-900 font-bold text-lg mt-2">{formatPKR(completedSale.total_paisa)}</p>
            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={() => window.print()}
                className="h-11 px-6 rounded-lg bg-primary-600 text-sm font-medium text-white hover:bg-primary-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Receipt
              </button>
              <button
                onClick={handleNewSale}
                className="h-11 px-6 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                New Sale
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Sale</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {cart.length} item{cart.length !== 1 ? 's' : ''} in cart
          </p>
        </div>
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="h-10 px-4 rounded-lg border border-red-300 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Clear Cart
          </button>
        )}
      </div>

      {/* Main layout */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Product/Phone Browser */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Tabs */}
          <div className="flex gap-2 mb-3 shrink-0">
            <button
              onClick={() => setActiveTab('products')}
              className={`h-9 px-4 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'products'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Accessories ({filteredProducts.length})
            </button>
            <button
              onClick={() => setActiveTab('phones')}
              className={`h-9 px-4 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'phones'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Phones ({filteredPhones.length})
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === 'products' ? 'Search accessories...' : 'Search by brand, model, or IMEI...'}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Items grid */}
          <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200">
            {activeTab === 'products' ? (
              filteredProducts.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-gray-500">
                  No accessories in stock
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-3">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() =>
                        addToCart({
                          id: `product-${p.id}`,
                          type: 'product',
                          productId: p.id,
                          description: p.name,
                          unitPricePaisa: p.sale_price_paisa,
                          quantity: 0,
                          maxQuantity: p.quantity
                        })
                      }
                      className="text-left p-3 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.category}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-bold text-primary-700">
                          {formatPKR(p.sale_price_paisa)}
                        </span>
                        <span className="text-xs text-gray-400">Qty: {p.quantity}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : filteredPhones.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm text-gray-500">
                No phones in stock
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 p-3">
                {filteredPhones.map((p) => (
                  <button
                    key={p.id}
                    onClick={() =>
                      addToCart({
                        id: `phone-${p.id}`,
                        type: 'phone',
                        phoneId: p.id,
                        description: `${p.brand} ${p.model} (${p.imei})`,
                        unitPricePaisa: p.sale_price_paisa,
                        quantity: 0,
                        maxQuantity: 1
                      })
                    }
                    className="text-left p-3 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {p.brand} {p.model}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          IMEI: {p.imei} | {p.condition === 'new' ? 'New' : 'Used'}
                          {p.storage ? ` | ${p.storage}` : ''}
                          {p.ram ? ` | ${p.ram} RAM` : ''}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-primary-700 shrink-0">
                        {formatPKR(p.sale_price_paisa)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart + Checkout */}
        <div className="w-80 shrink-0 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Cart items */}
          <div className="px-4 py-3 border-b border-gray-200 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900">Cart</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
            {cart.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-xs text-gray-400">
                Click items to add to cart
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 p-2 rounded-lg bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{item.description}</p>
                    <p className="text-xs text-gray-500">{formatPKR(item.unitPricePaisa)} each</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => updateQty(item.id, item.quantity - 1)}
                      className="w-6 h-6 flex items-center justify-center rounded bg-gray-200 text-gray-600 hover:bg-gray-300 text-xs"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.maxQuantity}
                      className="w-6 h-6 flex items-center justify-center rounded bg-gray-200 text-gray-600 hover:bg-gray-300 text-xs disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-gray-900">
                      {formatPKR(item.unitPricePaisa * item.quantity)}
                    </p>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout section */}
          <div className="border-t border-gray-200 px-4 py-3 space-y-3 shrink-0">
            {/* Customer */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Customer</label>
              <div className="flex gap-2">
                <select
                  value={selectedCustomer ?? ''}
                  onChange={(e) =>
                    setSelectedCustomer(e.target.value ? Number(e.target.value) : null)
                  }
                  className="flex-1 h-9 px-3 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Walk-in</option>
                  {customers?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowCustomerModal(true)}
                  className="h-9 px-3 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
                  title="Add new customer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Payment method */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
              <div className="grid grid-cols-2 gap-1.5">
                {PAYMENT_METHODS.map((pm) => (
                  <button
                    key={pm}
                    onClick={() => setPaymentMethod(pm)}
                    className={`h-9 rounded-lg text-xs font-medium transition-colors ${
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

            {/* Discount */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Discount (PKR)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountRupees}
                onChange={(e) => setDiscountRupees(e.target.value)}
                placeholder="0.00"
                className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Totals */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span>
                <span>{formatPKR(subtotalPaisa)}</span>
              </div>
              {discountPaisa > 0 && (
                <div className="flex justify-between text-xs text-red-500">
                  <span>Discount</span>
                  <span>-{formatPKR(discountPaisa)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-gray-900 pt-1.5 border-t border-gray-200">
                <span>Total</span>
                <span>{formatPKR(totalPaisa)}</span>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={cart.length === 0 || submitting || totalPaisa <= 0}
              className="w-full h-11 rounded-lg bg-primary-600 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Processing...' : `Complete Sale - ${formatPKR(totalPaisa)}`}
            </button>
          </div>
        </div>
      </div>

      {/* New Customer Modal */}
      <Modal
        open={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        title="Add Customer"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              placeholder="Customer name"
              autoFocus
              className="w-full h-11 px-3 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
            <input
              type="text"
              value={newCustomerPhone}
              onChange={(e) => setNewCustomerPhone(e.target.value)}
              placeholder="Phone number"
              className="w-full h-11 px-3 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setShowCustomerModal(false)}
              className="h-11 px-5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateCustomer}
              disabled={!newCustomerName.trim()}
              className="h-11 px-5 rounded-lg bg-primary-600 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Customer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
