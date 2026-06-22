import Link from "next/link"
import { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { InquiryForm } from "@/components/InquiryForm"
import SiteHeader from "@/components/patterns/SiteHeader"
import SiteFooter from "@/components/patterns/SiteFooter"
import JsonLd from "@/components/seo/JsonLd"
import {
  buildContactPageJsonLd,
  buildOrganizationJsonLd,
} from "@/lib/seo/jsonLd"
import { canonicalUrl, siteFacts } from "@/lib/seo/productFacts"
import { Mail } from "lucide-react"

const canonical = canonicalUrl("/contact")
const title = "Contact Text2Ink"
const description =
  "Send Text2Ink a question, bug report, or feature request through the contact form or direct email link."

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical,
  },
  openGraph: {
    type: "website",
    url: canonical,
    siteName: siteFacts.siteName,
    title,
    description,
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
}

export default function ContactPage() {
  const frameClasses = "w-full px-public-gutter"

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={buildContactPageJsonLd({ url: canonical, description })} />
      <JsonLd data={buildOrganizationJsonLd()} />

      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className={`${frameClasses} py-chrome-y`}>
          <SiteHeader
            hideContactLink
            cta={
              <Button variant="brand" size="chrome" asChild>
                <Link href="/editor">
                  Back to Editor
                </Link>
              </Button>
            }
          />
        </div>
      </header>

      <main className="py-page-y">
        <div className={frameClasses}>
          <div className="mx-auto w-full max-w-xl">
            <h1 className="text-page-title font-bold tracking-tight text-foreground mb-4 sm:mb-6">
              Contact Text2Ink
            </h1>
            <p className="text-body-lg text-muted-foreground mb-6 sm:mb-8">
              Send a question, bug report, or feature request. The form asks for your name, email, topic, and message, or you can email directly.
            </p>
            <InquiryForm />
            <div className="mt-6 sm:mt-8">
              <p className="text-supporting text-muted-foreground mb-2 sm:mb-3">
                Or email directly:
              </p>
              <a
                href="mailto:rasagyavatsal16@gmail.com"
                className="inline-flex items-center gap-2 text-brand-accent hover:text-brand-accent-hover font-medium transition-colors group break-all"
              >
                <Mail className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-y-0.5" data-testid="mail-icon" aria-hidden="true" />
                <span className="break-all">rasagyavatsal16@gmail.com</span>
              </a>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-background py-footer mt-section">
        <div className={frameClasses}>
          <SiteFooter />
        </div>
      </footer>
    </div>
  )
}
