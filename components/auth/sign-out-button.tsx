
'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'

export function SignOutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSignOut() {
    setLoading(true)
    setError('')

    try {
      const { error: signOutError } = await authClient.signOut()

      if (signOutError) {
        setError(signOutError.message || 'Unable to sign out.')
        return
      }

      router.replace('/login')
      router.refresh()
    } catch {
      setError('Unable to sign out. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={loading}
        className="inline-flex h-11 items-center justify-center gap-2 border-2 border-black px-4 font-mono text-xs uppercase tracking-widest hover:bg-black hover:text-white disabled:opacity-60"
      >
        <LogOut size={16} />
        {loading ? 'Signing out...' : 'Sign out'}
      </button>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
