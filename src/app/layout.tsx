import type { Metadata } from "next";
import { Inter, Caveat, Dancing_Script, Indie_Flower, Shadows_Into_Light, Kalam, Patrick_Hand, Architects_Daughter, Satisfy, Homemade_Apple } from "next/font/google";
import "./globals.css";
import FirebaseAnalytics from "./firebase-analytics";

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
  title: "Text2Ink - Text to Handwriting Converter",
  description: "Convert your typed text into beautiful handwritten notes with customizable fonts, paper styles, and realistic effects.",
  icons: {
    icon: "/logo-without-background.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${caveat.variable} ${dancingScript.variable} ${indieFlower.variable} ${shadowsIntoLight.variable} ${kalam.variable} ${patrickHand.variable} ${architectsDaughter.variable} ${satisfy.variable} ${homemadeApple.variable} antialiased font-sans`}
      >
        <FirebaseAnalytics />
        {children}
      </body>
    </html>
  );
}
