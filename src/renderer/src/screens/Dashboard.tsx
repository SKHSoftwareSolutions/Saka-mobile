import { useDashboardStats, useDashboardLowStock, useDashboardRecentSales } from '../hooks/useDashboard'
import { formatPKR } from '../../../shared/format'

function StatCard({
  label,
  value,
  icon,
  color
}: {
  label: string
  value: string | number
  icon: string
  color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gray-200" />
              <div className="space-y-2 flex-1">
                <div className="h-3 bg-gray-200 rounded w-20" />
                <div className="h-7 bg-gray-200 rounded w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-64" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-64" />
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
      <p className="text-red-600 font-medium">Failed to load dashboard</p>
      <p className="text-red-500 text-sm mt-1">{message}</p>
    </div>
  )
}

export default function Dashboard(): JSX.Element {
  const { data: stats, loading: statsLoading, error: statsError } = useDashboardStats()
  const { data: lowStock, loading: lowStockLoading, error: lowStockError } = useDashboardLowStock()
  const { data: recentSales, loading: salesLoading, error: salesError } = useDashboardRecentSales()

  if (statsLoading || lowStockLoading || salesLoading) {
    return <LoadingSkeleton />
  }

  if (statsError) return <ErrorState message={statsError} />
  if (lowStockError) return <ErrorState message={lowStockError} />
  if (salesError) return <ErrorState message={salesError} />

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your shop&apos;s performance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Sales"
          value={formatPKR(stats?.todaySalesTotal ?? 0)}
          icon="PKR"
          color="bg-primary-100 text-primary-700"
        />
        <StatCard
          label="Sales Today"
          value={stats?.todaySaleCount ?? 0}
          icon="#"
          color="bg-blue-100 text-blue-700"
        />
        <StatCard
          label="Low Stock Items"
          value={stats?.lowStockCount ?? 0}
          icon="!"
          color="bg-amber-100 text-amber-700"
        />
        <StatCard
          label="Phones In Stock"
          value={stats?.phonesInStockCount ?? 0}
          icon="P"
          color="bg-purple-100 text-purple-700"
        />
      </div>

      {/* Low stock + Recent sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low stock alerts */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Low Stock Alerts</h2>
          </div>
          {lowStock && lowStock.length > 0 ? (
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {lowStock.map((item) => (
                <div key={item.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.category}</p>
                  </div>
                  <span
                    className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${
                      item.quantity === 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {item.quantity} left
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-gray-400">
              <p className="text-sm">All items are well-stocked</p>
            </div>
          )}
        </div>

        {/* Recent sales */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Recent Sales</h2>
          </div>
          {recentSales && recentSales.length > 0 ? (
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {recentSales.map((sale) => (
                <div key={sale.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{sale.receipt_number}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(sale.created_at).toLocaleString('en-PK', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}{' '}
                      &middot; {sale.payment_method}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatPKR(sale.total_paisa)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-gray-400">
              <p className="text-sm">No sales yet today</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
