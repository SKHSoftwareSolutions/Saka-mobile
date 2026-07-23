import type BetterSqlite3 from 'better-sqlite3'
import { getDb } from './database'

export interface PurchaseRow {
  id: number
  phone_id: number
  seller_name: string
  seller_cnic: string | null
  purchase_price_paisa: number
  notes: string | null
  created_at: string
}

export interface PurchaseInput {
  phone_id: number
  seller_name: string
  seller_cnic?: string
  purchase_price_paisa: number
  notes?: string
}

function db(): BetterSqlite3.Database {
  return getDb()
}

export const purchasesRepo = {
  getAll(): PurchaseRow[] {
    return db().prepare('SELECT * FROM purchases ORDER BY created_at DESC').all() as PurchaseRow[]
  },

  getById(id: number): PurchaseRow | undefined {
    return db().prepare('SELECT * FROM purchases WHERE id = ?').get(id) as PurchaseRow | undefined
  },

  getByPhoneId(phoneId: number): PurchaseRow[] {
    return db()
      .prepare('SELECT * FROM purchases WHERE phone_id = ? ORDER BY created_at DESC')
      .all(phoneId) as PurchaseRow[]
  },

  create(input: PurchaseInput): PurchaseRow {
    const stmt = db().prepare(`
      INSERT INTO purchases (phone_id, seller_name, seller_cnic, purchase_price_paisa, notes)
      VALUES (@phone_id, @seller_name, @seller_cnic, @purchase_price_paisa, @notes)
    `)
    const result = stmt.run({
      phone_id: input.phone_id,
      seller_name: input.seller_name,
      seller_cnic: input.seller_cnic ?? null,
      purchase_price_paisa: input.purchase_price_paisa,
      notes: input.notes ?? null
    })
    return this.getById(result.lastInsertRowid as number)!
  },

  update(id: number, input: Partial<PurchaseInput>): PurchaseRow | undefined {
    const existing = this.getById(id)
    if (!existing) return undefined

    const merged = { ...existing, ...input }
    db().prepare(`
      UPDATE purchases
      SET phone_id = @phone_id,
          seller_name = @seller_name,
          seller_cnic = @seller_cnic,
          purchase_price_paisa = @purchase_price_paisa,
          notes = @notes
      WHERE id = @id
    `).run({ ...merged, id })
    return this.getById(id)
  },

  delete(id: number): boolean {
    const result = db().prepare('DELETE FROM purchases WHERE id = ?').run(id)
    return result.changes > 0
  },

  getAllWithPhone(): Array<{
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
  }> {
    return db()
      .prepare(
        `SELECT p.*,
                ph.brand, ph.model, ph.imei, ph.condition, ph.storage, ph.ram,
                ph.status AS phone_status, ph.created_at AS phone_created_at
         FROM purchases p
         JOIN phones ph ON ph.id = p.phone_id
         ORDER BY p.created_at DESC`
      )
      .all() as Array<{
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
      }>
  }
}
