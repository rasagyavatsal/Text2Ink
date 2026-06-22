import type { Metadata, Viewport } from "next";
import { 
  Inter, 
  Dancing_Script,
} from "next/font/google";
import "./globals.css";
import FirebaseAnalytics from "./firebase-analytics";
import { siteFacts } from "@/lib/seo/productFacts";

const siteDescription = "Create handwriting-style notes from typed text with Text2Ink.";
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

const dancingScript = Dancing_Script({
  variable: "--font-dancing-script",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteFacts.canonicalBaseUrl),
  title: {
    default: "Text2Ink",
    template: "%s | Text2Ink",
  },
  description: siteDescription,
  keywords: siteKeywords,
  authors: [{ name: siteFacts.siteName }],
  creator: siteFacts.siteName,
  publisher: siteFacts.siteName,
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
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${dancingScript.variable} antialiased font-sans`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          enableColorScheme
        >
          <FirebaseAnalytics />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
