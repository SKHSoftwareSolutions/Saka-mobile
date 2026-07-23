// ─── Generic IPC envelope ───────────────────────────────────────────────────
export type IpcResponse<T> = { success: true; data: T } | { success: false; error: string }

// ─── Row types (mirrors DB schema exactly) ──────────────────────────────────

export interface ProductRow {
  id: number
  name: string
  category: string
  purchase_price_paisa: number
  sale_price_paisa: number
  quantity: number
  low_stock_threshold: number
  created_at: string
  updated_at: string
}

export interface PhoneRow {
  id: number
  brand: string
  model: string
  imei: string
  condition: 'new' | 'used'
  storage: string | null
  ram: string | null
  purchase_price_paisa: number
  sale_price_paisa: number
  status: 'in_stock' | 'sold' | 'returned'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CustomerRow {
  id: number
  name: string
  phone_number: string | null
  created_at: string
}

export interface SaleRow {
  id: number
  receipt_number: string
  customer_id: number | null
  subtotal_paisa: number
  discount_paisa: number
  total_paisa: number
  payment_method: 'cash' | 'jazzcash' | 'easypaisa' | 'udhaar'
  item_count: number
  created_at: string
}

export interface SaleItemRow {
  id: number
  sale_id: number
  product_id: number | null
  phone_id: number | null
  description: string
  quantity: number
  unit_price_paisa: number
  line_total_paisa: number
}

export interface PurchaseRow {
  id: number
  phone_id: number
  seller_name: string
  seller_cnic: string | null
  purchase_price_paisa: number
  notes: string | null
  created_at: string
}

export interface CustomerPaymentRow {
  id: number
  customer_id: number
  sale_id: number | null
  amount_paisa: number
  payment_method: 'cash' | 'jazzcash' | 'easypaisa'
  notes: string | null
  created_at: string
}

// ─── Input types (what the renderer sends) ──────────────────────────────────

export interface ProductInput {
  name: string
  category: string
  purchase_price_paisa: number
  sale_price_paisa: number
  quantity?: number
  low_stock_threshold?: number
}

export interface PhoneInput {
  brand: string
  model: string
  imei: string
  condition: 'new' | 'used'
  storage?: string
  ram?: string
  purchase_price_paisa: number
  sale_price_paisa: number
  status?: 'in_stock' | 'sold' | 'returned'
  notes?: string
}

export interface CustomerInput {
  name: string
  phone_number?: string
}

export interface SaleInput {
  customer_id?: number
  subtotal_paisa: number
  discount_paisa?: number
  total_paisa: number
  payment_method: 'cash' | 'jazzcash' | 'easypaisa' | 'udhaar'
  items: Array<{
    product_id?: number
    phone_id?: number
    description: string
    quantity: number
    unit_price_paisa: number
    line_total_paisa: number
  }>
}

export interface PurchaseInput {
  phone_id: number
  seller_name: string
  seller_cnic?: string
  purchase_price_paisa: number
  notes?: string
}

export interface CustomerPaymentInput {
  customer_id: number
  sale_id?: number
  amount_paisa: number
  payment_method: 'cash' | 'jazzcash' | 'easypaisa'
  notes?: string
}

// ─── Dashboard types ────────────────────────────────────────────────────────

export interface DashboardStats {
  todaySalesTotal: number
  todaySaleCount: number
  lowStockCount: number
  phonesInStockCount: number
}

export interface LowStockItem {
  id: number
  name: string
  category: string
  quantity: number
  low_stock_threshold: number
}

export interface RecentSale {
  id: number
  receipt_number: string
  total_paisa: number
  payment_method: string
  created_at: string
}

export interface CustomerWithBalance extends CustomerRow {
  outstanding_paisa: number
}

export interface PurchaseWithPhone {
  id: number
  phone_id: number
  seller_name: string
  seller_cnic: string | null
  purchase_price_paisa: number
  notes: string | null
  created_at: string
  brand: string
  model: string
  imei: string
  condition: 'new' | 'used'
  storage: string | null
  ram: string | null
  phone_status: 'in_stock' | 'sold' | 'returned'
  phone_created_at: string
}

export interface PurchaseWithPhoneInput {
  seller_name: string
  seller_cnic?: string
  brand: string
  model: string
  imei: string
  condition: 'new' | 'used'
  storage?: string
  ram?: string
  purchase_price_paisa: number
  notes?: string
}

export interface SaleInfoForPhone {
  sale_id: number
  receipt_number: string
  customer_name: string
  total_paisa: number
  payment_method: string
  sold_at: string
}

// ─── Settings types ─────────────────────────────────────────────────────────

export interface AppSettings {
  shopName: string
  receiptFooter: string
  dataPath: string
  lastBackupAt: string | null
}

export interface BackupInfo {
  filename: string
  sizeBytes: number
  createdAt: string
}

// ─── API shape — the renderer calls these methods ───────────────────────────

export interface ProductsApi {
  list: () => Promise<IpcResponse<ProductRow[]>>
  getById: (id: number) => Promise<IpcResponse<ProductRow>>
  create: (input: ProductInput) => Promise<IpcResponse<ProductRow>>
  update: (id: number, input: Partial<ProductInput>) => Promise<IpcResponse<ProductRow>>
  delete: (id: number) => Promise<IpcResponse<boolean>>
  getLowStock: () => Promise<IpcResponse<LowStockItem[]>>
}

export interface PhonesApi {
  list: () => Promise<IpcResponse<PhoneRow[]>>
  getInStock: () => Promise<IpcResponse<PhoneRow[]>>
  getById: (id: number) => Promise<IpcResponse<PhoneRow>>
  create: (input: PhoneInput) => Promise<IpcResponse<PhoneRow>>
  update: (id: number, input: Partial<PhoneInput>) => Promise<IpcResponse<PhoneRow>>
  delete: (id: number) => Promise<IpcResponse<boolean>>
  getPurchases: (phoneId: number) => Promise<IpcResponse<PurchaseRow[]>>
  getSaleInfo: (phoneId: number) => Promise<IpcResponse<SaleInfoForPhone | null>>
}

export interface CustomersApi {
  list: () => Promise<IpcResponse<CustomerRow[]>>
  getById: (id: number) => Promise<IpcResponse<CustomerRow>>
  search: (query: string) => Promise<IpcResponse<CustomerRow[]>>
  create: (input: CustomerInput) => Promise<IpcResponse<CustomerRow>>
  update: (id: number, input: Partial<CustomerInput>) => Promise<IpcResponse<CustomerRow>>
  delete: (id: number) => Promise<IpcResponse<boolean>>
  getWithBalance: () => Promise<IpcResponse<CustomerWithBalance[]>>
}

export interface SalesApi {
  list: () => Promise<IpcResponse<SaleRow[]>>
  getById: (id: number) => Promise<IpcResponse<SaleRow>>
  getItems: (saleId: number) => Promise<IpcResponse<SaleItemRow[]>>
  getByCustomer: (customerId: number) => Promise<IpcResponse<SaleRow[]>>
  create: (input: SaleInput) => Promise<IpcResponse<SaleRow>>
  delete: (id: number) => Promise<IpcResponse<boolean>>
}

export interface PurchasesApi {
  list: () => Promise<IpcResponse<PurchaseRow[]>>
  getById: (id: number) => Promise<IpcResponse<PurchaseRow>>
  create: (input: PurchaseInput) => Promise<IpcResponse<PurchaseRow>>
  update: (id: number, input: Partial<PurchaseInput>) => Promise<IpcResponse<PurchaseRow>>
  delete: (id: number) => Promise<IpcResponse<boolean>>
  getAllWithPhone: () => Promise<IpcResponse<PurchaseWithPhone[]>>
  createWithPhone: (input: PurchaseWithPhoneInput) => Promise<IpcResponse<PurchaseWithPhone>>
}

export interface PaymentsApi {
  list: () => Promise<IpcResponse<CustomerPaymentRow[]>>
  getById: (id: number) => Promise<IpcResponse<CustomerPaymentRow>>
  getByCustomer: (customerId: number) => Promise<IpcResponse<CustomerPaymentRow[]>>
  create: (input: CustomerPaymentInput) => Promise<IpcResponse<CustomerPaymentRow>>
  delete: (id: number) => Promise<IpcResponse<boolean>>
}

export interface DashboardApi {
  getStats: () => Promise<IpcResponse<DashboardStats>>
  getLowStock: () => Promise<IpcResponse<LowStockItem[]>>
  getRecentSales: () => Promise<IpcResponse<RecentSale[]>>
}

export interface SetupApi {
  getConfig: () => Promise<IpcResponse<{ dataPath: string } | null>>
  getDefaultPath: () => Promise<IpcResponse<string>>
  setConfig: (dataPath: string) => Promise<IpcResponse<boolean>>
  verify: () => Promise<
    IpcResponse<{ products: number; phones: number; customers: number }>
  >
}

export interface SettingsApi {
  getSettings: () => Promise<IpcResponse<AppSettings>>
  saveSettings: (settings: {
    shopName: string
    receiptFooter: string
  }) => Promise<IpcResponse<boolean>>
  getDataPath: () => Promise<IpcResponse<string>>
  changeDataFolder: () => Promise<IpcResponse<string | null>>
  backupNow: () => Promise<IpcResponse<string>>
  listBackups: () => Promise<IpcResponse<BackupInfo[]>>
  restoreBackup: (filename: string) => Promise<IpcResponse<boolean>>
  exportToFolder: (targetFolder: string) => Promise<IpcResponse<boolean>>
  pickFolder: () => Promise<IpcResponse<string | null>>
}

export interface AppApi {
  products: ProductsApi
  phones: PhonesApi
  customers: CustomersApi
  sales: SalesApi
  purchases: PurchasesApi
  payments: PaymentsApi
  dashboard: DashboardApi
  setup: SetupApi
  settings: SettingsApi
  logError: (payload: string) => void
}
