import type BetterSqlite3 from 'better-sqlite3'
import { getDb } from './database'

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

export interface ProductInput {
  name: string
  category: string
  purchase_price_paisa: number
  sale_price_paisa: number
  quantity?: number
  low_stock_threshold?: number
}

function db(): BetterSqlite3.Database {
  return getDb()
}

export const productsRepo = {
  getAll(): ProductRow[] {
    return db().prepare('SELECT * FROM products ORDER BY name').all() as ProductRow[]
  },

  getById(id: number): ProductRow | undefined {
    return db().prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRow | undefined
  },

  create(input: ProductInput): ProductRow {
    const stmt = db().prepare(`
      INSERT INTO products (name, category, purchase_price_paisa, sale_price_paisa, quantity, low_stock_threshold)
      VALUES (@name, @category, @purchase_price_paisa, @sale_price_paisa, @quantity, @low_stock_threshold)
    `)
    const result = stmt.run({
      name: input.name,
      category: input.category,
      purchase_price_paisa: input.purchase_price_paisa,
      sale_price_paisa: input.sale_price_paisa,
      quantity: input.quantity ?? 0,
      low_stock_threshold: input.low_stock_threshold ?? 5
    })
    return this.getById(result.lastInsertRowid as number)!
  },

  update(id: number, input: Partial<ProductInput>): ProductRow | undefined {
    const existing = this.getById(id)
    if (!existing) return undefined

    const merged = { ...existing, ...input }
    db().prepare(`
      UPDATE products
      SET name = @name,
          category = @category,
          purchase_price_paisa = @purchase_price_paisa,
          sale_price_paisa = @sale_price_paisa,
          quantity = @quantity,
          low_stock_threshold = @low_stock_threshold,
          updated_at = datetime('now')
      WHERE id = @id
    `).run({ ...merged, id })
    return this.getById(id)
  },

  delete(id: number): boolean {
    const result = db().prepare('DELETE FROM products WHERE id = ?').run(id)
    return result.changes > 0
  },

  getLowStock(): ProductRow[] {
    return db()
      .prepare('SELECT * FROM products WHERE quantity <= low_stock_threshold ORDER BY name')
      .all() as ProductRow[]
  }
}
