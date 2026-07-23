import type BetterSqlite3 from 'better-sqlite3'
import { getDb } from './database'

export interface CustomerRow {
  id: number
  name: string
  phone_number: string | null
  created_at: string
}

export interface CustomerInput {
  name: string
  phone_number?: string
}

function db(): BetterSqlite3.Database {
  return getDb()
}

export const customersRepo = {
  getAll(): CustomerRow[] {
    return db().prepare('SELECT * FROM customers ORDER BY name').all() as CustomerRow[]
  },

  getById(id: number): CustomerRow | undefined {
    return db().prepare('SELECT * FROM customers WHERE id = ?').get(id) as CustomerRow | undefined
  },

  search(query: string): CustomerRow[] {
    const pattern = `%${query}%`
    return db()
      .prepare(
        'SELECT * FROM customers WHERE name LIKE ? OR phone_number LIKE ? ORDER BY name'
      )
      .all(pattern, pattern) as CustomerRow[]
  },

  create(input: CustomerInput): CustomerRow {
    const stmt = db().prepare(`
      INSERT INTO customers (name, phone_number)
      VALUES (@name, @phone_number)
    `)
    const result = stmt.run({
      name: input.name,
      phone_number: input.phone_number ?? null
    })
    return this.getById(result.lastInsertRowid as number)!
  },

  update(id: number, input: Partial<CustomerInput>): CustomerRow | undefined {
    const existing = this.getById(id)
    if (!existing) return undefined

    const merged = { ...existing, ...input }
    db().prepare(`
      UPDATE customers
      SET name = @name,
          phone_number = @phone_number
      WHERE id = @id
    `).run({ ...merged, id })
    return this.getById(id)
  },

  delete(id: number): boolean {
    const result = db().prepare('DELETE FROM customers WHERE id = ?').run(id)
    return result.changes > 0
  },

  /**
   * Get the outstanding balance for a customer.
   * Derived as: sum(udhaar sales) - sum(payments).
   * Returns paisa (integer).
   */
  getOutstandingBalance(customerId: number): number {
    const salesTotal = db()
      .prepare(
        "SELECT COALESCE(SUM(total_paisa), 0) AS total FROM sales WHERE customer_id = ? AND payment_method = 'udhaar'"
      )
      .get(customerId) as { total: number }

    const paymentsTotal = db()
      .prepare(
        'SELECT COALESCE(SUM(amount_paisa), 0) AS total FROM customer_payments WHERE customer_id = ?'
      )
      .get(customerId) as { total: number }

    return salesTotal.total - paymentsTotal.total
  }
}
