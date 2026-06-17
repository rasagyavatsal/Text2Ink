import Link from "next/link"
import { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { InquiryForm } from "@/components/InquiryForm"
import SiteHeader from "@/components/patterns/SiteHeader"
import SiteFooter from "@/components/patterns/SiteFooter"
import { Mail } from "lucide-react"

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Have questions about Text2Ink? Send us an inquiry and we'll get back to you.",
  alternates: {
    canonical: "https://text2ink.com/contact",
  },
}

export default function ContactPage() {
  const frameClasses = "w-full px-public-gutter"

  return (
    <div className="min-h-screen bg-background">
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
            <h1 className="text-page-title font-bold tracking-tight text-foreground mb-6">
              Email me
            </h1>
            <p className="text-body-lg text-muted-foreground mb-8">
              Have a question, bug report, or feature request? I&apos;ll get back to you.
            </p>
            <InquiryForm />
            <div className="mt-8">
              <p className="text-supporting text-muted-foreground mb-3">
                Or email directly:
              </p>
              <a
                href="mailto:rasagyavatsal16@gmail.com"
                className="inline-flex items-center gap-2 text-brand-accent hover:text-brand-accent-hover font-medium transition-colors group"
              >
                <Mail className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" data-testid="mail-icon" aria-hidden="true" />
                rasagyavatsal16@gmail.com
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
