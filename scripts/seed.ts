/**
 * Dev seed script - inserts realistic sample data into the Mobile Hub POS database.
 *
 * Usage: npm run seed
 * Can also accept a direct data path: npx tsx scripts/seed.ts --path=D:\\MobileHubPOS
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import BetterSqlite3 from 'better-sqlite3'

// --- Embedded schema SQL (avoids filesystem dependency at runtime) ---

const SCHEMA_SQL: string = [
  'CREATE TABLE IF NOT EXISTS schema_version (',
  '  version INTEGER PRIMARY KEY,',
  '  applied_at TEXT NOT NULL DEFAULT (datetime(\'now\'))',
  ');',
  'CREATE TABLE IF NOT EXISTS products (',
  '  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL,',
  '  purchase_price_paisa INTEGER NOT NULL DEFAULT 0, sale_price_paisa INTEGER NOT NULL DEFAULT 0,',
  '  quantity INTEGER NOT NULL DEFAULT 0, low_stock_threshold INTEGER NOT NULL DEFAULT 5,',
  '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\')),',
  '  updated_at TEXT NOT NULL DEFAULT (datetime(\'now\'))',
  ');',
  'CREATE TABLE IF NOT EXISTS phones (',
  '  id INTEGER PRIMARY KEY AUTOINCREMENT, brand TEXT NOT NULL, model TEXT NOT NULL,',
  '  imei TEXT UNIQUE NOT NULL,',
  '  condition TEXT NOT NULL CHECK (condition IN (\'new\',\'used\')),',
  '  storage TEXT, ram TEXT, purchase_price_paisa INTEGER NOT NULL DEFAULT 0,',
  '  sale_price_paisa INTEGER NOT NULL DEFAULT 0,',
  '  status TEXT NOT NULL DEFAULT \'in_stock\' CHECK (status IN (\'in_stock\',\'sold\',\'returned\')),',
  '  notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime(\'now\')),',
  '  updated_at TEXT NOT NULL DEFAULT (datetime(\'now\'))',
  ');',
  'CREATE TABLE IF NOT EXISTS customers (',
  '  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone_number TEXT,',
  '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\'))',
  ');',
  'CREATE TABLE IF NOT EXISTS sales (',
  '  id INTEGER PRIMARY KEY AUTOINCREMENT, receipt_number TEXT NOT NULL UNIQUE,',
  '  customer_id INTEGER, subtotal_paisa INTEGER NOT NULL DEFAULT 0,',
  '  discount_paisa INTEGER NOT NULL DEFAULT 0, total_paisa INTEGER NOT NULL DEFAULT 0,',
  '  payment_method TEXT NOT NULL CHECK (payment_method IN (\'cash\',\'jazzcash\',\'easypaisa\',\'udhaar\')),',
  '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\')),',
  '  FOREIGN KEY (customer_id) REFERENCES customers(id)',
  ');',
  'CREATE TABLE IF NOT EXISTS sale_items (',
  '  id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id INTEGER NOT NULL,',
  '  product_id INTEGER, phone_id INTEGER, description TEXT NOT NULL,',
  '  quantity INTEGER NOT NULL DEFAULT 1, unit_price_paisa INTEGER NOT NULL DEFAULT 0,',
  '  line_total_paisa INTEGER NOT NULL DEFAULT 0,',
  '  FOREIGN KEY (sale_id) REFERENCES sales(id),',
  '  FOREIGN KEY (product_id) REFERENCES products(id),',
  '  FOREIGN KEY (phone_id) REFERENCES phones(id),',
  '  CHECK ((product_id IS NOT NULL AND phone_id IS NULL)',
  '    OR (product_id IS NULL AND phone_id IS NOT NULL))',
  ');',
  'CREATE TABLE IF NOT EXISTS purchases (',
  '  id INTEGER PRIMARY KEY AUTOINCREMENT, phone_id INTEGER NOT NULL,',
  '  seller_name TEXT NOT NULL, seller_cnic TEXT,',
  '  purchase_price_paisa INTEGER NOT NULL DEFAULT 0, notes TEXT,',
  '  created_at TEXT NOT NULL DEFAULT (datetime(\'now\')),',
  '  FOREIGN KEY (phone_id) REFERENCES phones(id)',
  ');',
  'CREATE TABLE IF NOT EXISTS customer_payments (',
  '  id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL,',
  '  sale_id INTEGER, amount_paisa INTEGER NOT NULL DEFAULT 0,',
  '  payment_method TEXT NOT NULL CHECK (payment_method IN (\'cash\',\'jazzcash\',\'easypaisa\')),',
  '  notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime(\'now\')),',
  '  FOREIGN KEY (customer_id) REFERENCES customers(id),',
  '  FOREIGN KEY (sale_id) REFERENCES sales(id)',
  ');'
].join('\n')

// --- helpers ---

function findConfigPath(): string | null {
  const candidates = [
    path.join(os.homedir(), 'AppData', 'Roaming', 'mobile-hub-pos', 'config.json'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'Saka-Mobile', 'config.json'),
  ]
  for (const fp of candidates) {
    if (fs.existsSync(fp)) return fp
  }
  return null
}

function getDataPath(): string {
  const arg = process.argv.find((a) => a.startsWith('--path='))
  if (arg) return arg.slice(7)

  const cfgPath = findConfigPath()
  if (cfgPath) {
    try {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'))
      if (cfg.dataPath) return cfg.dataPath
    } catch { /* ignore */ }
  }

  if (fs.existsSync('D:\\')) return 'D:\\MobileHubPOS'
  return path.join(os.homedir(), 'Documents', 'MobileHubPOS')
}

function runSchema(db: BetterSqlite3.Database): void {
  const row = db.prepare(
    "SELECT COALESCE(MAX(version), 0) AS v FROM schema_version"
  ).get() as { v: number } | undefined

  // If schema_version doesn't exist yet, create everything fresh
  if (!row) {
    db.exec(SCHEMA_SQL)
    db.prepare("INSERT INTO schema_version (version) VALUES (1)").run()
    console.log('[Seed] Applied schema migration v1')
  } else {
    console.log('[Seed] Schema already applied (v' + row.v + '), skipping')
  }
}

// --- data generation ---

function seed(db: BetterSqlite3.Database): void {
  console.log('[Seed] Inserting sample data...')

  // Products (accessories) - values in paisa (100 paisa = 1 rupee)
  const productData = [
    { name: 'Samsung 25W Fast Charger', cat: 'Chargers', buy: 80000, sell: 150000 },
    { name: 'Apple 20W USB-C Charger', cat: 'Chargers', buy: 120000, sell: 250000 },
    { name: 'Anker 65W GaN Charger', cat: 'Chargers', buy: 250000, sell: 450000 },
    { name: 'Type-C 3A Fast Charging Cable (1m)', cat: 'Cables', buy: 15000, sell: 35000 },
    { name: 'Lightning to USB Cable (1m)', cat: 'Cables', buy: 20000, sell: 45000 },
    { name: 'USB to Micro-USB Cable (1m)', cat: 'Cables', buy: 10000, sell: 25000 },
    { name: 'Silicone Back Cover for Samsung S24', cat: 'Covers', buy: 25000, sell: 60000 },
    { name: 'iPhone 15 Pro Max Leather Case', cat: 'Covers', buy: 50000, sell: 120000 },
    { name: 'Clear TPU Case for Pixel 8', cat: 'Covers', buy: 15000, sell: 40000 },
    { name: 'Tempered Glass for Samsung S24 Ultra', cat: 'Tempered Glass', buy: 20000, sell: 50000 },
    { name: 'Privacy Tempered Glass for iPhone 15', cat: 'Tempered Glass', buy: 35000, sell: 80000 },
    { name: 'Samsung Galaxy Buds FE', cat: 'Headphones', buy: 600000, sell: 1100000 },
    { name: 'Apple EarPods USB-C', cat: 'Headphones', buy: 400000, sell: 800000 },
    { name: 'Anker Soundcore R50i', cat: 'Headphones', buy: 250000, sell: 550000 },
  ]

  const insProd = db.prepare([
    'INSERT INTO products (name, category, purchase_price_paisa, sale_price_paisa, quantity, low_stock_threshold)',
    'VALUES (@name, @cat, @buy, @sell, @qty, 5)'
  ].join(' '))

  for (const p of productData) {
    insProd.run({
      name: p.name,
      cat: p.cat,
      buy: p.buy,
      sell: p.sell,
      qty: 10 + Math.floor(Math.random() * 20)
    })
  }

  // Phones
  const phoneData = [
    { brand: 'Samsung', model: 'Galaxy S24 Ultra', imei: '351234561234561', cond: 'new', stor: '512GB', ram: '12GB', buy: 3000000, sell: 3800000 },
    { brand: 'Samsung', model: 'Galaxy A55 5G', imei: '351234561234562', cond: 'new', stor: '256GB', ram: '8GB', buy: 1400000, sell: 1800000 },
    { brand: 'Samsung', model: 'Galaxy A15', imei: '351234561234563', cond: 'new', stor: '128GB', ram: '6GB', buy: 500000, sell: 700000 },
    { brand: 'Apple', model: 'iPhone 15 Pro Max', imei: '356789012345671', cond: 'used', stor: '256GB', ram: '8GB', buy: 3000000, sell: 3700000 },
    { brand: 'Apple', model: 'iPhone 14', imei: '356789012345672', cond: 'used', stor: '128GB', ram: '6GB', buy: 2000000, sell: 2600000 },
    { brand: 'Apple', model: 'iPhone 13', imei: '356789012345673', cond: 'used', stor: '128GB', ram: '4GB', buy: 1500000, sell: 2000000 },
    { brand: 'Xiaomi', model: 'Redmi Note 13 Pro', imei: '357891234567891', cond: 'new', stor: '256GB', ram: '8GB', buy: 800000, sell: 1100000 },
    { brand: 'Infinix', model: 'Hot 40 Pro', imei: '357891234567892', cond: 'new', stor: '256GB', ram: '8GB', buy: 400000, sell: 600000 },
    { brand: 'Tecno', model: 'Camon 20 Pro', imei: '357891234567893', cond: 'new', stor: '256GB', ram: '8GB', buy: 450000, sell: 650000 },
    { brand: 'Google', model: 'Pixel 8', imei: '357891234567894', cond: 'used', stor: '128GB', ram: '8GB', buy: 1800000, sell: 2400000 },
  ]

  const insPhone = db.prepare([
    'INSERT INTO phones (brand, model, imei, condition, storage, ram,',
    '  purchase_price_paisa, sale_price_paisa, status)',
    'VALUES (@brand, @model, @imei, @cond, @stor, @ram, @buy, @sell, \'in_stock\')'
  ].join(' '))

  for (const p of phoneData) {
    insPhone.run({
      brand: p.brand, model: p.model, imei: p.imei, cond: p.cond,
      stor: p.stor, ram: p.ram, buy: p.buy, sell: p.sell
    })
  }

  // Customers
  const customerData = [
    { name: 'Ahmed Ali', phone: '+92-300-1234567' },
    { name: 'Sara Khan', phone: '+92-321-7654321' },
    { name: 'Bilal Hussain', phone: '+92-333-9876543' },
  ]

  const insCust = db.prepare('INSERT INTO customers (name, phone_number) VALUES (@name, @phone)')
  for (const c of customerData) {
    insCust.run({ name: c.name, phone: c.phone })
  }

  console.log('[Seed] Sample data inserted successfully!')
  console.log('[Seed]   Products: ' + productData.length)
  console.log('[Seed]   Phones: ' + phoneData.length)
  console.log('[Seed]   Customers: ' + customerData.length)
}

// --- main ---

function main(): void {
  const dataPath = getDataPath()
  console.log('[Seed] Data path: ' + dataPath)

  // Ensure folders exist
  for (const sub of ['', 'backups', 'receipts']) {
    const dir = sub ? path.join(dataPath, sub) : dataPath
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  }

  const dbPath = path.join(dataPath, 'store.db')
  const isNew = !fs.existsSync(dbPath)
  console.log('[Seed] Database: ' + dbPath + ' (' + (isNew ? 'new' : 'existing') + ')')

  const db = new BetterSqlite3(dbPath)
  db.pragma('journal_mode = WAL')

  runSchema(db)

  // Skip seed if data already exists
  const existingProducts = (db.prepare('SELECT COUNT(*) AS c FROM products').get() as { c: number }).c
  if (existingProducts > 0) {
    console.log('[Seed] Data already seeded (' + existingProducts + ' products found), skipping insert')
  } else {
    seed(db)
  }

  // Verify data
  const productCount = (db.prepare('SELECT COUNT(*) AS c FROM products').get() as { c: number }).c
  const phoneCount = (db.prepare('SELECT COUNT(*) AS c FROM phones').get() as { c: number }).c
  const customerCount = (db.prepare('SELECT COUNT(*) AS c FROM customers').get() as { c: number }).c

  console.log('[Seed] ===== VERIFICATION =====')
  console.log('[Seed]   Products:    ' + productCount)
  console.log('[Seed]   Phones:      ' + phoneCount)
  console.log('[Seed]   Customers:   ' + customerCount)
  console.log('[Seed] ========================')
  console.log('[Seed] Seed complete!')

  db.close()
}

main()
