export interface DesktopApi {
  ping: () => string
  db: {
    getConfig: () => Promise<{ dataPath: string } | null>
    getDefaultPath: () => Promise<string>
    setConfig: (dataPath: string) => Promise<boolean>
    verify: () => Promise<{ ok: boolean; products?: number; phones?: number; customers?: number; error?: string }>
  }
}

export interface SaleItem {
  productId: string
  name: string
  quantity: number
  unitPrice: number
}

export interface Sale {
  id: string
  items: SaleItem[]
  total: number
  createdAt: string
}

export interface Product {
  id: string
  name: string
  brand: string
  model: string
  imei?: string
  purchasePrice: number
  sellingPrice: number
  stock: number
  category: 'phone' | 'accessory'
}

export interface DbConfig {
  dataPath: string
}

export type NavRoute =
  | 'dashboard'
  | 'new-sale'
  | 'accessories'
  | 'phones'
  | 'purchases'
  | 'sales-history'
  | 'customers'
  | 'settings'

