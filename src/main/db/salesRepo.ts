import type BetterSqlite3 from 'better-sqlite3'
import { getDb } from './database'

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

/** Generate a simple receipt number: R-YYYYMMDD-XXXX */
function generateReceiptNumber(): string {
  const now = new Date()
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '')
  const randomPart = Math.floor(1000 + Math.random() * 9000).toString()
  return `R-${datePart}-${randomPart}`
}

function db(): BetterSqlite3.Database {
  return getDb()
}

export const salesRepo = {
  getAll(): SaleRow[] {
    return db()
      .prepare(
        `SELECT s.*,
                COALESCE((SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id), 0) AS item_count
         FROM sales s
         ORDER BY s.created_at DESC`
      )
      .all() as SaleRow[]
  },

  getById(id: number): SaleRow | undefined {
    return db().prepare('SELECT * FROM sales WHERE id = ?').get(id) as SaleRow | undefined
  },

  getItemsBySaleId(saleId: number): SaleItemRow[] {
    return db()
      .prepare('SELECT * FROM sale_items WHERE sale_id = ?')
      .all(saleId) as SaleItemRow[]
  },

  create(input: SaleInput): SaleRow {
    const receiptNumber = generateReceiptNumber()

    const insertSale = db().prepare(`
      INSERT INTO sales (receipt_number, customer_id, subtotal_paisa, discount_paisa, total_paisa, payment_method)
      VALUES (@receipt_number, @customer_id, @subtotal_paisa, @discount_paisa, @total_paisa, @payment_method)
    `)

    const insertItem = db().prepare(`
      INSERT INTO sale_items (sale_id, product_id, phone_id, description, quantity, unit_price_paisa, line_total_paisa)
      VALUES (@sale_id, @product_id, @phone_id, @description, @quantity, @unit_price_paisa, @line_total_paisa)
    `)

    const updateProductQty = db().prepare(`
      UPDATE products SET quantity = quantity - @qty, updated_at = datetime('now') WHERE id = @id
    `)

    const updatePhoneStatus = db().prepare(`
      UPDATE phones SET status = 'sold', updated_at = datetime('now') WHERE id = @id
    `)

    const transaction = db().transaction(() => {
      const saleResult = insertSale.run({
        receipt_number: receiptNumber,
        customer_id: input.customer_id ?? null,
        subtotal_paisa: input.subtotal_paisa,
        discount_paisa: input.discount_paisa ?? 0,
        total_paisa: input.total_paisa,
        payment_method: input.payment_method
      })

      const saleId = saleResult.lastInsertRowid as number

      for (const item of input.items) {
        insertItem.run({
          sale_id: saleId,
          product_id: item.product_id ?? null,
          phone_id: item.phone_id ?? null,
          description: item.description,
          quantity: item.quantity,
          unit_price_paisa: item.unit_price_paisa,
          line_total_paisa: item.line_total_paisa
        })

        // Decrement product quantity
        if (item.product_id) {
          updateProductQty.run({ id: item.product_id, qty: item.quantity })
        }

        // Mark phone as sold
        if (item.phone_id) {
          updatePhoneStatus.run({ id: item.phone_id })
        }
      }

      return saleId
    })

    const saleId = transaction()
    return this.getById(saleId)!
  },

  getByCustomerId(customerId: number): SaleRow[] {
    return db()
      .prepare('SELECT * FROM sales WHERE customer_id = ? ORDER BY created_at DESC')
      .all(customerId) as SaleRow[]
  },

  delete(id: number): boolean {
    const transaction = db().transaction(() => {
      // Restore product quantities and phone status before deleting
      const items = this.getItemsBySaleId(id)
      for (const item of items) {
        if (item.product_id) {
          db()
            .prepare(
              "UPDATE products SET quantity = quantity + @qty, updated_at = datetime('now') WHERE id = @id"
            )
            .run({ id: item.product_id, qty: item.quantity })
        }
        if (item.phone_id) {
          db()
            .prepare(
              "UPDATE phones SET status = 'in_stock', updated_at = datetime('now') WHERE id = @id"
            )
            .run({ id: item.phone_id })
        }
      }
      db().prepare('DELETE FROM sale_items WHERE sale_id = ?').run(id)
      db().prepare('DELETE FROM sales WHERE id = ?').run(id)
    })

    transaction()
    return true
  }
}
