import Link from "next/link"
import { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { InquiryForm } from "@/components/InquiryForm"
import StandardPageShell from "@/components/patterns/StandardPageShell"
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
  return (
    <StandardPageShell
      header={
        <SiteHeader
          hideContactLink
          cta={
            <Button variant="brand" size="sm" asChild>
              <Link href="/editor">
                Back to Editor
              </Link>
            </Button>
          }
        />
      }
      content={
        <div className="w-full">
          {/* Inquiry Split Layout — desktop: two columns, mobile: stacked */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            {/* Left: Email info */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Email me
              </h1>
              <p className="text-muted-foreground mb-6">
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
                <p className="text-sm text-muted-foreground">
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
      }
      footer={
        <SiteFooter />
      }
    />
  )
}
