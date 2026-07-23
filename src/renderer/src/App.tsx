import { useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import PlaceholderScreen from './components/PlaceholderScreen'
import Login from './screens/Login'
import Dashboard from './screens/Dashboard'
import Accessories from './screens/Accessories'
import Phones from './screens/Phones'
import Purchases from './screens/Purchases'
import Customers from './screens/Customers'
import Settings from './screens/Settings'
import type { NavRoute } from '../../shared/types'

const sidebarLinks: { label: string; route: NavRoute }[] = [
  { label: 'Dashboard', route: 'dashboard' },
  { label: 'New Sale', route: 'new-sale' },
  { label: 'Accessories', route: 'accessories' },
  { label: 'Phones', route: 'phones' },
  { label: 'Purchases', route: 'purchases' },
  { label: 'Sales History', route: 'sales-history' },
  { label: 'Customers', route: 'customers' },
  { label: 'Settings', route: 'settings' }
]

function App(): JSX.Element {
  const [loggedIn, setLoggedIn] = useState(false)

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />
  }

  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden">
        <Sidebar links={sidebarLinks} onLogout={() => setLoggedIn(false)} />
        <main className="flex-1 overflow-auto p-6 bg-gray-50">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/accessories" element={<Accessories />} />
            <Route path="/phones" element={<Phones />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/settings" element={<Settings />} />
            {sidebarLinks
              .filter(
                (l) =>
                  l.route !== 'dashboard' &&
                  l.route !== 'accessories' &&
                  l.route !== 'phones' &&
                  l.route !== 'purchases' &&
                  l.route !== 'customers' &&
                  l.route !== 'settings'
              )
              .map(({ label, route }) => (
                <Route
                  key={route}
                  path={`/${route}`}
                  element={<PlaceholderScreen title={label} />}
                />
              ))}
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}

export default App
