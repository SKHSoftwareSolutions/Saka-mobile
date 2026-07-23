import { app, BrowserWindow, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { getConfig, setConfig, getDefaultDataPath, initDatabase, getDb } from './db/database'
import { registerIpcHandlers } from './ipc'

let mainWindow: BrowserWindow | null = null

// ─── Main-process error logging ─────────────────────────────────────────────
function logCrash(err: unknown): void {
  const timestamp = new Date().toISOString()
  const message = err instanceof Error ? err.stack ?? err.message : String(err)
  const line = `[${timestamp}] [main] ${message}\n`

  try {
    const cfg = getConfig()
    const logDir = cfg?.dataPath ?? getDefaultDataPath()
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
    fs.appendFileSync(path.join(logDir, 'error.log'), line, 'utf-8')
  } catch {
    // Can't log — nowhere to write
  }

  console.error(`[CRASH] ${message}`)
}

process.on('uncaughtException', (err) => {
  logCrash(err)
})

process.on('unhandledRejection', (reason) => {
  logCrash(reason)
})

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

// Register all IPC handlers before the window loads
registerIpcHandlers()

app.whenReady().then(() => {
  let cfg = getConfig()
  if (!cfg) {
    const defaultPath = getDefaultDataPath()
    setConfig({ dataPath: defaultPath })
    cfg = { dataPath: defaultPath }
    console.log(`[DB] No config found — initialised with default path: ${defaultPath}`)
  }
  initDatabase(cfg)

  try {
    const db = getDb()
    const productCount = (db.prepare('SELECT COUNT(*) AS c FROM products').get() as { c: number }).c
    const phoneCount = (db.prepare('SELECT COUNT(*) AS c FROM phones').get() as { c: number }).c
    const customerCount = (db.prepare('SELECT COUNT(*) AS c FROM customers').get() as { c: number }).c
    console.log('[DB] ===== DEV VERIFICATION =====')
    console.log(`[DB]   Products:    ${productCount}`)
    console.log(`[DB]   Phones:      ${phoneCount}`)
    console.log(`[DB]   Customers:   ${customerCount}`)
    console.log('[DB] =============================')
  } catch {
    console.log('[DB] Database not yet seeded (first run with empty DB)')
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
