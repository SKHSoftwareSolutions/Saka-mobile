import type BetterSqlite3 from 'better-sqlite3'
import { getDb } from './database'

export interface CustomerPaymentRow {
  id: number
  customer_id: number
  sale_id: number | null
  amount_paisa: number
  payment_method: 'cash' | 'jazzcash' | 'easypaisa'
  notes: string | null
  created_at: string
}

export interface CustomerPaymentInput {
  customer_id: number
  sale_id?: number
  amount_paisa: number
  payment_method: 'cash' | 'jazzcash' | 'easypaisa'
  notes?: string
}

function db(): BetterSqlite3.Database {
  return getDb()
}

export const customerPaymentsRepo = {
  getAll(): CustomerPaymentRow[] {
    return db()
      .prepare('SELECT * FROM customer_payments ORDER BY created_at DESC')
      .all() as CustomerPaymentRow[]
  },

  getById(id: number): CustomerPaymentRow | undefined {
    return db()
      .prepare('SELECT * FROM customer_payments WHERE id = ?')
      .get(id) as CustomerPaymentRow | undefined
  },

  getByCustomerId(customerId: number): CustomerPaymentRow[] {
    return db()
      .prepare(
        'SELECT * FROM customer_payments WHERE customer_id = ? ORDER BY created_at DESC'
      )
      .all(customerId) as CustomerPaymentRow[]
  },

  create(input: CustomerPaymentInput): CustomerPaymentRow {
    const stmt = db().prepare(`
      INSERT INTO customer_payments (customer_id, sale_id, amount_paisa, payment_method, notes)
      VALUES (@customer_id, @sale_id, @amount_paisa, @payment_method, @notes)
    `)
    const result = stmt.run({
      customer_id: input.customer_id,
      sale_id: input.sale_id ?? null,
      amount_paisa: input.amount_paisa,
      payment_method: input.payment_method,
      notes: input.notes ?? null
    })
    return this.getById(result.lastInsertRowid as number)!
  },

  delete(id: number): boolean {
    const result = db().prepare('DELETE FROM customer_payments WHERE id = ?').run(id)
    return result.changes > 0
  }
}
