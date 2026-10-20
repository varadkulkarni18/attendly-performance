
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, LoaderCircle } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

export function AdminProfileActions() {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')

  async function handleSignOut() {
    if (signingOut) return

    setSigningOut(true)
    setError('')

    try {
      const result = await authClient.signOut()

      if (result.error) {
        setError('Could not sign out. Please try again.')
        setSigningOut(false)
        return
      }

      router.replace('/login')
      router.refresh()
    } catch {
      setError('Could not sign out. Please try again.')
      setSigningOut(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {signingOut ? (
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin"
          />
        ) : (
          <LogOut
            aria-hidden="true"
            className="size-4"
          />
        )}

        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
