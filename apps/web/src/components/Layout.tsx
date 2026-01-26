import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  Calendar,
  Lightbulb,
  LogOut,
  Map,
  Settings,
  User,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/services/api'

interface LayoutProps {
  children: React.ReactNode
}

const navItems = [
  { path: '/thoughts', label: 'Thoughts', icon: Lightbulb },
  { path: '/dashboard', label: 'Timeline', icon: Activity },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/locations', label: 'Locations', icon: Map },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, refreshToken, logout } = useAuthStore()

  const handleLogout = async () => {
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken)
      } catch {
        // Ignore errors during logout
      }
    }
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold text-primary-500">Teboraw</h1>
          <p className="text-sm text-slate-400 mt-1">Activity Tracker</p>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.displayName}
              </p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-slate-700 w-full mt-2 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
