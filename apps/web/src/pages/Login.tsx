import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/services/api'
import { useAuthStore } from '@/store/authStore'

export function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const loginMutation = useMutation({
    mutationFn: () => authApi.login(email, password),
    onSuccess: (response) => {
      const { accessToken, refreshToken, user } = response.data
      setAuth(user, accessToken, refreshToken)
      navigate('/dashboard')
    },
    onError: () => {
      setError('Invalid email or password')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    loginMutation.mutate()
  }

  return (
    <div id="login-page" className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div id="login-container" className="w-full max-w-md">
        <div id="login-header" className="text-center mb-8">
          <h1 id="login-brand-title" className="text-4xl font-bold text-primary-500 mb-2">Teboraw</h1>
          <p id="login-brand-subtitle" className="text-slate-400">Personal Activity Tracker</p>
        </div>

        <div id="login-card" className="card">
          <h2 id="login-title" className="text-2xl font-semibold text-white mb-6">
            Welcome back
          </h2>

          <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div id="login-error-message" className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input w-full"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input w-full"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loginMutation.isPending}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p id="login-register-prompt" className="mt-6 text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link
              id="login-register-link"
              to="/register"
              className="text-primary-400 hover:text-primary-300"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
