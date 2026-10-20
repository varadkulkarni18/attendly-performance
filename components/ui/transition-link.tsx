
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ComponentProps } from 'react'

type TransitionLinkProps = ComponentProps<typeof Link>

export function TransitionLink({
  href,
  onClick,
  ...props
}: TransitionLinkProps) {
  const router = useRouter()

  return (
    <Link
      href={href}
      {...props}
      onClick={(event) => {
        onClick?.(event)

        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return
        }

        event.preventDefault()

        const navigate = () => router.push(href.toString())

        const doc = document as Document & {
          startViewTransition?: (callback: () => void) => unknown
        }

        if (doc.startViewTransition) {
          doc.startViewTransition(navigate)
        } else {
          navigate()
        }
      }}
    />
  )
}
