import type BetterSqlite3 from 'better-sqlite3'
import { getDb } from './database'
import type { DashboardStats, LowStockItem, RecentSale, CustomerWithBalance } from '../../shared/api-types'

function db(): BetterSqlite3.Database {
  return getDb()
}

export const dashboardRepo = {
  getStats(): DashboardStats {
    const today = new Date().toISOString().slice(0, 10)

    const salesRow = db()
      .prepare(
        `SELECT COALESCE(SUM(total_paisa), 0) AS total,
                COUNT(*) AS count
         FROM sales
         WHERE date(created_at) = ?`
      )
      .get(today) as { total: number; count: number }

    const lowStockCount = (
      db()
        .prepare('SELECT COUNT(*) AS c FROM products WHERE quantity <= low_stock_threshold')
        .get() as { c: number }
    ).c

    const phonesInStockCount = (
      db()
        .prepare("SELECT COUNT(*) AS c FROM phones WHERE status = 'in_stock'")
        .get() as { c: number }
    ).c

    return {
      todaySalesTotal: salesRow.total,
      todaySaleCount: salesRow.count,
      lowStockCount,
      phonesInStockCount
    }
  },

  getLowStock(): LowStockItem[] {
    return db()
      .prepare(
        'SELECT id, name, category, quantity, low_stock_threshold FROM products WHERE quantity <= low_stock_threshold ORDER BY quantity ASC'
      )
      .all() as LowStockItem[]
  },

  getRecentSales(): RecentSale[] {
    return db()
      .prepare(
        'SELECT id, receipt_number, total_paisa, payment_method, created_at FROM sales ORDER BY created_at DESC LIMIT 5'
      )
      .all() as RecentSale[]
  },

  getCustomersWithBalance(): CustomerWithBalance[] {
    const customers = db()
      .prepare('SELECT * FROM customers ORDER BY name')
      .all() as Array<{ id: number; name: string; phone_number: string | null; created_at: string }>

    return customers.map((c) => {
      const salesTotal = (
        db()
          .prepare(
            "SELECT COALESCE(SUM(total_paisa), 0) AS total FROM sales WHERE customer_id = ? AND payment_method = 'udhaar'"
          )
          .get(c.id) as { total: number }
      ).total

      const paymentsTotal = (
        db()
          .prepare(
            'SELECT COALESCE(SUM(amount_paisa), 0) AS total FROM customer_payments WHERE customer_id = ?'
          )
          .get(c.id) as { total: number }
      ).total

      return { ...c, outstanding_paisa: salesTotal - paymentsTotal }
    })
  }
}
