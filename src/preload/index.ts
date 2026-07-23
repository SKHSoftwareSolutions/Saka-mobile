import { contextBridge, ipcRenderer } from 'electron'
import type { AppApi } from '../shared/api-types'

const api: AppApi = {
  products: {
    list: () => ipcRenderer.invoke('products:list'),
    getById: (id) => ipcRenderer.invoke('products:getById', id),
    create: (input) => ipcRenderer.invoke('products:create', input),
    update: (id, input) => ipcRenderer.invoke('products:update', id, input),
    delete: (id) => ipcRenderer.invoke('products:delete', id),
    getLowStock: () => ipcRenderer.invoke('products:getLowStock')
  },

  phones: {
    list: () => ipcRenderer.invoke('phones:list'),
    getInStock: () => ipcRenderer.invoke('phones:getInStock'),
    getById: (id) => ipcRenderer.invoke('phones:getById', id),
    create: (input) => ipcRenderer.invoke('phones:create', input),
    update: (id, input) => ipcRenderer.invoke('phones:update', id, input),
    delete: (id) => ipcRenderer.invoke('phones:delete', id),
    getPurchases: (phoneId) => ipcRenderer.invoke('phones:getPurchases', phoneId),
    getSaleInfo: (phoneId) => ipcRenderer.invoke('phones:getSaleInfo', phoneId)
  },

  customers: {
    list: () => ipcRenderer.invoke('customers:list'),
    getById: (id) => ipcRenderer.invoke('customers:getById', id),
    search: (query) => ipcRenderer.invoke('customers:search', query),
    create: (input) => ipcRenderer.invoke('customers:create', input),
    update: (id, input) => ipcRenderer.invoke('customers:update', id, input),
    delete: (id) => ipcRenderer.invoke('customers:delete', id),
    getWithBalance: () => ipcRenderer.invoke('customers:getWithBalance')
  },

  sales: {
    list: () => ipcRenderer.invoke('sales:list'),
    getById: (id) => ipcRenderer.invoke('sales:getById', id),
    getItems: (saleId) => ipcRenderer.invoke('sales:getItems', saleId),
    getByCustomer: (customerId) => ipcRenderer.invoke('sales:getByCustomer', customerId),
    create: (input) => ipcRenderer.invoke('sales:create', input),
    delete: (id) => ipcRenderer.invoke('sales:delete', id)
  },

  purchases: {
    list: () => ipcRenderer.invoke('purchases:list'),
    getById: (id) => ipcRenderer.invoke('purchases:getById', id),
    create: (input) => ipcRenderer.invoke('purchases:create', input),
    update: (id, input) => ipcRenderer.invoke('purchases:update', id, input),
    delete: (id) => ipcRenderer.invoke('purchases:delete', id),
    getAllWithPhone: () => ipcRenderer.invoke('purchases:getAllWithPhone'),
    createWithPhone: (input) => ipcRenderer.invoke('purchases:createWithPhone', input)
  },

  payments: {
    list: () => ipcRenderer.invoke('payments:list'),
    getById: (id) => ipcRenderer.invoke('payments:getById', id),
    getByCustomer: (customerId) => ipcRenderer.invoke('payments:getByCustomer', customerId),
    create: (input) => ipcRenderer.invoke('payments:create', input),
    delete: (id) => ipcRenderer.invoke('payments:delete', id)
  },

  dashboard: {
    getStats: () => ipcRenderer.invoke('dashboard:getStats'),
    getLowStock: () => ipcRenderer.invoke('dashboard:getLowStock'),
    getRecentSales: () => ipcRenderer.invoke('dashboard:getRecentSales')
  },

  setup: {
    getConfig: () => ipcRenderer.invoke('db:get-config'),
    getDefaultPath: () => ipcRenderer.invoke('db:get-default-path'),
    setConfig: (dataPath) => ipcRenderer.invoke('db:set-config', dataPath),
    verify: () => ipcRenderer.invoke('db:verify')
  },

  settings: {
    getSettings: () => ipcRenderer.invoke('settings:getSettings'),
    saveSettings: (settings) => ipcRenderer.invoke('settings:saveSettings', settings),
    getDataPath: () => ipcRenderer.invoke('settings:getDataPath'),
    changeDataFolder: () => ipcRenderer.invoke('settings:changeDataFolder'),
    backupNow: () => ipcRenderer.invoke('settings:backupNow'),
    listBackups: () => ipcRenderer.invoke('settings:listBackups'),
    restoreBackup: (filename) => ipcRenderer.invoke('settings:restoreBackup', filename),
    exportToFolder: (targetFolder) => ipcRenderer.invoke('settings:exportToFolder', targetFolder),
    pickFolder: () => ipcRenderer.invoke('settings:pickFolder')
  },

  logError: (payload: string) => {
    ipcRenderer.send('log:error', payload)
  }
}

contextBridge.exposeInMainWorld('api', api)
