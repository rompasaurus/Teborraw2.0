import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  Calendar,
  GripVertical,
  Lightbulb,
  LogOut,
  Map,
  Menu,
  Settings,
  User,
  X,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useThoughtsEditorStore } from '@/store/thoughtsEditorStore'
import { authApi } from '@/services/api'

interface LayoutProps {
  children: React.ReactNode
}

// Constants for sidebar dimensions
const SIDEBAR_MIN_WIDTH = 64 // Collapsed width
const SIDEBAR_MAX_WIDTH = 320
const SIDEBAR_DEFAULT_WIDTH = 256
const SIDEBAR_COLLAPSE_THRESHOLD = 140 // Auto-collapse when text would overlap
const STORAGE_KEY = 'teboraw-sidebar-width'

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
]

// Load saved width from localStorage
function getSavedWidth(): number {
  if (typeof window === 'undefined') return SIDEBAR_DEFAULT_WIDTH
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    const width = parseInt(saved, 10)
    if (!isNaN(width) && width >= SIDEBAR_MIN_WIDTH && width <= SIDEBAR_MAX_WIDTH) {
      return width
    }
  }
  return SIDEBAR_DEFAULT_WIDTH
}

// Save width to localStorage
function saveWidth(width: number): void {
  localStorage.setItem(STORAGE_KEY, String(width))
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const resetEditor = useThoughtsEditorStore((s) => s.reset)
  const { user, refreshToken, logout } = useAuthStore()

  // Initialize width from localStorage
  const [sidebarWidth, setSidebarWidth] = useState(getSavedWidth)
  const [isDragging, setIsDragging] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)

  // Determine if sidebar should show text based on width
  const showText = sidebarWidth > SIDEBAR_COLLAPSE_THRESHOLD

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  // Save width to localStorage when it changes
  useEffect(() => {
    saveWidth(sidebarWidth)
  }, [sidebarWidth])

  // Handle mouse down on resize handle
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStartX.current = e.clientX
    dragStartWidth.current = sidebarWidth
  }, [sidebarWidth])

  // Handle mouse move during drag
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - dragStartX.current
      let newWidth = dragStartWidth.current + delta

      // Clamp width between min and max
      newWidth = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, newWidth))

      // Auto-collapse to minimum if below threshold
      if (newWidth <= SIDEBAR_COLLAPSE_THRESHOLD) {
        setSidebarWidth(SIDEBAR_MIN_WIDTH)
      } else {
        setSidebarWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    // Add cursor style to body during drag
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging])

  const handleLogout = async () => {
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken)
      } catch {
        // Ignore errors during logout
      }
    }
    queryClient.clear()
    resetEditor()
    logout()
    navigate('/login')
  }

  return (
    <div id="layout-root" className="h-screen bg-slate-900 flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <header className="md:hidden bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center gap-3 flex-shrink-0 z-40">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 -ml-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <div className="flex items-center gap-2">
          <TeborawIcon className="w-7 h-7 text-primary-500" />
          <h1 className="text-lg font-bold text-primary-500">Teboraw</h1>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile, visible on desktop. Shows as overlay when menu open on mobile */}
      <aside
        id="layout-sidebar"
        ref={sidebarRef}
        className={`
          bg-slate-800 border-r border-slate-700 flex flex-col flex-shrink-0
          ${isMobileMenuOpen ? 'fixed inset-y-0 left-0 z-40 w-72' : 'hidden md:flex'}
        `}
        style={{
          width: typeof window !== 'undefined' && window.innerWidth >= 768 ? sidebarWidth : undefined,
          transition: isDragging ? 'none' : 'width 0.2s ease-out'
        }}
      >
        {/* Logo section - Desktop only */}
        <div id="layout-logo-section" className="hidden md:flex p-4 border-b border-slate-700 items-center justify-between">
          <div className={`flex items-center gap-3 ${!showText ? 'justify-center w-full' : ''}`}>
            <TeborawIcon className="w-8 h-8 text-primary-500 flex-shrink-0" />
            {showText && (
              <div className="overflow-hidden">
                <h1 className="text-xl font-bold text-primary-500 whitespace-nowrap">Teboraw</h1>
                <p className="text-xs text-slate-400 whitespace-nowrap">Activity Tracker</p>
              </div>
            )}
          </div>
        </div>

        <nav id="layout-nav" className="flex-1 p-2 overflow-hidden">
          <ul id="layout-nav-list" className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <li key={item.path}>
                  <Link
                    id={`layout-nav-${item.label.toLowerCase()}`}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700'
                    } ${!showText && 'md:justify-center'}`}
                    title={!showText ? item.label : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className={`whitespace-nowrap overflow-hidden ${!showText && 'md:hidden'}`}>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User section */}
        <div id="layout-user-section" className="p-2 border-t border-slate-700">
          <div id="layout-user-info" className={`flex items-center gap-3 px-3 py-2 ${!showText && 'md:justify-center'}`}>
            <div id="layout-user-avatar" className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-slate-400" />
            </div>
            <div className={`flex-1 min-w-0 overflow-hidden ${!showText && 'md:hidden'}`}>
              <p id="layout-user-name" className="text-sm font-medium text-white truncate">
                {user?.displayName}
              </p>
              <p id="layout-user-email" className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <Link
            id="layout-settings-btn"
            to="/settings"
            className={`flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg transition-colors mt-1 ${
              location.pathname === '/settings'
                ? 'bg-primary-600 text-white'
                : 'text-slate-300 hover:bg-slate-700'
            } ${!showText && 'md:justify-center'}`}
            title={!showText ? 'Settings' : undefined}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            <span className={`whitespace-nowrap ${!showText && 'md:hidden'}`}>Settings</span>
          </Link>
          <button
            id="layout-logout-btn"
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg text-slate-300 hover:bg-slate-700 w-full mt-1 transition-colors ${
              !showText && 'md:justify-center'
            }`}
            title={!showText ? 'Logout' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className={`whitespace-nowrap ${!showText && 'md:hidden'}`}>Logout</span>
          </button>
        </div>

        {/* Resize handle - Desktop only */}
        <div
          id="layout-sidebar-resize-handle"
          onMouseDown={handleMouseDown}
          className={`hidden md:block absolute top-0 right-0 w-1 h-full cursor-col-resize group hover:bg-primary-500/50 transition-colors ${
            isDragging ? 'bg-primary-500' : 'bg-transparent'
          }`}
        >
          {/* Visual indicator on hover */}
          <div className={`absolute top-1/2 -translate-y-1/2 -right-1 w-3 h-8 rounded bg-slate-600 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity ${
            isDragging ? 'opacity-100 bg-primary-500' : ''
          }`}>
            <GripVertical className="w-3 h-3 text-slate-300" />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main id="layout-main-content" className="flex-1 min-h-0 overflow-hidden md:p-8">
        {children}
      </main>
    </div>
  )
}
