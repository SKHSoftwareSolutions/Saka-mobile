import type BetterSqlite3 from 'better-sqlite3'
import { getDb } from './database'

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

function db(): BetterSqlite3.Database {
  return getDb()
}

export const phonesRepo = {
  getAll(): PhoneRow[] {
    return db().prepare('SELECT * FROM phones ORDER BY brand, model').all() as PhoneRow[]
  },

  getById(id: number): PhoneRow | undefined {
    return db().prepare('SELECT * FROM phones WHERE id = ?').get(id) as PhoneRow | undefined
  },

  getByImei(imei: string): PhoneRow | undefined {
    return db().prepare('SELECT * FROM phones WHERE imei = ?').get(imei) as PhoneRow | undefined
  },

  getInStock(): PhoneRow[] {
    return db()
      .prepare("SELECT * FROM phones WHERE status = 'in_stock' ORDER BY brand, model")
      .all() as PhoneRow[]
  },

  create(input: PhoneInput): PhoneRow {
    const stmt = db().prepare(`
      INSERT INTO phones (brand, model, imei, condition, storage, ram, purchase_price_paisa, sale_price_paisa, status, notes)
      VALUES (@brand, @model, @imei, @condition, @storage, @ram, @purchase_price_paisa, @sale_price_paisa, @status, @notes)
    `)
    const result = stmt.run({
      brand: input.brand,
      model: input.model,
      imei: input.imei,
      condition: input.condition,
      storage: input.storage ?? null,
      ram: input.ram ?? null,
      purchase_price_paisa: input.purchase_price_paisa,
      sale_price_paisa: input.sale_price_paisa,
      status: input.status ?? 'in_stock',
      notes: input.notes ?? null
    })
    return this.getById(result.lastInsertRowid as number)!
  },

  update(id: number, input: Partial<PhoneInput>): PhoneRow | undefined {
    const existing = this.getById(id)
    if (!existing) return undefined

    const merged = { ...existing, ...input }
    db().prepare(`
      UPDATE phones
      SET brand = @brand,
          model = @model,
          imei = @imei,
          condition = @condition,
          storage = @storage,
          ram = @ram,
          purchase_price_paisa = @purchase_price_paisa,
          sale_price_paisa = @sale_price_paisa,
          status = @status,
          notes = @notes,
          updated_at = datetime('now')
      WHERE id = @id
    `).run({ ...merged, id })
    return this.getById(id)
  },

  delete(id: number): boolean {
    const result = db().prepare('DELETE FROM phones WHERE id = ?').run(id)
    return result.changes > 0
  }
}
