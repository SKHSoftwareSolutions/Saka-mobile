import { useQuery } from './useQuery'

export function usePhones() {
  return useQuery(() => window.api.phones.list())
}

export function usePhonesInStock() {
  return useQuery(() => window.api.phones.getInStock())
}

export function usePhonePurchases(phoneId: number | null) {
  return useQuery(
    () => (phoneId ? window.api.phones.getPurchases(phoneId) : null),
    [phoneId]
  )
}

export function usePhoneSaleInfo(phoneId: number | null) {
  return useQuery(
    () => (phoneId ? window.api.phones.getSaleInfo(phoneId) : null),
    [phoneId]
  )
}
