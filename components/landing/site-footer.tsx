import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Wordmark } from '@/components/brand'

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-black text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{ backgroundImage: 'radial-gradient(circle at top center, #ffffff, transparent 70%)' }}
      />
      <div className="relative mx-auto max-w-6xl px-6 py-24 md:px-8 md:py-36 lg:px-12">
        <h2 className="font-display text-6xl leading-[0.9] tracking-tighter md:text-8xl lg:text-9xl">
          Take the
          <br />
          <em>register.</em>
        </h2>
        <div className="mt-12 flex flex-col gap-8 border-t border-white/40 pt-8 md:flex-row md:items-center md:justify-between">
          <p className="max-w-md text-lg leading-relaxed text-white/75">
            Explore the admin, teacher and student workspaces with demo accounts.
          </p>
          <Link
            href="/login?demo=1"
            className="focus-ring-inverse inline-flex items-center justify-center gap-3 border-2 border-white bg-white px-8 py-4 font-mono text-sm uppercase tracking-widest text-black transition-none hover:bg-black hover:text-white"
          >
            Open the demo
            <ArrowRight size={18} strokeWidth={1.5} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t-4 border-black bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 md:flex-row md:items-center md:justify-between md:px-8 lg:px-12">
        <div>
          <Wordmark />
          <p className="mt-2 text-sm text-muted-foreground">Online student attendance management.</p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <li><a href="#features" className="focus-ring underline-offset-4 hover:underline">Features</a></li>
            <li><a href="#how-it-works" className="focus-ring underline-offset-4 hover:underline">How it works</a></li>
            <li><a href="#faq" className="focus-ring underline-offset-4 hover:underline">FAQ</a></li>
            <li><Link href="/login" className="focus-ring underline-offset-4 hover:underline">Sign in</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-border-light">
        <p className="mx-auto max-w-6xl px-6 py-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground md:px-8 lg:px-12">
          © {new Date().getFullYear()} Attendly · Demo build
        </p>
      </div>
    </footer>
  )
}
