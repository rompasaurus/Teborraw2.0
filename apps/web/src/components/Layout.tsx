import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
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

// Custom Teboraw logo icon - a stylized "T" with activity waves
function TeborawIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer circle */}
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
      {/* Stylized T */}
      <path
        d="M10 10H22M16 10V24"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Activity wave on the left */}
      <path
        d="M8 18L10 15L12 19L14 16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      {/* Activity wave on the right */}
      <path
        d="M18 16L20 19L22 15L24 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  )
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
  const [isCollapsed, setIsCollapsed] = useState(false)

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
      <aside
        className={`${
          isCollapsed ? 'w-16' : 'w-64'
        } bg-slate-800 border-r border-slate-700 flex flex-col transition-all duration-300`}
      >
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
            <TeborawIcon className="w-8 h-8 text-primary-500 flex-shrink-0" />
            {!isCollapsed && (
              <div>
                <h1 className="text-xl font-bold text-primary-500">Teboraw</h1>
                <p className="text-xs text-slate-400">Activity Tracker</p>
              </div>
            )}
          </div>
        </div>

        {/* Collapse toggle button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-20 -right-3 w-6 h-6 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 transition-colors z-10"
          style={{ left: isCollapsed ? '52px' : '252px' }}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        <nav className="flex-1 p-2">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="p-2 border-t border-slate-700">
          <div className={`flex items-center gap-3 px-3 py-2 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-slate-400" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.displayName}
                </p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-700 w-full mt-1 transition-colors ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={isCollapsed ? 'Logout' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>Logout</span>}
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
