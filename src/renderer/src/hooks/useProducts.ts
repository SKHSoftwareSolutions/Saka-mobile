import { useQuery } from './useQuery'

export function useProducts() {
  return useQuery(() => window.api.products.list())
}

export function useLowStock() {
  return useQuery(() => window.api.products.getLowStock())
}
