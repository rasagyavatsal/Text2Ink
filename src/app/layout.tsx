import type { Metadata, Viewport } from "next";
import { Inter, Caveat } from "next/font/google";
import "./globals.css";
import FirebaseAnalytics from "./firebase-analytics";

const siteUrl = "https://text2ink.com";
const siteName = "Text2Ink";
const siteDescription = "Convert your typed text into beautiful, realistic handwritten notes. Customize fonts, paper styles, ink effects, and export as PDF or images. Free online text to handwriting converter.";
const siteKeywords = [
  "text to handwriting",
  "handwriting converter",
  "convert text to handwriting",
  "handwritten notes generator",
  "text to handwritten notes",
  "handwriting font generator",
  "realistic handwriting",
  "handwriting simulator",
  "digital handwriting",
  "handwritten text converter",
  "assignment handwriting",
  "notes generator",
  "handwriting maker",
  "text to cursive",
  "handwriting online",
  "free handwriting converter"
];

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Text2Ink - Free Text to Handwriting Converter Online",
    template: "%s | Text2Ink",
  },
  description: siteDescription,
  keywords: siteKeywords,
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/logo-192.png",
    apple: "/logo-192.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: siteName,
    title: "Text2Ink - Free Text to Handwriting Converter Online",
    description: siteDescription,
    images: [
      {
        url: "/Sample-handwriting-preview1.avif",
        width: 840,
        height: 1188,
        alt: "Text2Ink - Convert text to realistic handwriting",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Text2Ink - Free Text to Handwriting Converter Online",
    description: siteDescription,
    images: ["/Sample-handwriting-preview1.avif"],
    creator: "@text2ink",
  },
  alternates: {
    canonical: siteUrl,
  },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: "#E0A32A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: siteName,
  description: siteDescription,
  url: siteUrl,
  applicationCategory: "UtilityApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Convert text to handwriting",
    "Multiple handwriting fonts",
    "Custom paper backgrounds",
    "Realistic ink effects",
    "Export to PDF and images",
    "Adjustable margins and spacing",
  ],
  screenshot: `${siteUrl}/Sample-handwriting-preview1.avif`,
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "150",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="preload"
          as="image"
          href="/Sample-handwriting-preview1-mobile.avif"
          media="(max-width: 640px)"
          type="image/avif"
        />
        <link
          rel="preload"
          as="image"
          href="/Sample-handwriting-preview1.avif"
          media="(min-width: 641px)"
          type="image/avif"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${inter.variable} ${caveat.variable} antialiased font-sans`}
      >
        <FirebaseAnalytics />
        {children}
      </body>
    </html>
  );
}
