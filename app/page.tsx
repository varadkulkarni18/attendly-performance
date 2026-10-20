import { Calculation } from '@/components/landing/calculation'
import { Faq } from '@/components/landing/faq'
import { Features } from '@/components/landing/features'
import { Hero } from '@/components/landing/hero'
import { HowItWorks } from '@/components/landing/how-it-works'
import { ProductDemo } from '@/components/landing/product-demo'
import { Roles } from '@/components/landing/roles'
import { SiteHeader } from '@/components/landing/site-header'
import { FinalCta, SiteFooter } from '@/components/landing/site-footer'

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Hero />
        <ProductDemo />
        <Features />
        <Calculation />
        <HowItWorks />
        <Roles />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  )
}
