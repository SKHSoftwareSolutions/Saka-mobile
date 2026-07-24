import { NavLink } from 'react-router-dom'
import type { NavRoute } from '../../../shared/types'

interface SidebarLink {
  label: string
  route: NavRoute
}

interface SidebarProps {
  links: SidebarLink[]
  onLogout: () => void
}

function Sidebar({ links, onLogout }: SidebarProps): JSX.Element {
  return (
    <aside className="w-sidebar bg-primary-800 text-white flex flex-col shrink-0">
      {/* Brand */}
      <div className="px-5 py-6 border-b border-primary-700">
        <h1 className="text-xl font-bold tracking-tight">Saka Mobiles</h1>
        <p className="text-primary-200 text-sm mt-0.5">Phone Shop Management</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {links.map(({ label, route }) => (
          <NavLink
            key={route}
            to={`/${route}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-700 text-white'
                  : 'text-primary-100 hover:bg-primary-700/50 hover:text-white'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-primary-700 text-primary-300 text-xs space-y-3">
        <p>v0.1.0 — Offline POS</p>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-primary-200 hover:bg-primary-700/50 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  )
}

export default Sidebar

