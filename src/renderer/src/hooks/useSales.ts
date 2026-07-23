import { useState, useCallback, useEffect } from 'react'
import { useQuery } from './useQuery'
import type { SaleItemRow } from '../../../shared/api-types'

export function useSales() {
  return useQuery(() => window.api.sales.list())
}

export function useSaleItems(saleId: number | null) {
  return useQuery(
    () => (saleId ? window.api.sales.getItems(saleId) : null),
    [saleId]
  )
}

export function useSaleItemsBulk(saleIds: number[]) {
  const [results, setResults] = useState<Map<number, SaleItemRow[]>>(new Map())
  const [loading, setLoading] = useState(false)

  const fetchItems = useCallback(async (ids: number[]) => {
    if (ids.length === 0) return
    setLoading(true)
    const map = new Map<number, SaleItemRow[]>()
    await Promise.all(
      ids.map(async (id) => {
        const res = await window.api.sales.getItems(id)
        if (res.success) map.set(id, res.data)
      })
    )
    setResults(map)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchItems(saleIds)
  }, [saleIds, fetchItems])

  return { results, loading }
}
