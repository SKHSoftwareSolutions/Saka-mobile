import { useState, useEffect, useCallback } from 'react'
import type { AppSettings } from '../../../shared/api-types'

export interface UseSettingsResult {
  data: AppSettings | null
  loading: boolean
  refetch: () => void
}

export function useSettings(): UseSettingsResult {
  const [data, setData] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [trigger, setTrigger] = useState(0)

  const refetch = useCallback(() => setTrigger((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    window.api.settings
      .getSettings()
      .then((res) => {
        if (cancelled) return
        if (res.success) {
          setData(res.data)
        }
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [trigger])

  return { data, loading, refetch }
}
