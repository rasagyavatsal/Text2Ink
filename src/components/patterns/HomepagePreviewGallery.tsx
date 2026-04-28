import Image from 'next/image';

const previews = [
  {
    src: '/Sample-handwriting-preview1.avif',
    alt: 'Handwriting preview 1',
  },
  {
    src: '/Sample-handwriting-preview2.avif',
    alt: 'Handwriting preview 2',
  },
] as const;

export default function HomepagePreviewGallery() {
  return (
    <div data-testid="homepage-preview-gallery" className="grid w-full max-w-5xl grid-cols-1 gap-4 lg:grid-cols-2">
      {previews.map((preview, index) => (
        <div
          key={preview.src}
          className="overflow-hidden rounded-[var(--t2i-radius-panel)] border border-[var(--t2i-border-default)] bg-[var(--t2i-surface-panel)] p-3"
        >
          <Image
            src={preview.src}
            alt={preview.alt}
            width={840}
            height={1188}
            priority={index === 0}
            sizes="(min-width: 1024px) 40vw, 92vw"
            className="h-auto w-full rounded-[calc(var(--t2i-radius-panel)-0.25rem)] border border-[var(--t2i-border-subtle)] bg-[var(--t2i-surface-raised)] object-cover"
          />
        </div>
      ))}
    </div>
  );
}
