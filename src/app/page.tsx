import Link from 'next/link';
import NextImage from 'next/image';
import { Image as ImageIcon, Wand2, ArrowRight } from 'lucide-react';
import SamplePreviewGallery from '@/components/SamplePreviewGallery';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200" role="banner">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-2xl sm:text-3xl font-dancing-script">
              <span className="text-[#E0A32A]">Text</span>
              <span className="text-black">2</span>
              <span className="text-[#E0A32A]">Ink</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/contact"
              className="text-gray-700 hover:text-[#E0A32A] font-medium text-sm sm:text-base transition-colors"
            >
              Contact
            </Link>
            <Link
              href="/editor"
              className="bg-[#E0A32A] text-white px-4 sm:px-5 py-2 rounded-lg font-medium text-sm sm:text-base hover:bg-[#c99225] transition-colors"
            >
              Open Editor
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6" aria-labelledby="hero-heading">
          <div className="max-w-4xl mx-auto text-center">
            <h1 id="hero-heading" className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
              Transform Your Text Into{' '}
              <span className="text-[#E0A32A] italic font-serif tracking-wide">Real Handwriting</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 sm:mb-10 max-w-2xl mx-auto px-2">
              Convert typed text into realistic handwritten notes with customizable fonts,
              paper styles, and authentic ink effects.
            </p>
            <Link
              href="/editor"
              className="inline-flex items-center gap-2 bg-[#E0A32A] text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg hover:bg-[#c99225] transition-colors"
            >
              Start Writing
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>

        {/* Sample Placeholder */}
        <section className="py-10 sm:py-12 md:py-16 px-4 sm:px-6 bg-gray-50" aria-label="Sample handwriting previews">
          <div className="max-w-6xl mx-auto">
            <SamplePreviewGallery />
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6" aria-labelledby="features-heading">
          <div className="max-w-6xl mx-auto">
            <h2 id="features-heading" className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10 sm:mb-12 md:mb-16">
              Powerful Features
            </h2>

            {/* Feature 1: Background Image Upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center mb-12 sm:mb-16 md:mb-20">
              <div>
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#E0A32A] rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                  <ImageIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                  Custom Background Images
                </h3>
                <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
                  Upload your own paper textures, notebook pages, or any background image.
                  Create handwritten notes that look like they were written on real paper,
                  lined notebooks, or custom stationery.
                </p>
              </div>
              <div className="bg-gray-100 border-2 border-gray-200 rounded-xl sm:rounded-2xl aspect-video overflow-hidden">
                <video
                  src="/Custom-Background-Images.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Feature 2: Realism Effects */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="order-2 md:order-1 bg-gray-100 border-2 border-gray-200 rounded-xl sm:rounded-2xl aspect-video overflow-hidden">
                <video
                  src="/realistic-ink-effects.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="order-1 md:order-2">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#E0A32A] rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                  <Wand2 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                  Realistic Ink Effects
                </h3>
                <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
                  Add authentic handwriting imperfections with ink bleeding, pressure variation,
                  and natural letter spacing. Your converted text will look genuinely handwritten,
                  not computer-generated.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 sm:py-8 px-4 sm:px-6" role="contentinfo">
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
          <p className="text-gray-500 text-xs sm:text-sm">
            © {new Date().getFullYear()} Text2Ink. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
