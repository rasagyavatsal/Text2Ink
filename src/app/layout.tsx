import type { Metadata, Viewport } from "next";
import { Inter, Caveat, Dancing_Script, Indie_Flower, Shadows_Into_Light, Kalam, Patrick_Hand, Architects_Daughter, Satisfy, Homemade_Apple } from "next/font/google";
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
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dancingScript = Dancing_Script({
  variable: "--font-dancing-script",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const indieFlower = Indie_Flower({
  variable: "--font-indie-flower",
  subsets: ["latin"],
  weight: "400",
});

const shadowsIntoLight = Shadows_Into_Light({
  variable: "--font-shadows-into-light",
  subsets: ["latin"],
  weight: "400",
});

const kalam = Kalam({
  variable: "--font-kalam",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

const patrickHand = Patrick_Hand({
  variable: "--font-patrick-hand",
  subsets: ["latin"],
  weight: "400",
});

const architectsDaughter = Architects_Daughter({
  variable: "--font-architects-daughter",
  subsets: ["latin"],
  weight: "400",
});

const satisfy = Satisfy({
  variable: "--font-satisfy",
  subsets: ["latin"],
  weight: "400",
});

const homemadeApple = Homemade_Apple({
  variable: "--font-homemade-apple",
  subsets: ["latin"],
  weight: "400",
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
    icon: "/logo-without-background.png",
    apple: "/logo-without-background.png",
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
        url: "/Sample-handwriting-preview1.png",
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
    images: ["/Sample-handwriting-preview1.png"],
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
  screenshot: `${siteUrl}/Sample-handwriting-preview1.png`,
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${inter.variable} ${caveat.variable} ${dancingScript.variable} ${indieFlower.variable} ${shadowsIntoLight.variable} ${kalam.variable} ${patrickHand.variable} ${architectsDaughter.variable} ${satisfy.variable} ${homemadeApple.variable} antialiased font-sans`}
      >
        <FirebaseAnalytics />
        {children}
      </body>
    </html>
  );
}
