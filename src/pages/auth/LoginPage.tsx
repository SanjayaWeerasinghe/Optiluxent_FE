import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Icon } from '../../components/ui'

export function LoginPage() {
  const navigate  = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [shake,    setShake]    = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Invalid credentials')
      }

      const data = await res.json()
      localStorage.setItem('access_token',  data.data?.access_token  ?? '')
      localStorage.setItem('refresh_token', data.data?.refresh_token ?? '')
      navigate('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setError(msg)
      setShake(true)
      setTimeout(() => setShake(false), 600)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-background overflow-hidden">
      {/* Left — form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-container-margin relative">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 industrial-pattern opacity-40" />

        <div
          className={[
            'relative z-10 w-full max-w-md',
            'bg-surface-container-lowest border border-outline-variant rounded-xl p-10',
            'shadow-[0_4px_20px_rgba(0,35,111,0.07)]',
            shake ? 'animate-shake' : '',
          ].join(' ')}
        >
          {/* Error toast */}
          {error && (
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-error-container border border-error/30 text-on-error-container px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
              <Icon name="error" size={16} />
              <span className="text-label-mono font-label-mono">{error}</span>
            </div>
          )}

          {/* Brand header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-2">
              <Icon name="factory" size={28} filled className="text-primary" />
              <h1 className="text-headline-md font-headline-md text-primary tracking-tight">
                Optiluxent ERP
              </h1>
            </div>
            <p className="text-body-sm font-body-sm text-on-surface-variant">
              Optiluxent · System Access Portal
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              id="email"
              type="email"
              label="Email Address"
              placeholder="you@optiluxent.com"
              iconLeft="person"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div>
              <div className="flex justify-between items-center mb-unit">
                <label htmlFor="password" className="text-label-mono font-label-mono text-on-surface-variant">
                  Password
                </label>
                <a href="#" className="text-label-mono font-label-mono text-primary hover:underline">
                  Forgot?
                </a>
              </div>
              <Input
                id="password"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                iconLeft="lock"
                iconRight={showPass ? 'visibility_off' : 'visibility'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                // allow clicking the right icon to toggle visibility
                onMouseDown={(e) => {
                  const target = e.target as HTMLElement
                  if (target.closest('[data-toggle-pass]')) {
                    e.preventDefault()
                    setShowPass((p) => !p)
                  }
                }}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              iconRight="arrow_forward"
              loading={loading}
              className="w-full mt-2"
            >
              Sign In
            </Button>
          </form>

          <p className="mt-8 text-center text-label-mono font-label-mono text-outline border-t border-outline-variant pt-6">
            Internal Use Only · Secure Connection
          </p>
        </div>
      </div>

      {/* Right — decorative panel (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden items-end">
        {/* Faint background image overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-20"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary to-transparent opacity-90" />

        <div className="relative z-10 p-16 text-on-primary max-w-lg">
          <h2 className="text-display-lg font-display-lg mb-4">
            Operational Excellence
          </h2>
          <p className="text-title-sm font-title-sm opacity-80 leading-relaxed">
            Streamlining logistics, procurement, and manufacturing data into a single, reliable source of truth.
          </p>
        </div>
      </div>
    </div>
  )
}
