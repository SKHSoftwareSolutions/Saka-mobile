import { useState, useEffect, useCallback } from 'react'
import type { AppSettings, BackupInfo } from '../../../shared/api-types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ─── Icons ──────────────────────────────────────────────────────────────────

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function BackupIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

// ─── Modal ──────────────────────────────────────────────────────────────────

function Modal({
  open,
  onClose,
  title,
  wide,
  children
}: {
  open: boolean
  onClose: () => void
  title: string
  wide?: boolean
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-h-[90vh] overflow-y-auto ${wide ? 'max-w-2xl' : 'max-w-lg'}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Confirm Dialog ─────────────────────────────────────────────────────────

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  confirmClass?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-gray-600 mb-6 whitespace-pre-line">{message}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="h-11 px-5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`h-11 px-5 rounded-lg text-sm font-medium text-white ${confirmClass ?? 'bg-primary-600 hover:bg-primary-700'}`}
        >
          {confirmLabel ?? 'Confirm'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function Settings(): JSX.Element {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Shop form state
  const [shopName, setShopName] = useState('')
  const [receiptFooter, setReceiptFooter] = useState('')
  const [savingShop, setSavingShop] = useState(false)
  const [shopSaved, setShopSaved] = useState(false)

  // Backup state
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [backingUp, setBackingUp] = useState(false)
  const [backupSuccess, setBackupSuccess] = useState(false)

  // Restore state
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState<BackupInfo | null>(null)
  const [restoring, setRestoring] = useState(false)

  // Export state
  const [exporting, setExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)

  // Data folder state
  const [changingFolder, setChangingFolder] = useState(false)
  const [showFolderWarning, setShowFolderWarning] = useState(false)

  // ── Load settings + backups ────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [settingsRes, backupsRes] = await Promise.all([
        window.api.settings.getSettings(),
        window.api.settings.listBackups()
      ])
      if (settingsRes.success) {
        setSettings(settingsRes.data)
        setShopName(settingsRes.data.shopName)
        setReceiptFooter(settingsRes.data.receiptFooter)
      }
      if (backupsRes.success) {
        setBackups(backupsRes.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Save shop settings ─────────────────────────────────────────────────
  const handleSaveShop = async () => {
    setSavingShop(true)
    setShopSaved(false)
    try {
      const res = await window.api.settings.saveSettings({
        shopName: shopName.trim(),
        receiptFooter: receiptFooter.trim()
      })
      if (!res.success) throw new Error(res.error)
      setShopSaved(true)
      setTimeout(() => setShopSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingShop(false)
    }
  }

  // ── Backup now ─────────────────────────────────────────────────────────
  const handleBackupNow = async () => {
    setBackingUp(true)
    setBackupSuccess(false)
    try {
      const res = await window.api.settings.backupNow()
      if (!res.success) throw new Error(res.error)
      setBackupSuccess(true)
      setTimeout(() => setBackupSuccess(false), 3000)
      // Refresh backups list
      const listRes = await window.api.settings.listBackups()
      if (listRes.success) setBackups(listRes.data)
      // Refresh settings to get updated lastBackupAt
      const settingsRes = await window.api.settings.getSettings()
      if (settingsRes.success) setSettings(settingsRes.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup failed')
    } finally {
      setBackingUp(false)
    }
  }

  // ── Restore ────────────────────────────────────────────────────────────
  const handleRestore = async () => {
    if (!restoreTarget) return
    setRestoring(true)
    try {
      const res = await window.api.settings.restoreBackup(restoreTarget.filename)
      if (!res.success) throw new Error(res.error)
      // Reload the app after restore
      window.location.reload()
    } catch (err) {
      setRestoring(false)
      setError(err instanceof Error ? err.message : 'Restore failed')
      setShowRestoreModal(false)
    }
  }

  // ── Export to folder ───────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true)
    setExportSuccess(false)
    try {
      const folderRes = await window.api.settings.pickFolder()
      if (!folderRes.success || !folderRes.data) {
        setExporting(false)
        return
      }
      const res = await window.api.settings.exportToFolder(folderRes.data)
      if (!res.success) throw new Error(res.error)
      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  // ── Change data folder ─────────────────────────────────────────────────
  const handleChangeFolder = async () => {
    setChangingFolder(true)
    try {
      const folderRes = await window.api.settings.changeDataFolder()
      if (!folderRes.success || !folderRes.data) {
        setChangingFolder(false)
        return
      }
      // Apply the new folder
      const applyRes = await window.api.setup.setConfig(folderRes.data)
      if (!applyRes.success) throw new Error(applyRes.error)
      // Reload the app
      window.location.reload()
    } catch (err) {
      setChangingFolder(false)
      setError(err instanceof Error ? err.message : 'Failed to change folder')
    }
  }

  const inputClass =
    'w-full h-11 px-3 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  // ── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-gray-200 rounded-lg animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 h-40 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error && !settings) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">Failed to load settings</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button
          onClick={loadData}
          className="h-11 mt-4 px-5 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Configure your shop and manage backups</p>
      </div>

      {/* Global error toast */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-center justify-between">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 ml-3"
          >
            <CloseIcon />
          </button>
        </div>
      )}

      {/* ── Shop Settings ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Shop Settings</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={labelClass}>Shop Name</label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="e.g. Mobile Hub"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Receipt Footer Text</label>
            <textarea
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              placeholder="e.g. Thank you for your purchase! Exchange within 7 days."
              rows={3}
              className={`${inputClass} h-auto py-2.5 resize-none`}
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSaveShop}
              disabled={savingShop}
              className="h-11 px-5 rounded-lg bg-primary-600 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {savingShop ? 'Saving...' : 'Save Settings'}
            </button>
            {shopSaved && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <CheckCircleIcon />
                Saved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Data Folder ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Data Folder</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={labelClass}>Current Data Location</label>
            <div className="flex items-center gap-2 h-11 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-600 font-mono">
              <FolderIcon />
              <span className="truncate">{settings?.dataPath ?? '...'}</span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-sm text-amber-800">
              <strong>Warning:</strong> Changing the data folder only repoints the app to a new
              location. It does <strong>NOT</strong> move your existing data. To migrate data, first
              use &ldquo;Backup to USB / External Drive&rdquo;, then change the folder, then restore
              from the backup.
            </p>
          </div>

          <button
            onClick={() => setShowFolderWarning(true)}
            disabled={changingFolder}
            className="h-11 px-5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
          >
            <FolderIcon />
            {changingFolder ? 'Changing...' : 'Change Data Folder'}
          </button>
        </div>
      </div>

      {/* ── Backup ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Backup</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Last backup */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-5 py-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Last Backup</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">
                {settings?.lastBackupAt
                  ? `${formatDateTime(settings.lastBackupAt)} (${timeAgo(settings.lastBackupAt)})`
                  : 'Never'}
              </p>
            </div>
            {settings?.lastBackupAt && <CheckCircleIcon />}
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleBackupNow}
              disabled={backingUp}
              className="h-11 px-5 rounded-lg bg-primary-600 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              <BackupIcon />
              {backingUp ? 'Backing up...' : 'Backup Now'}
            </button>
            {backupSuccess && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <CheckCircleIcon />
                Backup created
              </span>
            )}
          </div>

          {/* Backup to USB */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-600 mb-3">
              Export your database and all backups to a USB drive or external folder.
            </p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="h-11 px-5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
            >
              <DownloadIcon />
              {exporting ? 'Exporting...' : 'Backup to USB / External Drive'}
            </button>
            {exportSuccess && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium mt-2">
                <CheckCircleIcon />
                Export complete
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Restore ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Restore from Backup</h2>
        </div>
        <div className="px-6 py-5">
          {backups.length === 0 ? (
            <p className="text-sm text-gray-500">No backups available yet.</p>
          ) : (
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_100px_160px_100px] gap-2 px-4 py-2.5 bg-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span>Filename</span>
                <span>Size</span>
                <span>Created</span>
                <span></span>
              </div>
              <div className="divide-y divide-gray-200">
                {backups.map((backup) => (
                  <div
                    key={backup.filename}
                    className="grid grid-cols-[1fr_100px_160px_100px] gap-2 px-4 py-3 items-center"
                  >
                    <span className="text-sm font-mono text-gray-900 truncate">
                      {backup.filename}
                    </span>
                    <span className="text-sm text-gray-600">{formatBytes(backup.sizeBytes)}</span>
                    <span className="text-sm text-gray-600">
                      {formatDateTime(backup.createdAt)}
                    </span>
                    <button
                      onClick={() => {
                        setRestoreTarget(backup)
                        setShowRestoreModal(true)
                      }}
                      className="h-8 px-3 rounded-lg text-xs font-medium text-primary-600 hover:bg-primary-50 border border-primary-200"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Restore Confirm Modal ──────────────────────────────────────── */}
      <ConfirmDialog
        open={showRestoreModal}
        title="Restore Backup"
        message={`You are about to restore from:\n\n${restoreTarget?.filename}\n\nThis will REPLACE all current data with the backup. A safety backup of the current data will be created automatically before restoring.\n\nThe app will reload after the restore completes.`}
        confirmLabel={restoring ? 'Restoring...' : 'Restore & Reload'}
        confirmClass="bg-amber-600 hover:bg-amber-700"
        onConfirm={handleRestore}
        onCancel={() => {
          setShowRestoreModal(false)
          setRestoreTarget(null)
        }}
      />

      {/* ── Change Folder Warning Modal ────────────────────────────────── */}
      <ConfirmDialog
        open={showFolderWarning}
        title="Change Data Folder"
        message={`This will point the app to a different folder for data storage.\n\nIt does NOT move your existing data. Your current data will remain at:\n\n${settings?.dataPath}\n\nIf you want to migrate your data:\n1. Use "Backup to USB / External Drive" first\n2. Change to the new folder\n3. Use "Restore from Backup" to load your data\n\nThe app will reload after changing the folder.`}
        confirmLabel={changingFolder ? 'Changing...' : 'Change Folder'}
        confirmClass="bg-amber-600 hover:bg-amber-700"
        onConfirm={handleChangeFolder}
        onCancel={() => setShowFolderWarning(false)}
      />
    </div>
  )
}
