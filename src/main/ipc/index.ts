import { ipcMain, dialog } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import type {
  IpcResponse,
  ProductRow,
  PhoneRow,
  CustomerRow,
  SaleRow,
  SaleItemRow,
  PurchaseRow,
  CustomerPaymentRow,
  ProductInput,
  PhoneInput,
  CustomerInput,
  SaleInput,
  PurchaseInput,
  CustomerPaymentInput,
  DashboardStats,
  LowStockItem,
  RecentSale,
  CustomerWithBalance,
  SaleInfoForPhone,
  PurchaseWithPhone,
  PurchaseWithPhoneInput,
  AppSettings
} from '../../shared/api-types'
import { productsRepo } from '../db/productsRepo'
import { phonesRepo } from '../db/phonesRepo'
import { customersRepo } from '../db/customersRepo'
import { salesRepo } from '../db/salesRepo'
import { purchasesRepo } from '../db/purchasesRepo'
import { customerPaymentsRepo } from '../db/customerPaymentsRepo'
import { dashboardRepo } from '../db/dashboardRepo'
import {
  getConfig,
  setConfig,
  getDefaultDataPath,
  initDatabase,
  getDb,
  createBackup,
  restoreBackup
} from '../db/database'
import type { AppConfig } from '../db/database'

// ─── Helper: wrap a handler so it returns IpcResponse ───────────────────────

function safe<T>(fn: () => T): IpcResponse<T> {
  try {
    return { success: true, data: fn() }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ─── Validation helpers ─────────────────────────────────────────────────────

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function isPositiveInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v > 0
}

// ─── Register all IPC handlers ──────────────────────────────────────────────

export function registerIpcHandlers(): void {
  // ── Setup (first-run) ────────────────────────────────────────────────────
  ipcMain.handle('db:get-config', () => {
    return safe(() => getConfig())
  })

  ipcMain.handle('db:get-default-path', () => {
    return safe(() => getDefaultDataPath())
  })

  ipcMain.handle('db:set-config', (_event, dataPath: string) => {
    return safe(() => {
      if (!isNonEmptyString(dataPath)) throw new Error('dataPath is required')
      setConfig({ dataPath })
      initDatabase({ dataPath })
      return true
    })
  })

  ipcMain.handle('db:verify', () => {
    return safe(() => {
      const db = getDb()
      const productCount = (db.prepare('SELECT COUNT(*) AS c FROM products').get() as { c: number }).c
      const phoneCount = (db.prepare('SELECT COUNT(*) AS c FROM phones').get() as { c: number }).c
      const customerCount = (db.prepare('SELECT COUNT(*) AS c FROM customers').get() as { c: number }).c
      return { products: productCount, phones: phoneCount, customers: customerCount }
    })
  })

  // ── Products ─────────────────────────────────────────────────────────────
  ipcMain.handle('products:list', () => {
    return safe<ProductRow[]>(() => productsRepo.getAll())
  })

  ipcMain.handle('products:getById', (_event, id: number) => {
    return safe<ProductRow>(() => {
      if (!isPositiveInt(id)) throw new Error('Invalid product id')
      const row = productsRepo.getById(id)
      if (!row) throw new Error(`Product ${id} not found`)
      return row
    })
  })

  ipcMain.handle('products:create', (_event, input: ProductInput) => {
    return safe<ProductRow>(() => {
      if (!isNonEmptyString(input.name)) throw new Error('Product name is required')
      if (!isNonEmptyString(input.category)) throw new Error('Product category is required')
      if (typeof input.purchase_price_paisa !== 'number' || input.purchase_price_paisa < 0)
        throw new Error('Invalid purchase price')
      if (typeof input.sale_price_paisa !== 'number' || input.sale_price_paisa < 0)
        throw new Error('Invalid sale price')
      return productsRepo.create(input)
    })
  })

  ipcMain.handle('products:update', (_event, id: number, input: Partial<ProductInput>) => {
    return safe<ProductRow>(() => {
      if (!isPositiveInt(id)) throw new Error('Invalid product id')
      const updated = productsRepo.update(id, input)
      if (!updated) throw new Error(`Product ${id} not found`)
      return updated
    })
  })

  ipcMain.handle('products:delete', (_event, id: number) => {
    return safe<boolean>(() => {
      if (!isPositiveInt(id)) throw new Error('Invalid product id')
      return productsRepo.delete(id)
    })
  })

  ipcMain.handle('products:getLowStock', () => {
    return safe<LowStockItem[]>(() => dashboardRepo.getLowStock())
  })

  // ── Phones ───────────────────────────────────────────────────────────────
  ipcMain.handle('phones:list', () => {
    return safe<PhoneRow[]>(() => phonesRepo.getAll())
  })

  ipcMain.handle('phones:getInStock', () => {
    return safe<PhoneRow[]>(() => phonesRepo.getInStock())
  })

  ipcMain.handle('phones:getById', (_event, id: number) => {
    return safe<PhoneRow>(() => {
      if (!isPositiveInt(id)) throw new Error('Invalid phone id')
      const row = phonesRepo.getById(id)
      if (!row) throw new Error(`Phone ${id} not found`)
      return row
    })
  })

  ipcMain.handle('phones:create', (_event, input: PhoneInput) => {
    return safe<PhoneRow>(() => {
      if (!isNonEmptyString(input.brand)) throw new Error('Brand is required')
      if (!isNonEmptyString(input.model)) throw new Error('Model is required')
      if (!isNonEmptyString(input.imei)) throw new Error('IMEI is required')
      if (!['new', 'used'].includes(input.condition)) throw new Error('Invalid condition')
      if (typeof input.purchase_price_paisa !== 'number' || input.purchase_price_paisa < 0)
        throw new Error('Invalid purchase price')
      if (typeof input.sale_price_paisa !== 'number' || input.sale_price_paisa < 0)
        throw new Error('Invalid sale price')
      return phonesRepo.create(input)
    })
  })

  ipcMain.handle('phones:update', (_event, id: number, input: Partial<PhoneInput>) => {
    return safe<PhoneRow>(() => {
      if (!isPositiveInt(id)) throw new Error('Invalid phone id')
      const updated = phonesRepo.update(id, input)
      if (!updated) throw new Error(`Phone ${id} not found`)
      return updated
    })
  })

  ipcMain.handle('phones:delete', (_event, id: number) => {
    return safe<boolean>(() => {
      if (!isPositiveInt(id)) throw new Error('Invalid phone id')
      return phonesRepo.delete(id)
    })
  })

  ipcMain.handle('phones:getPurchases', (_event, phoneId: number) => {
    return safe<PurchaseRow[]>(() => {
      if (!isPositiveInt(phoneId)) throw new Error('Invalid phone id')
      return purchasesRepo.getByPhoneId(phoneId)
    })
  })

  ipcMain.handle('phones:getSaleInfo', (_event, phoneId: number) => {
    return safe<SaleInfoForPhone | null>(() => {
      if (!isPositiveInt(phoneId)) throw new Error('Invalid phone id')
      const db = getDb()
      const row = db
        .prepare(
          `SELECT s.id AS sale_id, s.receipt_number, s.total_paisa, s.payment_method, s.created_at AS sold_at,
                  COALESCE(c.name, 'Walk-in') AS customer_name
           FROM sale_items si
           JOIN sales s ON s.id = si.sale_id
           LEFT JOIN customers c ON c.id = s.customer_id
           WHERE si.phone_id = ?
           ORDER BY s.created_at DESC
           LIMIT 1`
        )
        .get(phoneId) as SaleInfoForPhone | undefined
      return row ?? null
    })
  })

  // ── Customers ────────────────────────────────────────────────────────────
  ipcMain.handle('customers:list', () => {
    return safe<CustomerRow[]>(() => customersRepo.getAll())
  })

  ipcMain.handle('customers:getById', (_event, id: number) => {
    return safe<CustomerRow>(() => {
      if (!isPositiveInt(id)) throw new Error('Invalid customer id')
      const row = customersRepo.getById(id)
      if (!row) throw new Error(`Customer ${id} not found`)
      return row
    })
  })

  ipcMain.handle('customers:search', (_event, query: string) => {
    return safe<CustomerRow[]>(() => {
      if (!isNonEmptyString(query)) throw new Error('Search query is required')
      return customersRepo.search(query)
    })
  })

  ipcMain.handle('customers:create', (_event, input: CustomerInput) => {
    return safe<CustomerRow>(() => {
      if (!isNonEmptyString(input.name)) throw new Error('Customer name is required')
      return customersRepo.create(input)
    })
  })

  ipcMain.handle('customers:update', (_event, id: number, input: Partial<CustomerInput>) => {
    return safe<CustomerRow>(() => {
      if (!isPositiveInt(id)) throw new Error('Invalid customer id')
      const updated = customersRepo.update(id, input)
      if (!updated) throw new Error(`Customer ${id} not found`)
      return updated
    })
  })

  ipcMain.handle('customers:delete', (_event, id: number) => {
    return safe<boolean>(() => {
      if (!isPositiveInt(id)) throw new Error('Invalid customer id')
      return customersRepo.delete(id)
    })
  })

  ipcMain.handle('customers:getWithBalance', () => {
    return safe<CustomerWithBalance[]>(() => dashboardRepo.getCustomersWithBalance())
  })

  // ── Sales ────────────────────────────────────────────────────────────────
  ipcMain.handle('sales:list', () => {
    return safe<SaleRow[]>(() => salesRepo.getAll())
  })

  ipcMain.handle('sales:getById', (_event, id: number) => {
    return safe<SaleRow>(() => {
      if (!isPositiveInt(id)) throw new Error('Invalid sale id')
      const row = salesRepo.getById(id)
      if (!row) throw new Error(`Sale ${id} not found`)
      return row
    })
  })

  ipcMain.handle('sales:getItems', (_event, saleId: number) => {
    return safe<SaleItemRow[]>(() => {
      if (!isPositiveInt(saleId)) throw new Error('Invalid sale id')
      return salesRepo.getItemsBySaleId(saleId)
    })
  })

  ipcMain.handle('sales:getByCustomer', (_event, customerId: number) => {
    return safe<SaleRow[]>(() => {
      if (!isPositiveInt(customerId)) throw new Error('Invalid customer id')
      return salesRepo.getByCustomerId(customerId)
    })
  })

  ipcMain.handle('sales:create', (_event, input: SaleInput) => {
    return safe<SaleRow>(() => {
      if (!Array.isArray(input.items) || input.items.length === 0)
        throw new Error('At least one sale item is required')
      if (typeof input.total_paisa !== 'number' || input.total_paisa <= 0)
        throw new Error('Invalid total')
      if (typeof input.subtotal_paisa !== 'number' || input.subtotal_paisa <= 0)
        throw new Error('Invalid subtotal')
      if (!['cash', 'jazzcash', 'easypaisa', 'udhaar'].includes(input.payment_method))
        throw new Error('Invalid payment method')
      for (const item of input.items) {
        if (!isNonEmptyString(item.description)) throw new Error('Item description is required')
        if (typeof item.unit_price_paisa !== 'number' || item.unit_price_paisa <= 0)
          throw new Error('Invalid item price')
        if (!isPositiveInt(item.quantity)) throw new Error('Invalid item quantity')
      }
      return salesRepo.create(input)
    })
  })

  ipcMain.handle('sales:delete', (_event, id: number) => {
    return safe<boolean>(() => {
      if (!isPositiveInt(id)) throw new Error('Invalid sale id')
      return salesRepo.delete(id)
    })
  })

  // ── Purchases ────────────────────────────────────────────────────────────
  ipcMain.handle('purchases:list', () => {
    return safe<PurchaseRow[]>(() => purchasesRepo.getAll())
  })

  ipcMain.handle('purchases:getById', (_event, id: number) => {
    return safe<PurchaseRow>(() => {
      if (!isPositiveInt(id)) throw new Error('Invalid purchase id')
      const row = purchasesRepo.getById(id)
      if (!row) throw new Error(`Purchase ${id} not found`)
      return row
    })
  })

  ipcMain.handle('purchases:create', (_event, input: PurchaseInput) => {
    return safe<PurchaseRow>(() => {
      if (!isPositiveInt(input.phone_id)) throw new Error('Phone id is required')
      if (!isNonEmptyString(input.seller_name)) throw new Error('Seller name is required')
      if (typeof input.purchase_price_paisa !== 'number' || input.purchase_price_paisa <= 0)
        throw new Error('Invalid purchase price')
      return purchasesRepo.create(input)
    })
  })

  ipcMain.handle('purchases:update', (_event, id: number, input: Partial<PurchaseInput>) => {
    return safe<PurchaseRow>(() => {
      if (!isPositiveInt(id)) throw new Error('Invalid purchase id')
      const updated = purchasesRepo.update(id, input)
      if (!updated) throw new Error(`Purchase ${id} not found`)
      return updated
    })
  })

  ipcMain.handle('purchases:delete', (_event, id: number) => {
    return safe<boolean>(() => {
      if (!isPositiveInt(id)) throw new Error('Invalid purchase id')
      return purchasesRepo.delete(id)
    })
  })

  ipcMain.handle('purchases:getAllWithPhone', () => {
    return safe<PurchaseWithPhone[]>(() => purchasesRepo.getAllWithPhone())
  })

  ipcMain.handle('purchases:createWithPhone', (_event, input: PurchaseWithPhoneInput) => {
    return safe<PurchaseWithPhone>(() => {
      if (!isNonEmptyString(input.seller_name)) throw new Error('Seller name is required')
      if (!isNonEmptyString(input.brand)) throw new Error('Brand is required')
      if (!isNonEmptyString(input.model)) throw new Error('Model is required')
      if (!isNonEmptyString(input.imei)) throw new Error('IMEI is required')
      if (!['new', 'used'].includes(input.condition)) throw new Error('Invalid condition')
      if (typeof input.purchase_price_paisa !== 'number' || input.purchase_price_paisa <= 0)
        throw new Error('Invalid purchase price')

      const cleanImei = input.imei.replace(/[^0-9]/g, '')
      if (cleanImei.length !== 15) throw new Error('IMEI must be exactly 15 digits')

      const existing = phonesRepo.getByImei(cleanImei)
      if (existing) throw new Error(`IMEI ${cleanImei} already exists in inventory`)

      const db = getDb()
      const transaction = db.transaction(() => {
        const phoneResult = db
          .prepare(
            `INSERT INTO phones (brand, model, imei, condition, storage, ram, purchase_price_paisa, sale_price_paisa, status, notes)
             VALUES (@brand, @model, @imei, @condition, @storage, @ram, @purchase_price_paisa, 0, 'in_stock', @notes)`
          )
          .run({
            brand: input.brand.trim(),
            model: input.model.trim(),
            imei: cleanImei,
            condition: input.condition,
            storage: input.storage?.trim() ?? null,
            ram: input.ram?.trim() ?? null,
            purchase_price_paisa: input.purchase_price_paisa,
            notes: input.notes?.trim() ?? null
          })

        const phoneId = phoneResult.lastInsertRowid as number

        const purchaseResult = db
          .prepare(
            `INSERT INTO purchases (phone_id, seller_name, seller_cnic, purchase_price_paisa, notes)
             VALUES (@phone_id, @seller_name, @seller_cnic, @purchase_price_paisa, @notes)`
          )
          .run({
            phone_id: phoneId,
            seller_name: input.seller_name.trim(),
            seller_cnic: input.seller_cnic?.trim() ?? null,
            purchase_price_paisa: input.purchase_price_paisa,
            notes: input.notes?.trim() ?? null
          })

        const purchaseId = purchaseResult.lastInsertRowid as number

        return db
          .prepare(
            `SELECT p.*,
                    ph.brand, ph.model, ph.imei, ph.condition, ph.storage, ph.ram,
                    ph.status AS phone_status, ph.created_at AS phone_created_at
             FROM purchases p
             JOIN phones ph ON ph.id = p.phone_id
             WHERE p.id = ?`
          )
          .get(purchaseId) as PurchaseWithPhone
      })

      return transaction()
    })
  })

  // ── Payments ─────────────────────────────────────────────────────────────
  ipcMain.handle('payments:list', () => {
    return safe<CustomerPaymentRow[]>(() => customerPaymentsRepo.getAll())
  })

  ipcMain.handle('payments:getById', (_event, id: number) => {
    return safe<CustomerPaymentRow>(() => {
      if (!isPositiveInt(id)) throw new Error('Invalid payment id')
      const row = customerPaymentsRepo.getById(id)
      if (!row) throw new Error(`Payment ${id} not found`)
      return row
    })
  })

  ipcMain.handle('payments:getByCustomer', (_event, customerId: number) => {
    return safe<CustomerPaymentRow[]>(() => {
      if (!isPositiveInt(customerId)) throw new Error('Invalid customer id')
      return customerPaymentsRepo.getByCustomerId(customerId)
    })
  })

  ipcMain.handle('payments:create', (_event, input: CustomerPaymentInput) => {
    return safe<CustomerPaymentRow>(() => {
      if (!isPositiveInt(input.customer_id)) throw new Error('Customer id is required')
      if (typeof input.amount_paisa !== 'number' || input.amount_paisa <= 0)
        throw new Error('Invalid payment amount')
      if (!['cash', 'jazzcash', 'easypaisa'].includes(input.payment_method))
        throw new Error('Invalid payment method')
      return customerPaymentsRepo.create(input)
    })
  })

  ipcMain.handle('payments:delete', (_event, id: number) => {
    return safe<boolean>(() => {
      if (!isPositiveInt(id)) throw new Error('Invalid payment id')
      return customerPaymentsRepo.delete(id)
    })
  })

  // ── Dashboard ────────────────────────────────────────────────────────────
  ipcMain.handle('dashboard:getStats', () => {
    return safe<DashboardStats>(() => dashboardRepo.getStats())
  })

  ipcMain.handle('dashboard:getLowStock', () => {
    return safe<LowStockItem[]>(() => dashboardRepo.getLowStock())
  })

  ipcMain.handle('dashboard:getRecentSales', () => {
    return safe<RecentSale[]>(() => dashboardRepo.getRecentSales())
  })

  // ── Settings ────────────────────────────────────────────────────────────
  ipcMain.handle('settings:getSettings', () => {
    return safe<AppSettings>(() => {
      const cfg = getConfig()
      return {
        shopName: cfg?.shopName ?? '',
        receiptFooter: cfg?.receiptFooter ?? '',
        dataPath: cfg?.dataPath ?? getDefaultDataPath(),
        lastBackupAt: cfg?.lastBackupAt ?? null
      }
    })
  })

  ipcMain.handle(
    'settings:saveSettings',
    (_event, settings: { shopName: string; receiptFooter: string }) => {
      return safe(() => {
        const cfg: AppConfig = getConfig() ?? { dataPath: getDefaultDataPath() }
        cfg.shopName = settings.shopName
        cfg.receiptFooter = settings.receiptFooter
        setConfig(cfg)
        return true
      })
    }
  )

  ipcMain.handle('settings:getDataPath', () => {
    return safe(() => getConfig()?.dataPath ?? getDefaultDataPath())
  })

  ipcMain.handle('settings:changeDataFolder', () => {
    return safe(() => {
      const result = dialog.showOpenDialogSync({
        properties: ['openDirectory'],
        title: 'Select New Data Folder'
      })
      if (!result || result.length === 0) return null
      return result[0]
    })
  })

  ipcMain.handle('settings:backupNow', () => {
    return safe(async () => {
      const cfg = getConfig()
      if (!cfg) throw new Error('No configuration found')
      return await createBackup(cfg.dataPath)
    })
  })

  ipcMain.handle('settings:listBackups', () => {
    return safe(() => {
      const cfg = getConfig()
      if (!cfg) return []
      const backupDir = path.join(cfg.dataPath, 'backups')
      if (!fs.existsSync(backupDir)) return []
      return fs
        .readdirSync(backupDir)
        .filter((f) => f.startsWith('store-') && f.endsWith('.db'))
        .map((f) => {
          const stat = fs.statSync(path.join(backupDir, f))
          return {
            filename: f,
            sizeBytes: stat.size,
            createdAt: stat.mtime.toISOString()
          }
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    })
  })

  ipcMain.handle('settings:restoreBackup', (_event, filename: string) => {
    return safe(async () => {
      const cfg = getConfig()
      if (!cfg) throw new Error('No configuration found')
      if (!isNonEmptyString(filename)) throw new Error('Filename is required')
      const backupPath = path.join(cfg.dataPath, 'backups', filename)
      if (!fs.existsSync(backupPath)) throw new Error('Backup file not found')
      await restoreBackup(backupPath, cfg.dataPath)
      return true
    })
  })

  ipcMain.handle('settings:exportToFolder', (_event, targetFolder: string) => {
    return safe(() => {
      const cfg = getConfig()
      if (!cfg) throw new Error('No configuration found')
      if (!isNonEmptyString(targetFolder)) throw new Error('Target folder is required')

      const dbPath = path.join(cfg.dataPath, 'store.db')
      const backupDir = path.join(cfg.dataPath, 'backups')

      // Copy store.db
      fs.copyFileSync(dbPath, path.join(targetFolder, 'store.db'))

      // Copy backups/ folder
      if (fs.existsSync(backupDir)) {
        const targetBackupDir = path.join(targetFolder, 'backups')
        if (!fs.existsSync(targetBackupDir)) {
          fs.mkdirSync(targetBackupDir, { recursive: true })
        }
        for (const file of fs.readdirSync(backupDir)) {
          fs.copyFileSync(path.join(backupDir, file), path.join(targetBackupDir, file))
        }
      }

      return true
    })
  })

  ipcMain.handle('settings:pickFolder', () => {
    return safe(() => {
      const result = dialog.showOpenDialogSync({
        properties: ['openDirectory'],
        title: 'Select Folder'
      })
      if (!result || result.length === 0) return null
      return result[0]
    })
  })

  // ── Error logging (renderer → main, fire-and-forget) ────────────────────
  ipcMain.on('log:error', (_event, payload: string) => {
    try {
      const cfg = getConfig()
      const logDir = cfg?.dataPath ?? getDefaultDataPath()
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
      }
      const logPath = path.join(logDir, 'error.log')
      const line = `[${new Date().toISOString()}] ${payload}\n`
      fs.appendFileSync(logPath, line, 'utf-8')
      console.error(`[Renderer Error] ${payload}`)
    } catch {
      // Last resort — swallow so we never crash on logging
    }
  })
}
