import Link from "next/link"
import NextImage from "next/image"
import { Metadata } from "next"
import Version from "@/components/Version"
import ThemePicker from "@/components/ThemePicker"
import { InquiryForm } from "@/components/InquiryForm"
import StandardPageShell from "@/components/patterns/StandardPageShell"

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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-bold text-2xl sm:text-3xl font-dancing-script hover:text-brand-accent transition-colors"
          >
            <span className="text-brand-accent">Text</span>
            <span className="text-foreground">2</span>
            <span className="text-brand-accent">Ink</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <ThemePicker />
            <Link
              href="/"
              className="bg-brand-accent text-brand-accent-foreground px-4 sm:px-5 py-2 rounded-lg font-medium text-sm sm:text-base hover:bg-brand-accent-hover transition-colors"
            >
              Back to Editor
            </Link>
          </div>
        </div>
      }
      content={
        <div className="max-w-5xl mx-auto">
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
                className="text-brand-accent hover:text-brand-accent-hover font-medium transition-colors"
              >
                rasagyavatsal16@gmail.com
              </a>
            </div>

            {/* Right: Inquiry form */}
            <div>
              <InquiryForm />
            </div>

            {/* Mobile-only fallback email below form */}
            <div className="lg:hidden">
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
      }
      footer={
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <NextImage
              src="/logo-192.png"
              alt="Text2Ink logo"
              width={64}
              height={64}
              className="w-16 h-16"
              priority
            />
          </div>
          <div className="flex flex-col items-center md:items-end gap-1">
            <p className="text-muted-foreground text-xs sm:text-sm">
              © {new Date().getFullYear()} Text2Ink. All rights reserved.
            </p>
            <Version />
          </div>
        </div>
      }
    />
  )
}
