import Link from 'next/link';
import NextImage from 'next/image';
import { PenLine, Image as ImageIcon, Wand2, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#E0A32A] rounded-xl flex items-center justify-center">
              <PenLine className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">Text2Ink</span>
          </div>
          <Link
            href="/editor"
            className="bg-[#E0A32A] text-white px-5 py-2 rounded-lg font-medium hover:bg-[#c99225] transition-colors"
          >
            Open Editor
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Transform Your Text Into{' '}
            <span className="text-[#E0A32A]">Beautiful Handwriting</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Convert typed text into realistic handwritten notes with customizable fonts, 
            paper styles, and authentic ink effects.
          </p>
          <Link
            href="/editor"
            className="inline-flex items-center gap-2 bg-[#E0A32A] text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#c99225] transition-colors"
          >
            Start Writing
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Sample Placeholder */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 justify-items-center">
            <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden" style={{ aspectRatio: '210/297', maxHeight: '700px', width: '100%' }}>
              <NextImage
                src="/Sample-handwriting-preview1.png"
                alt="Sample handwriting preview"
                width={840}
                height={1188}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden" style={{ aspectRatio: '210/297', maxHeight: '700px', width: '100%' }}>
              <NextImage
                src="/Sample-handwriting-preview2.png"
                alt="Sample handwriting preview"
                width={840}
                height={1188}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-16">
            Powerful Features
          </h2>

          {/* Feature 1: Background Image Upload */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <div className="w-14 h-14 bg-[#E0A32A] rounded-xl flex items-center justify-center mb-6">
                <ImageIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Custom Background Images
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Upload your own paper textures, notebook pages, or any background image. 
                Create handwritten notes that look like they were written on real paper, 
                lined notebooks, or custom stationery.
              </p>
            </div>
            <div className="bg-gray-100 border-2 border-gray-200 rounded-2xl aspect-video overflow-hidden">
              <NextImage
                src="/Custom-Background-Images.gif"
                alt="Custom background images feature preview"
                width={1280}
                height={720}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          </div>

          {/* Feature 2: Realism Effects */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 bg-gray-100 border-2 border-gray-200 rounded-2xl aspect-video overflow-hidden">
              <NextImage
                src="/realistic-ink-effects.gif"
                alt="Realistic ink effects feature preview"
                width={1280}
                height={720}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
            <div className="order-1 md:order-2">
              <div className="w-14 h-14 bg-[#E0A32A] rounded-xl flex items-center justify-center mb-6">
                <Wand2 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Realistic Ink Effects
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Add authentic handwriting imperfections with ink bleeding, pressure variation, 
                and natural letter spacing. Your converted text will look genuinely handwritten, 
                not computer-generated.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#E0A32A] rounded-lg flex items-center justify-center">
              <PenLine className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">Text2Ink</span>
          </div>
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Text2Ink. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
