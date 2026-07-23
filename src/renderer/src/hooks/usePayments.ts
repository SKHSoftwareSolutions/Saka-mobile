import { useQuery } from './useQuery'

export function usePayments() {
  return useQuery(() => window.api.payments.list())
}
