import { useQuery } from './useQuery'

export function useCustomers() {
  return useQuery(() => window.api.customers.list())
}

export function useCustomersWithBalance() {
  return useQuery(() => window.api.customers.getWithBalance())
}
