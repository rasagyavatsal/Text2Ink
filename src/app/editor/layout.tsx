import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Handwriting Editor - Create Realistic Handwritten Notes",
  description: "Use our free online handwriting editor to convert text to realistic handwritten notes. Customize fonts, paper styles, ink effects, margins, and export as PDF or images.",
  keywords: [
    "handwriting editor",
    "text to handwriting editor",
    "online handwriting generator",
    "handwritten notes maker",
    "convert text to handwriting online",
    "free handwriting tool",
    "handwriting PDF generator",
    "realistic handwriting creator",
  ],
  openGraph: {
    title: "Handwriting Editor - Create Realistic Handwritten Notes | Text2Ink",
    description: "Use our free online handwriting editor to convert text to realistic handwritten notes. Customize fonts, paper styles, ink effects, and export as PDF or images.",
    url: "https://text2ink.com/editor",
    type: "website",
  },
  twitter: {
    title: "Handwriting Editor - Create Realistic Handwritten Notes | Text2Ink",
    description: "Use our free online handwriting editor to convert text to realistic handwritten notes. Customize fonts, paper styles, ink effects, and export as PDF or images.",
  },
  alternates: {
    canonical: "https://text2ink.com/editor",
  },
};

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
