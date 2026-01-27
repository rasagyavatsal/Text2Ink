'use client';

import { useEffect, useMemo, useState } from 'react';
import NextImage from 'next/image';
import { Minus, Plus, X } from 'lucide-react';

type SampleImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function SamplePreviewGallery() {
  const images = useMemo<SampleImage[]>(
    () => [
      {
        src: '/Sample-handwriting-preview1.png',
        alt: 'Sample handwriting preview 1',
        width: 840,
        height: 1188,
      },
      {
        src: '/Sample-handwriting-preview2.png',
        alt: 'Sample handwriting preview 2',
        width: 840,
        height: 1188,
      },
    ],
    [],
  );

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  const activeImage = activeIndex === null ? null : images[activeIndex];

  useEffect(() => {
    if (activeIndex === null) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveIndex(null);
        setZoom(1);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [activeIndex]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 justify-items-center">
        {images.map((img, idx) => (
          <button
            key={img.src}
            type="button"
            className="bg-white border-2 border-gray-200 rounded-xl sm:rounded-2xl overflow-hidden w-full max-w-sm md:max-w-none focus:outline-none focus:ring-2 focus:ring-[#E0A32A] focus:ring-offset-2"
            style={{ aspectRatio: '210/297', maxHeight: '500px' }}
            onClick={() => {
              setZoom(1);
              setActiveIndex(idx);
            }}
            aria-label={`Open ${img.alt} full size`}
          >
            <NextImage
              src={img.src}
              alt={img.alt}
              width={img.width}
              height={img.height}
              className="w-full h-full object-cover"
              priority={idx === 0}
            />
          </button>
        ))}
      </div>

      {activeImage ? (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Sample preview image"
        >
          <div
            className="absolute inset-0 bg-black/70"
            role="button"
            tabIndex={0}
            aria-label="Close preview"
            onClick={() => {
              setActiveIndex(null);
              setZoom(1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveIndex(null);
                setZoom(1);
              }
            }}
          />

          <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
            <div className="relative w-full h-full max-w-5xl max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl">
              <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white/90 backdrop-blur rounded-lg border border-gray-200 shadow-sm">
                  <button
                    type="button"
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    onClick={() => setZoom((z) => clamp(Number((z - 0.25).toFixed(2)), 1, 4))}
                    aria-label="Zoom out"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="px-2 text-xs text-gray-700 tabular-nums min-w-[52px] text-center">
                    {Math.round(zoom * 100)}%
                  </div>
                  <button
                    type="button"
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    onClick={() => setZoom((z) => clamp(Number((z + 0.25).toFixed(2)), 1, 4))}
                    aria-label="Zoom in"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  className="p-2 bg-white/90 backdrop-blur rounded-lg border border-gray-200 shadow-sm hover:bg-gray-100"
                  onClick={() => {
                    setActiveIndex(null);
                    setZoom(1);
                  }}
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div
                className="w-full h-full overflow-auto bg-gray-50"
                onWheel={(e) => {
                  if (!e.ctrlKey && !e.metaKey) return;
                  e.preventDefault();
                  const delta = e.deltaY;
                  setZoom((z) => clamp(Number((z + (delta > 0 ? -0.1 : 0.1)).toFixed(2)), 1, 4));
                }}
              >
                <div className="min-w-full min-h-full flex items-center justify-center p-4">
                  <NextImage
                    src={activeImage.src}
                    alt={activeImage.alt}
                    width={activeImage.width}
                    height={activeImage.height}
                    className="max-w-none"
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: 'center center',
                    }}
                    draggable={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
