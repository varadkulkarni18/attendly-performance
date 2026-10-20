
'use client'

import { TransitionLink } from '@/components/ui/transition-link'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Wordmark } from '@/components/brand'

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#roles', label: 'Roles' },
  { href: '#faq', label: 'FAQ' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  // Clean the current landing-page history entry before opening auth pages.
  // This prevents Back from returning to a stale #faq/#features URL.
  const handleAuthNavigation = () => {
    if (window.location.pathname === '/') {
      window.history.replaceState(null, '', '/')
      window.scrollTo(0, 0)
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-black bg-white">
      <a
        href="#main"
        className="sr-only bg-black px-4 py-2 font-mono text-xs uppercase tracking-widest text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 md:px-8 lg:px-12">
        <Wordmark />

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="focus-ring text-sm underline-offset-[6px] hover:underline"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-6 md:flex">
          <TransitionLink
            href="/login"
            onClick={handleAuthNavigation}
            className="focus-ring text-sm underline-offset-[6px] hover:underline"
          >
            Login
          </TransitionLink>

          <TransitionLink
            href="/signup"
            onClick={handleAuthNavigation}
            className="focus-ring border-2 border-black bg-black px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-white transition-none hover:bg-white hover:text-black"
          >
            Sign up
          </TransitionLink>
        </div>

        <button
          type="button"
          className="focus-ring -mr-2 grid size-11 place-items-center md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? (
            <X size={22} strokeWidth={1.5} />
          ) : (
            <Menu size={22} strokeWidth={1.5} />
          )}
          <span className="sr-only">
            {open ? 'Close menu' : 'Open menu'}
          </span>
        </button>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="border-t border-black md:hidden"
        >
          <ul className="divide-y divide-border-light">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="focus-ring block px-6 py-4 font-display text-2xl"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-2 border-t border-black">
            <TransitionLink
              href="/login"
              onClick={() => {
                handleAuthNavigation()
                setOpen(false)
              }}
              className="focus-ring py-4 text-center font-mono text-xs uppercase tracking-widest"
            >
              Login
            </TransitionLink>

            <TransitionLink
              href="/signup"
              onClick={() => {
                handleAuthNavigation()
                setOpen(false)
              }}
              className="focus-ring bg-black py-4 text-center font-mono text-xs uppercase tracking-widest text-white"
            >
              Sign up
            </TransitionLink>
          </div>
        </nav>
      )}
    </header>
  )
}
