import { useQuery } from './useQuery'

export function usePurchases() {
  return useQuery(() => window.api.purchases.list())
}

export function usePurchasesWithPhone() {
  return useQuery(() => window.api.purchases.getAllWithPhone())
}
