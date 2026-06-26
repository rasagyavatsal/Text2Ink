'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type LandingPreviewImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
};

export const heroPreviewImages: LandingPreviewImage[] = [
  { src: '/preview/preview-1.jpg', alt: 'Text2Ink handwritten page preview 1', width: 2481, height: 3508 },
  { src: '/preview/preview-2.jpg', alt: 'Text2Ink handwritten page preview 2', width: 2481, height: 3508 },
  { src: '/preview/preview-3.jpg', alt: 'Text2Ink handwritten page preview 3', width: 2481, height: 3508 },
  { src: '/preview/preview-4.jpg', alt: 'Text2Ink handwritten page preview 4', width: 2481, height: 3508 },
  { src: '/preview/preview-5.jpg', alt: 'Text2Ink handwritten page preview 5', width: 3508, height: 2481 },
  { src: '/preview/preview-6.jpg', alt: 'Text2Ink handwritten page preview 6', width: 3301, height: 2551 },
];

export const fontPreviewImages: LandingPreviewImage[] = [
  {
    src: '/preview/singlong-preview.jpg',
    alt: 'Singlong handwriting font preview',
    width: 2481,
    height: 3508,
    caption: 'Singlong on ruled medium paper',
  },
  {
    src: '/preview/snake-preview.jpg',
    alt: 'Snake handwriting font preview',
    width: 2481,
    height: 3508,
    caption: 'Snake on ruled medium paper',
  },
];

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_EPSILON = 0.01;
const PORTRAIT_CAROUSEL_CARD_CLASS_NAME = 'w-[min(76vw,16rem)] sm:w-[18rem] md:w-[20rem] lg:w-[22rem]';
const WIDE_LANDSCAPE_CAROUSEL_CARD_CLASS_NAME = 'w-[min(152vw,32rem)] sm:w-[36rem] md:w-[40rem] lg:w-[44rem]';
const LANDSCAPE_CAROUSEL_CARD_CLASS_NAME = 'w-[min(138vw,29rem)] sm:w-[33rem] md:w-[36rem] lg:w-[40rem]';

type Point = {
  x: number;
  y: number;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  panX: number;
  panY: number;
};

type PinchState = {
  distance: number;
  zoom: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getDistance([first, second]: Point[]) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function isZoomedValue(value: number) {
  return value > MIN_ZOOM + ZOOM_EPSILON;
}

function getCarouselCardClassName(preview: LandingPreviewImage) {
  if (preview.width <= preview.height) {
    return PORTRAIT_CAROUSEL_CARD_CLASS_NAME;
  }

  return preview.width / preview.height > 1.36
    ? WIDE_LANDSCAPE_CAROUSEL_CARD_CLASS_NAME
    : LANDSCAPE_CAROUSEL_CARD_CLASS_NAME;
}

function PreviewImage({
  preview,
  className,
  decorative = false,
  imageTestId,
  eager = false,
}: {
  preview: LandingPreviewImage;
  className?: string;
  decorative?: boolean;
  imageTestId?: string;
  eager?: boolean;
}) {
  return (
    <Image
      unoptimized
      src={preview.src}
      alt={decorative ? '' : preview.alt}
      width={preview.width}
      height={preview.height}
      sizes="(min-width: 1024px) 24rem, (min-width: 640px) 18rem, 76vw"
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : undefined}
      draggable={false}
      data-testid={imageTestId}
      className={cn('h-full w-full select-none object-cover', className)}
    />
  );
}

function PreviewCard({
  preview,
  onOpen,
  triggerTestId,
  imageTestId,
  decorative = false,
  eager = false,
  className,
}: {
  preview: LandingPreviewImage;
  onOpen?: (preview: LandingPreviewImage) => void;
  triggerTestId?: string;
  imageTestId?: string;
  decorative?: boolean;
  eager?: boolean;
  className?: string;
}) {
  const style = { aspectRatio: `${preview.width} / ${preview.height}` };
  const cardClassName = cn(
    'shrink-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:rounded-2xl',
    className
  );

  if (decorative) {
    return (
      <div className={cardClassName} style={style} aria-hidden="true">
        <PreviewImage preview={preview} decorative />
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={`Open ${preview.alt}`}
      data-testid={triggerTestId}
      className={cn(
        cardClassName,
        'text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
      style={style}
      onClick={() => onOpen?.(preview)}
    >
      <PreviewImage
        preview={preview}
        imageTestId={imageTestId}
        eager={eager}
      />
    </button>
  );
}

function PreviewLightbox({
  preview,
  open,
  onOpenChange,
}: {
  preview: LandingPreviewImage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef(MIN_ZOOM);
  const activePointersRef = useRef(new Map<number, Point>());
  const dragRef = useRef<DragState | null>(null);
  const pinchRef = useRef<PinchState | null>(null);

  const isZoomed = isZoomedValue(zoom);
  const isPanned = Math.abs(pan.x) > 0.5 || Math.abs(pan.y) > 0.5;

  const updateZoom = useCallback((nextZoom: number) => {
    const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    zoomRef.current = clampedZoom;
    setZoom(clampedZoom);

    if (!isZoomedValue(clampedZoom)) {
      setPan({ x: 0, y: 0 });
    }
  }, []);

  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : -1;
    const step = clamp(Math.abs(event.deltaY) / 900, 0.12, 0.45);

    updateZoom(zoomRef.current + direction * step);
  }, [updateZoom]);

  const setViewportRef = useCallback((node: HTMLDivElement | null) => {
    if (viewportRef.current) {
      viewportRef.current.removeEventListener('wheel', handleWheel);
    }

    viewportRef.current = node;

    if (node) {
      node.addEventListener('wheel', handleWheel, { passive: false });
    }
  }, [handleWheel]);

  useEffect(() => () => {
    viewportRef.current?.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    event.currentTarget.setPointerCapture(event.pointerId);

    const points = Array.from(activePointersRef.current.values());
    if (points.length >= 2) {
      dragRef.current = null;
      pinchRef.current = {
        distance: getDistance(points.slice(0, 2)),
        zoom: zoomRef.current,
      };
      return;
    }

    if (isZoomed) {
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    }
  }, [isZoomed, pan.x, pan.y]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!activePointersRef.current.has(event.pointerId)) {
      return;
    }

    activePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const points = Array.from(activePointersRef.current.values());
    if (points.length >= 2 && pinchRef.current) {
      const nextDistance = getDistance(points.slice(0, 2));
      const nextZoom = pinchRef.current.zoom * (nextDistance / pinchRef.current.distance);
      updateZoom(nextZoom);
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !isZoomed) {
      return;
    }

    setPan({
      x: drag.panX + event.clientX - drag.startX,
      y: drag.panY + event.clientY - drag.startY,
    });
  }, [isZoomed, updateZoom]);

  const handlePointerEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(event.pointerId);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }

    if (activePointersRef.current.size < 2) {
      pinchRef.current = null;
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[92vh] w-[94vw] max-w-[min(94vw,1200px)] gap-0 overflow-hidden border-0 bg-black p-0 text-white sm:rounded-lg">
        <DialogTitle className="sr-only">
          {preview?.alt ?? 'Text2Ink preview'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Use mouse wheel or pinch to zoom. Drag the zoomed preview to pan.
        </DialogDescription>
        <div
          ref={setViewportRef}
          data-testid="preview-lightbox-viewport"
          className="relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden bg-black"
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          {preview && (
            <Image
              unoptimized
              src={preview.src}
              alt={preview.alt}
              width={preview.width}
              height={preview.height}
              sizes="94vw"
              draggable={false}
              priority
              data-testid="preview-lightbox-image"
              data-zoomed={isZoomed ? 'true' : 'false'}
              data-panned={isPanned ? 'true' : 'false'}
              className={cn(
                'max-h-full max-w-full select-none object-contain transition-transform duration-75',
                isZoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
              )}
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                transformOrigin: 'center',
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LandingPreviewCarousel() {
  const [activePreview, setActivePreview] = useState<LandingPreviewImage | null>(null);

  return (
    <>
      <section
        aria-label="Text2Ink page previews"
        data-testid="hero-preview-carousel"
        className="mt-6 w-full overflow-hidden px-public-gutter sm:mt-8 lg:mt-10"
      >
        <div className="-mx-public-gutter overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div
            data-testid="hero-preview-carousel-track"
            className="landing-preview-marquee flex w-max gap-0"
          >
            <div className="flex shrink-0 items-center gap-4 pr-4 sm:gap-6 sm:pr-6">
              {heroPreviewImages.map((preview, index) => (
                <PreviewCard
                  key={preview.src}
                  preview={preview}
                  onOpen={setActivePreview}
                  triggerTestId="hero-preview-trigger"
                  imageTestId="hero-carousel-preview"
                  eager={index === 0}
                  className={getCarouselCardClassName(preview)}
                />
              ))}
            </div>
            <div
              className="flex shrink-0 items-center gap-4 pr-4 motion-reduce:hidden sm:gap-6 sm:pr-6"
              aria-hidden="true"
            >
              {heroPreviewImages.map((preview) => (
                <PreviewCard
                  key={`${preview.src}-duplicate`}
                  preview={preview}
                  decorative
                  className={getCarouselCardClassName(preview)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
      <PreviewLightbox
        key={activePreview?.src ?? 'hero-preview-lightbox'}
        preview={activePreview}
        open={activePreview !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setActivePreview(null);
          }
        }}
      />
    </>
  );
}

export function LandingFontPreviews() {
  const [activePreview, setActivePreview] = useState<LandingPreviewImage | null>(null);

  return (
    <>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
        {fontPreviewImages.map((preview) => (
          <div
            key={preview.src}
            className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:rounded-2xl"
          >
            <PreviewCard
              preview={preview}
              onOpen={setActivePreview}
              triggerTestId="font-preview-trigger"
              imageTestId="font-preview-image"
              className="w-full rounded-none border-0 shadow-none"
            />
            <div className="w-full border-t border-border bg-muted/30 p-3 text-center text-sm text-muted-foreground">
              {preview.caption}
            </div>
          </div>
        ))}
      </div>
      <PreviewLightbox
        key={activePreview?.src ?? 'font-preview-lightbox'}
        preview={activePreview}
        open={activePreview !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setActivePreview(null);
          }
        }}
      />
    </>
  );
}
