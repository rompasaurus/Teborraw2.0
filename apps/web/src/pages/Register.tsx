import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/services/api'
import { useAuthStore } from '@/store/authStore'

export function Register() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')

  const registerMutation = useMutation({
    mutationFn: () => authApi.register(email, password, displayName),
    onSuccess: (response) => {
      const { accessToken, refreshToken, user } = response.data
      setAuth(user, accessToken, refreshToken)
      navigate('/dashboard')
    },
    onError: () => {
      setError('Registration failed. Email may already be in use.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    registerMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-500 mb-2">Teboraw</h1>
          <p className="text-slate-400">Personal Activity Tracker</p>
        </div>

        <div className="card">
          <h2 className="text-2xl font-semibold text-white mb-6">
            Create your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Display Name
              </label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input w-full"
                placeholder="John Doe"
                required
              />
            </div>

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
                minLength={8}
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Must be at least 8 characters
              </p>
            </div>

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="btn-primary w-full disabled:opacity-50"
            >
              {registerMutation.isPending ? 'Creating account...' : 'Sign up'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-primary-400 hover:text-primary-300"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
