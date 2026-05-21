import Link from "next/link"
import { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { InquiryForm } from "@/components/InquiryForm"
import SiteHeader from "@/components/patterns/SiteHeader"
import SiteFooter from "@/components/patterns/SiteFooter"

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Have questions about Text2Ink? Send us an inquiry and we'll get back to you.",
  alternates: {
    canonical: "https://text2ink.com/contact",
  },
}

export default function ContactPage() {
  const frameClasses = "mx-auto w-full max-w-content px-page-x"

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
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
          <div className="w-full">
            {/* Inquiry Split Layout — desktop: two columns, mobile: stacked */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
              {/* Left: Email info */}
              <div>
                <h1 className="text-page-title font-bold text-foreground mb-4">
                  Email me
                </h1>
                <p className="text-body text-muted-foreground mb-6">
                  Have a question, found a bug, or want to request a feature?
                  Fill out the form and I&apos;ll get back to you.
                </p>
                <a
                  href="mailto:rasagyavatsal16@gmail.com"
                  className="hidden lg:block text-brand-accent hover:text-brand-accent-hover font-medium transition-colors"
                >
                  rasagyavatsal16@gmail.com
                </a>
              </div>

              {/* Right: Inquiry form */}
              <div>
                <InquiryForm />

                {/* Mobile-only fallback email below form */}
                <div className="lg:hidden mt-6">
                  <p className="text-supporting text-muted-foreground">
                    Or email directly:{" "}
                    <a
                      href="mailto:rasagyavatsal16@gmail.com"
                      className="text-brand-accent hover:text-brand-accent-hover font-medium transition-colors"
                    >
                      rasagyavatsal16@gmail.com
                    </a>
                  </p>
                </div>
              </div>
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
