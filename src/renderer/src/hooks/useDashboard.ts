import { useQuery } from './useQuery'

export function useDashboardStats() {
  return useQuery(() => window.api.dashboard.getStats())
}

export function useDashboardLowStock() {
  return useQuery(() => window.api.dashboard.getLowStock())
}

export function useDashboardRecentSales() {
  return useQuery(() => window.api.dashboard.getRecentSales())
}
