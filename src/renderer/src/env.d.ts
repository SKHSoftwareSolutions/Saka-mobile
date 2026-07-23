import type { AppApi } from '../../shared/api-types'

declare global {
  interface Window {
    api: AppApi
  }
}
