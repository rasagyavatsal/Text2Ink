import type { Metadata, Viewport } from "next";
import { 
  Inter, 
  Caveat,
  Dancing_Script, 
  Indie_Flower, 
  Shadows_Into_Light, 
  Kalam, 
  Patrick_Hand, 
  Architects_Daughter, 
  Satisfy, 
  Homemade_Apple 
} from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import FirebaseAnalytics from "./firebase-analytics";

const siteUrl = "https://text2ink.com";
const siteName = "Text2Ink";
const siteDescription = "Create realistic handwritten notes from typed text with Text2Ink.";
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

const dancingScript = Dancing_Script({
  variable: "--font-dancing-script",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: 'swap',
});

const indieFlower = Indie_Flower({
  variable: "--font-indie-flower",
  subsets: ["latin"],
  weight: ["400"],
  display: 'swap',
});

const shadowsIntoLight = Shadows_Into_Light({
  variable: "--font-shadows-into-light",
  subsets: ["latin"],
  weight: ["400"],
  display: 'swap',
});

const kalam = Kalam({
  variable: "--font-kalam",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: 'swap',
});

const patrickHand = Patrick_Hand({
  variable: "--font-patrick-hand",
  subsets: ["latin"],
  weight: ["400"],
  display: 'swap',
});

const architectsDaughter = Architects_Daughter({
  variable: "--font-architects-daughter",
  subsets: ["latin"],
  weight: ["400"],
  display: 'swap',
});

const satisfy = Satisfy({
  variable: "--font-satisfy",
  subsets: ["latin"],
  weight: ["400"],
  display: 'swap',
});

const homemadeApple = Homemade_Apple({
  variable: "--font-homemade-apple",
  subsets: ["latin"],
  weight: ["400"],
  display: 'swap',
});

const bethEllen = localFont({
  src: "../../public/fonts/BethEllen-Regular.ttf",
  variable: "--font-beth-ellen",
  display: 'swap',
});

const cedarvilleCursive = localFont({
  src: "../../public/fonts/Cedarville-Cursive.ttf",
  variable: "--font-cedarville-cursive",
  display: 'swap',
});

const dirtyEnough = localFont({
  src: "../../public/fonts/DirtyEnough-Regular.ttf",
  variable: "--font-dirty-enough",
  display: 'swap',
});

const kristi = localFont({
  src: "../../public/fonts/Kristi.ttf",
  variable: "--font-kristi",
  display: 'swap',
});

const rudiment = localFont({
  src: "../../public/fonts/Rudiment.ttf",
  variable: "--font-rudiment",
  display: 'swap',
});

const singlong = localFont({
  src: "../../public/fonts/Singlong.otf",
  variable: "--font-singlong",
  display: 'swap',
});

const stringsFree = localFont({
  src: "../../public/fonts/StringsFree.otf",
  variable: "--font-strings-free",
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Text2Ink",
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
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: "#E0A32A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
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
        <script src="https://t.contentsquare.net/uxa/ea250cc30afee.js" async />
      </head>
      <body
        className={`${inter.variable} ${caveat.variable} ${dancingScript.variable} ${indieFlower.variable} ${shadowsIntoLight.variable} ${kalam.variable} ${patrickHand.variable} ${architectsDaughter.variable} ${satisfy.variable} ${homemadeApple.variable} ${bethEllen.variable} ${cedarvilleCursive.variable} ${dirtyEnough.variable} ${kristi.variable} ${rudiment.variable} ${singlong.variable} ${stringsFree.variable} antialiased font-sans`}
      >
        <FirebaseAnalytics />
        {children}
      </body>
    </html>
  );
}
