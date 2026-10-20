
'use client'

import { TransitionLink } from '@/components/ui/transition-link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react'
import { authClient } from '@/lib/auth-client'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function SignupForm() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const normalizedName = name.trim()
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedName) {
      setError('Enter your full name.')
      return
    }

    if (normalizedName.length > 100) {
      setError('Your name must be 100 characters or fewer.')
      return
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Enter a valid email address.')
      return
    }

    if (password.length < 8 || password.length > 128) {
      setError('Your password must contain 8–128 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const { error: signupError } = await authClient.signUp.email({
        name: normalizedName,
        email: normalizedEmail,
        password,
      })

      if (signupError) {
        setError(signupError.message || 'Unable to create your account.')
        return
      }

      const { data: session, error: sessionError } =
        await authClient.getSession()

      if (sessionError || !session) {
        router.replace('/login?registered=1')
        router.refresh()
        return
      }

      const role = (
        session.user as typeof session.user & { role?: string }
      ).role

      if (role !== 'student') {
        await authClient.signOut()
        setError('Public registration is restricted to student accounts.')
        return
      }

      router.replace('/student/dashboard')
      router.refresh()
    } catch (submitError) {
      console.error('Attendly signup error:', submitError)
      setError('Something went wrong. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignUp() {
    setError('')
    setGoogleLoading(true)

    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/student/dashboard',
        errorCallbackURL: '/signup',
      })
    } catch (googleError) {
      console.error('Attendly Google signup error:', googleError)
      setGoogleLoading(false)
      setError('Unable to start Google sign-in. Please try again.')
    }
  }

  const inputClass =
    'min-w-0 w-full border-2 border-black bg-white px-4 py-4 text-base outline-none placeholder:italic placeholder:text-muted-foreground focus:ring-2 focus:ring-black focus:ring-offset-2'

  return (
    <div className="w-full max-w-xl">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Attendly / Get started
      </p>

      <h1 className="mt-5 font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl">
        Create your account<span className="italic">.</span>
      </h1>

      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        A clearer way to manage classroom attendance.
      </p>

      <div className="mt-10 space-y-5">
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={loading || googleLoading}
          className="focus-ring flex min-h-14 w-full items-center justify-center gap-3 border-2 border-black bg-white px-6 py-4 font-mono text-sm uppercase tracking-widest text-black transition-colors duration-200 hover:bg-neutral-100 disabled:cursor-wait disabled:opacity-60"
        >
          {googleLoading ? (
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          ) : (
            <svg
              aria-hidden="true"
              viewBox="0 0 48 48"
              className="size-5"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.01 13.22l7.98 6.19C11.88 13.72 17.45 9.5 24 9.5Z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 37.93 46.98 31.8 46.98 24.55Z"
              />
              <path
                fill="#FBBC05"
                d="M9.99 28.59A14.4 14.4 0 0 1 9.2 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.58 10.78l7.41-6.19Z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.9 2.3-8.18 2.3-6.55 0-12.12-4.22-14.01-10.06l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
              />
            </svg>
          )}

          {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-4" aria-hidden="true">
          <div className="h-px flex-1 bg-neutral-300" />
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Or use email
          </span>
          <div className="h-px flex-1 bg-neutral-300" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label
              htmlFor="signup-name"
              className="mb-2 block font-mono text-xs uppercase tracking-widest"
            >
              Full name
            </label>
            <input
              id="signup-name"
              name="name"
              type="text"
              autoComplete="name"
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your full name"
              className={inputClass}
              disabled={loading || googleLoading}
            />
          </div>

          <div>
            <label
              htmlFor="signup-email"
              className="mb-2 block font-mono text-xs uppercase tracking-widest"
            >
              Email address
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@gmail.com"
              className={inputClass}
              disabled={loading || googleLoading}
            />
          </div>

          <div>
            <label
              htmlFor="signup-password"
              className="mb-2 block font-mono text-xs uppercase tracking-widest"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="signup-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                className={`${inputClass} pr-14`}
                disabled={loading || googleLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="focus-ring absolute inset-y-0 right-0 grid w-12 place-items-center"
                disabled={loading || googleLoading}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="signup-confirm-password"
              className="mb-2 block font-mono text-xs uppercase tracking-widest"
            >
              Confirm password
            </label>
            <div className="relative">
              <input
                id="signup-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                maxLength={128}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Enter your password again"
                className={`${inputClass} pr-14`}
                disabled={loading || googleLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                aria-label={
                  showConfirmPassword ? 'Hide password' : 'Show password'
                }
                className="focus-ring absolute inset-y-0 right-0 grid w-12 place-items-center"
                disabled={loading || googleLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="border-l-2 border-black pl-3 text-sm leading-relaxed"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="focus-ring group flex min-h-16 w-full items-center justify-center gap-3 border-2 border-black bg-black px-6 py-4 font-mono text-sm uppercase tracking-widest text-white transition-colors duration-200 hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                  aria-hidden="true"
                />
                Creating account...
              </>
            ) : (
              <>
                Create student account
                <ArrowRight
                  size={18}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </>
            )}
          </button>

          <p className="text-sm leading-relaxed text-muted-foreground">
            By creating an account, you agree to use Attendly in accordance
            with your institution&apos;s policies.
          </p>
        </form>
      </div>

      <div className="mt-8 border-t border-border-light pt-6">
        <p className="text-sm">
          Already have an account?{' '}
          <TransitionLink
            href="/login"
            className="font-medium text-black underline underline-offset-4 hover:decoration-2"
          >
            Login
          </TransitionLink>
        </p>
      </div>
    </div>
  )
}
