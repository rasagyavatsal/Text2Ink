import Link from 'next/link';
import NextImage from 'next/image';
import { Mail, ArrowLeft } from 'lucide-react';
import { Metadata } from 'next';
import Version from '@/components/Version';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Have questions or feedback about Text2Ink? Reach out to us. We would love to hear from you!',
  alternates: {
    canonical: 'https://text2ink.com/contact',
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200" role="banner">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-bold text-2xl sm:text-3xl font-dancing-script hover:text-[#E0A32A] transition-colors">
              <span className="text-[#E0A32A]">Text</span>
              <span className="text-black">2</span>
              <span className="text-[#E0A32A]">Ink</span>
            </Link>
          </div>
          <Link
            href="/editor"
            className="bg-[#E0A32A] text-white px-4 sm:px-5 py-2 rounded-lg font-medium text-sm sm:text-base hover:bg-[#c99225] transition-colors"
          >
            Open Editor
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 sm:mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="text-center mb-10 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
              Get in Touch
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Have questions, feedback, or suggestions? I&apos;d love to hear from you!
            </p>
          </div>

          <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 sm:p-10 md:p-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#E0A32A] rounded-full flex items-center justify-center mb-6">
                <Mail className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
                Email Me
              </h2>

              <a
                href="mailto:rasagyavatsal@outlook.com"
                className="text-lg sm:text-xl text-[#E0A32A] hover:text-[#c99225] font-medium transition-colors mb-6"
              >
                rasagyavatsal@outlook.com
              </a>

              <p className="text-gray-600 text-sm sm:text-base max-w-md">
                Whether you&apos;ve found a bug, have a feature request, or just want to say hello,
                feel free to reach out. I typically respond within 24-48 hours.
              </p>
            </div>
          </div>

          <div className="mt-10 sm:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div className="p-6 bg-white border border-gray-200 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-2">Bug Reports</h3>
              <p className="text-sm text-gray-600">
                Found an issue? Let me know so I can fix it quickly.
              </p>
            </div>
            <div className="p-6 bg-white border border-gray-200 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-2">Feature Requests</h3>
              <p className="text-sm text-gray-600">
                Have an idea? I&apos;m always looking to improve Text2Ink.
              </p>
            </div>
            <div className="p-6 bg-white border border-gray-200 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-2">General Feedback</h3>
              <p className="text-sm text-gray-600">
                Your thoughts help make Text2Ink better for everyone.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 sm:py-8 px-4 sm:px-6 mt-12" role="contentinfo">
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
            <p className="text-gray-500 text-xs sm:text-sm">
              © {new Date().getFullYear()} Text2Ink. All rights reserved.
            </p>
            <Version />
          </div>
        </div>
      </footer>
    </div>
  );
}
