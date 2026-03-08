'use client';

import { useMemo } from 'react';

type SampleImage = {
  src: string;
  mobileSrc?: string;
  alt: string;
  width: number;
  height: number;
};

export default function SamplePreviewGallery() {
  const images = useMemo<SampleImage[]>(
    () => [
      {
        src: '/Sample-handwriting-preview1.avif',
        mobileSrc: '/Sample-handwriting-preview1-mobile.avif',
        alt: 'Sample handwriting preview 1',
        width: 840,
        height: 1188,
      },
      {
        src: '/Sample-handwriting-preview2.avif',
        mobileSrc: '/Sample-handwriting-preview2-mobile.avif',
        alt: 'Sample handwriting preview 2',
        width: 840,
        height: 1188,
      },
    ],
    [],
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 justify-items-center">
      {images.map((img, idx) => (
        <div
          key={img.src}
          className="bg-white border-2 border-gray-200 rounded-xl sm:rounded-2xl overflow-hidden w-full max-w-sm md:max-w-none"
          style={{ aspectRatio: '210/297', maxHeight: '500px' }}
        >
          <img
            src={img.src}
            alt={img.alt}
            width={img.width}
            height={img.height}
            className="w-full h-full object-cover"
            // @ts-ignore
            fetchPriority={idx === 0 ? "high" : undefined}
            loading={idx === 0 ? "eager" : "lazy"}
            srcSet={img.mobileSrc ? `${img.mobileSrc} 400w, ${img.src} 840w` : undefined}
            sizes="(max-width: 640px) 400px, 840px"
          />
        </div>
      ))}
    </div>
  );
}
