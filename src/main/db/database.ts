import { app, dialog } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import BetterSqlite3 from 'better-sqlite3'

/** Path to the config file stored in Electron's userData folder. */
function configFilePath(): string {
  return path.join(app.getPath('userData'), 'config.json')
}

export interface AppConfig {
  dataPath: string
  shopName?: string
  receiptFooter?: string
  lastBackupAt?: string
}

/**
 * Read the app config from userData/config.json.
 * Returns `null` if no config exists (first run).
 */
export function getConfig(): AppConfig | null {
  const fp = configFilePath()
  if (!fs.existsSync(fp)) return null
  try {
    const raw = fs.readFileSync(fp, 'utf-8')
    return JSON.parse(raw) as AppConfig
  } catch {
    return null
  }
}

/**
 * Save the app config to userData/config.json.
 */
export function setConfig(cfg: AppConfig): void {
  const fp = configFilePath()
  const dir = path.dirname(fp)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(fp, JSON.stringify(cfg, null, 2), 'utf-8')
}

/**
 * Determine the default data path.
 * Prefers D:\MobileHubPOS\, falls back to %USERPROFILE%\Documents\MobileHubPOS.
 */
export function getDefaultDataPath(): string {
  const dDrive = 'D:\\MobileHubPOS'
  if (fs.existsSync('D:\\')) {
    return dDrive
  }
  return path.join(app.getPath('documents'), 'MobileHubPOS')
}

/**
 * Ensure the data folder and its sub-folders (backups, receipts) exist.
 */
function ensureDataFolders(dataPath: string): void {
  for (const sub of ['', 'backups', 'receipts']) {
    const dir = sub ? path.join(dataPath, sub) : dataPath
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
}

// ─── Backup / Restore ──────────────────────────────────────────────────────

function backupTimestamp(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}-${h}${min}`
}

function cleanupOldBackups(backupDir: string, keepCount: number): void {
  try {
    const files = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith('store-') && f.endsWith('.db'))
      .sort()
      .reverse()
    for (let i = keepCount; i < files.length; i++) {
      fs.unlinkSync(path.join(backupDir, files[i]))
      console.log(`[DB] Deleted old backup: ${files[i]}`)
    }
  } catch {
    // non-critical
  }
}

/**
 * Create a backup of store.db using better-sqlite3's .backup() API.
 * Safe to call while the app is in use (WAL mode).
 * Returns the backup file path.
 */
export async function createBackup(dataPath: string): Promise<string> {
  const db = getDb()
  const backupDir = path.join(dataPath, 'backups')
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const filename = `store-${backupTimestamp()}.db`
  const backupPath = path.join(backupDir, filename)

  await db.backup(backupPath)

  const cfg = getConfig()
  if (cfg) {
    setConfig({ ...cfg, lastBackupAt: new Date().toISOString() })
  }

  cleanupOldBackups(backupDir, 30)
  console.log(`[DB] Backup created: ${filename}`)
  return backupPath
}

/**
 * Create a safety backup before restoring, then swap in the chosen backup.
 * Closes and reopens the database.
 */
export async function restoreBackup(backupPath: string, dataPath: string): Promise<void> {
  const db = getDb()

  // 1. Safety backup of current state
  const safetyDir = path.join(dataPath, 'backups')
  if (!fs.existsSync(safetyDir)) {
    fs.mkdirSync(safetyDir, { recursive: true })
  }
  const safetyFile = `store-pre-restore-${backupTimestamp()}.db`
  const safetyPath = path.join(safetyDir, safetyFile)
  await db.backup(safetyPath)
  console.log(`[DB] Safety backup created before restore: ${safetyFile}`)

  // 2. Checkpoint, close
  db.pragma('wal_checkpoint(TRUNCATE)')
  db.close()
  _db = null

  // 3. Copy backup over current DB
  const dbPath = path.join(dataPath, 'store.db')
  fs.copyFileSync(backupPath, dbPath)

  // 4. Remove stale WAL / SHM files if present
  for (const ext of ['-wal', '-shm']) {
    const p = dbPath + ext
    if (fs.existsSync(p)) fs.unlinkSync(p)
  }

  // 5. Reopen
  initDatabase({ dataPath })
  console.log(`[DB] Restored from: ${path.basename(backupPath)}`)
}

// Embedded migration SQL — used instead of reading from filesystem
// because electron-vite bundles the main process into a single JS file.
const MIGRATIONS: Array<{ version: number; name: string; sql: string }> = [
  {
    version: 1,
    name: '001_initial',
    sql: `
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        purchase_price_paisa INTEGER NOT NULL DEFAULT 0,
        sale_price_paisa INTEGER NOT NULL DEFAULT 0,
        quantity INTEGER NOT NULL DEFAULT 0,
        low_stock_threshold INTEGER NOT NULL DEFAULT 5,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS phones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand TEXT NOT NULL,
        model TEXT NOT NULL,
        imei TEXT UNIQUE NOT NULL,
        condition TEXT NOT NULL CHECK (condition IN ('new', 'used')),
        storage TEXT,
        ram TEXT,
        purchase_price_paisa INTEGER NOT NULL DEFAULT 0,
        sale_price_paisa INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'sold', 'returned')),
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone_number TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_number TEXT NOT NULL UNIQUE,
        customer_id INTEGER,
        subtotal_paisa INTEGER NOT NULL DEFAULT 0,
        discount_paisa INTEGER NOT NULL DEFAULT 0,
        total_paisa INTEGER NOT NULL DEFAULT 0,
        payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'jazzcash', 'easypaisa', 'udhaar')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      );
      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER,
        phone_id INTEGER,
        description TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price_paisa INTEGER NOT NULL DEFAULT 0,
        line_total_paisa INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (sale_id) REFERENCES sales(id),
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (phone_id) REFERENCES phones(id),
        CHECK (
          (product_id IS NOT NULL AND phone_id IS NULL)
          OR
          (product_id IS NULL AND phone_id IS NOT NULL)
        )
      );
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_id INTEGER NOT NULL,
        seller_name TEXT NOT NULL,
        seller_cnic TEXT,
        purchase_price_paisa INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (phone_id) REFERENCES phones(id)
      );
      CREATE TABLE IF NOT EXISTS customer_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        sale_id INTEGER,
        amount_paisa INTEGER NOT NULL DEFAULT 0,
        payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'jazzcash', 'easypaisa')),
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (sale_id) REFERENCES sales(id)
      );
    `
  }
]

/**
 * Run all pending SQL migrations.
 * Tracks applied versions in the `schema_version` table.
 * Uses embedded migration strings so no external SQL files are needed at runtime.
 */
function runMigrations(db: BetterSqlite3.Database): void {
  // Ensure the schema_version table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // Get currently applied version (0 if none)
  const row = db.prepare('SELECT COALESCE(MAX(version), 0) AS v FROM schema_version').get() as { v: number }
  let currentVersion = row.v

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue

    db.exec(migration.sql)
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(migration.version)
    currentVersion = migration.version
    console.log(`[DB] Applied migration: ${migration.name} (v${migration.version})`)
  }
}

/**
 * Open (or create) the SQLite database at the given path with WAL mode.
 */
export function openDatabase(dataPath: string): BetterSqlite3.Database {
  ensureDataFolders(dataPath)

  const dbPath = path.join(dataPath, 'store.db')
  const db = new BetterSqlite3(dbPath)

  // Enable WAL mode
  db.pragma('journal_mode = WAL')

  // Run pending migrations
  runMigrations(db)

  console.log(`[DB] Database opened at: ${dbPath}`)
  return db
}

/**
 * Register the app quit handler that:
 * 1. Auto-backs up the database (silent unless it fails).
 * 2. Checkpoints (truncates) the WAL file.
 * 3. Closes the database.
 *
 * Uses before-quit so we can await the async backup, then re-quit.
 */
let _quitHandlerRegistered = false

function handleBeforeQuit(e: Electron.Event): void {
  if (!_db) return

  // Prevent quit while we backup, then re-trigger quit after.
  e.preventDefault()
  app.removeListener('before-quit', handleBeforeQuit)

  // ── Auto-backup ──────────────────────────────────────────────────────
  const cfg = getConfig()
  const doBackup = async (): Promise<void> => {
    if (cfg) {
      try {
        const backupDir = path.join(cfg.dataPath, 'backups')
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true })
        }

        const filename = `store-${backupTimestamp()}.db`
        const backupPath = path.join(backupDir, filename)

        await _db!.backup(backupPath)

        setConfig({ ...cfg, lastBackupAt: new Date().toISOString() })
        cleanupOldBackups(backupDir, 30)
        console.log(`[DB] Auto-backup completed: ${filename}`)
      } catch (err) {
        console.error('[DB] Auto-backup failed:', err)
        dialog.showErrorBox(
          'Backup Failed',
          `Auto-backup failed on quit: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    // ── Checkpoint + close ───────────────────────────────────────────────
    try {
      _db!.pragma('wal_checkpoint(TRUNCATE)')
      _db!.close()
    } catch {
      /* already closed */
    }

    // ── Re-trigger quit ──────────────────────────────────────────────────
    app.quit()
  }

  doBackup()
}

export function registerQuitHandler(): void {
  if (_quitHandlerRegistered) return
  _quitHandlerRegistered = true
  app.on('before-quit', handleBeforeQuit)
}

// Singleton database instance
let _db: BetterSqlite3.Database | null = null

/**
 * Get the singleton database instance.
 * Throws if the database has not been initialised yet.
 */
export function getDb(): BetterSqlite3.Database {
  if (!_db) throw new Error('Database not initialised. Call initDatabase() first.')
  return _db
}

/**
 * Initialise the data layer:
 * 1. Read config (first-run detection — caller should handle the UI).
 * 2. Open / create the database.
 * 3. Register the quit handler.
 */
export function initDatabase(cfg: AppConfig): BetterSqlite3.Database {
  if (_db) return _db
  _db = openDatabase(cfg.dataPath)
  registerQuitHandler()
  return _db
}
