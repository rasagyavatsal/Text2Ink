'use client';

import React, { useEffect, useMemo, useState } from 'react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  HandwritingSettings,
  PageSettings,
  HANDWRITING_FONTS,
  PAPER_STYLES,
  PAPER_COLORS,
  PAPER_FORMATS,
  PAPER_ORIENTATIONS,
  LineData,
  FontOption,
  PaperFormat,
  PaperOrientation,
  PaperStyle,
} from '@/lib/types';
import { resolvePageLayout } from '@/lib/layout/LayoutEngine';
import {
  resolveDocumentPaperFormat,
  resolveDocumentPaperOrientation,
  resolveDocumentPaperStyle,
  updateDocumentPaperSelection,
} from '@/lib/paper/paperSelection';
import { cn } from '@/lib/utils';
import { detectBackgroundLines } from '@/lib/lineDetection';
import { 
  ChevronLeft,
  ChevronRight,
  Type, 
  FileText, 
  Wand2, 
  Upload, 
  X, 
  Plus, 
  Trash2,
  Settings2,
  Sliders
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

import {
  generateFontFamilyName,
  readFilesAsDataURL,
  validateFontFile,
} from '@/lib/settingsHelpers';
import { normalizeUploadCalibrationResult, applyUploadCalibration } from '@/lib/uploadCalibration';
import { resolvePaperControlsModel } from '@/lib/paper/paperControlsModel';

const PAPER_LINE_PREVIEW_MAP: Record<
  string,
  { transparentStop: string; backgroundSize: string }
> = {
  'lined': { transparentStop: '11px', backgroundSize: '100% 12px' },
  'wide-lined': { transparentStop: '16px', backgroundSize: '100% 17px' },
  'narrow-lined': { transparentStop: '8px', backgroundSize: '100% 9px' },
  'ruled': { transparentStop: '11px', backgroundSize: '100% 12px' },
  'wide-ruled': { transparentStop: '16px', backgroundSize: '100% 17px' },
  'narrow-ruled': { transparentStop: '8px', backgroundSize: '100% 9px' },
};

const PaperLinePreview = ({
  variant,
  isRuled,
}: {
  variant: string;
  isRuled: boolean;
}) => {
  const config = PAPER_LINE_PREVIEW_MAP[variant];
  if (!config) return null;

  return (
    <div className="w-full h-full relative">
      <div 
        className={cn(isRuled ? "absolute inset-0" : "w-full h-full")}
        style={{
          backgroundImage: `linear-gradient(to bottom, transparent ${config.transparentStop}, rgba(169, 190, 205, 0.6) ${config.transparentStop})`,
          backgroundSize: config.backgroundSize,
          paddingTop: '18px',
          backgroundClip: 'content-box'
        }}
      ></div>
      {isRuled && (
        <div className="absolute left-[18%] top-0 bottom-0 w-px bg-[#f39ca6]/90 z-10"></div>
      )}
    </div>
  );
};

const PaperStyleCard = ({
  style,
  paperColor,
  isSelected,
  onClick,
}: {
  style: { name: string; value: string };
  paperColor: string;
  isSelected: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${style.name} paper style`}
      aria-pressed={isSelected}
      data-testid={`paper-style-card-${style.value}`}
      className={cn(
        "cursor-pointer rounded-xl p-2 flex flex-col items-center gap-2 transition-all border w-full h-full",
        isSelected 
          ? "border-brand-accent bg-brand-accent/5 ring-1 ring-brand-accent" 
          : "bg-background border-border hover:border-brand-accent/30 hover:bg-accent/50"
      )}
    >
      <div 
        data-testid={`paper-style-preview-${style.value}`}
        className={cn(
          "w-full aspect-[1/1.4] rounded-lg flex flex-col overflow-hidden transition-colors border border-border/50 relative",
          isSelected ? "shadow-sm" : ""
        )}
        style={{ backgroundColor: paperColor }}
      >
        {style.value === 'blank' && (
           <div className="w-full h-full"></div>
        )}
        {PAPER_LINE_PREVIEW_MAP[style.value] && (
          <PaperLinePreview
            variant={style.value}
            isRuled={style.value.includes('ruled')}
          />
        )}
        {style.value === 'grid' && (
           <div 
             className="w-full h-full"
             style={{
               backgroundImage: `
                 linear-gradient(to right, rgba(169,190,205,0.4) 1px, transparent 1px),
                 linear-gradient(to bottom, rgba(169,190,205,0.4) 1px, transparent 1px),
                 linear-gradient(to right, rgba(215,226,234,0.6) 1px, transparent 1px),
                 linear-gradient(to bottom, rgba(215,226,234,0.6) 1px, transparent 1px)
               `,
               backgroundSize: '25px 25px, 25px 25px, 5px 5px, 5px 5px'
             }}
           ></div>
        )}
        {style.value === 'dot-grid' && (
           <div 
             className="w-full h-full"
             style={{
               backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(169,190,205,0.8) 1px, transparent 0)',
               backgroundSize: '12px 12px',
               backgroundPosition: '11px 11px'
             }}
           ></div>
        )}
        {style.value === 'cornell' && (
           <div className="w-full h-full relative">
             <div 
               className="absolute inset-x-0 top-0 bottom-[20%]"
               style={{
                 backgroundImage: 'linear-gradient(to bottom, transparent 11px, rgba(169, 190, 205, 0.6) 11px)',
                 backgroundSize: '100% 12px',
                 paddingTop: '18px',
                 backgroundClip: 'content-box'
               }}
             ></div>
             <div className="absolute left-[20%] top-0 bottom-0 w-px bg-[#f39ca6]/90 z-10"></div>
             <div className="absolute left-0 right-0 bottom-[20%] h-px bg-[#f39ca6]/90 z-10"></div>
           </div>
        )}
      </div>
      <span className={cn(
        "text-xs font-medium truncate w-full text-center px-1",
        isSelected ? "text-brand-accent font-semibold" : "text-muted-foreground"
      )}>
        {style.name}
      </span>
    </button>
  );
};

const FontCard = ({ 
  font, 
  isSelected, 
  onClick,
  customStyle
}: { 
  font: FontOption, 
  isSelected: boolean, 
  onClick: () => void,
  customStyle?: React.CSSProperties
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-xl p-2 flex flex-col items-center gap-2 transition-all border w-full h-full font-normal",
        isSelected 
          ? "border-brand-accent bg-brand-accent/5 ring-1 ring-brand-accent" 
          : "bg-background border-border hover:border-brand-accent/30 hover:bg-accent/50"
      )}
    >
      <div 
        className={cn(
          "w-full aspect-[1.8/1] rounded-lg flex items-center justify-center text-2xl overflow-hidden transition-colors",
          isSelected ? "bg-background text-brand-accent shadow-sm" : "bg-muted/50 text-foreground",
          !customStyle && font.className
        )}
        style={customStyle}
      >
        AaBb
      </div>
      <span className={cn(
        "text-xs font-medium truncate w-full text-center px-1",
        isSelected ? "text-brand-accent font-semibold" : "text-muted-foreground"
      )}>
        {font.name}
      </span>
    </button>
  );
};

const desktopCarouselClassName =
  "grid grid-rows-2 grid-flow-col gap-3 auto-cols-[calc(45%-0.375rem)] overflow-x-auto pb-4 snap-x snap-mandatory touch-pan-x overscroll-x-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

const mobileCarouselClassName =
  "grid grid-rows-2 grid-flow-col gap-3 auto-cols-[calc(45%-0.375rem)] overflow-x-hidden pb-4 snap-x snap-mandatory touch-pan-y scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

const CAROUSEL_BUTTON_SCROLL_RATIO = 0.85;
const CAROUSEL_SCROLL_EPSILON = 1;

const getCarouselSnapTargets = (
  scroller: HTMLDivElement,
  maxScrollLeft: number,
) => {
  const scrollerLeft = scroller.getBoundingClientRect().left;
  const targets = Array.from(scroller.children, (child) => {
    const childElement = child as HTMLElement;
    const childLeft = childElement.getBoundingClientRect().left;
    return Math.min(
      Math.max(childLeft - scrollerLeft + scroller.scrollLeft, 0),
      maxScrollLeft,
    );
  });

  return Array.from(new Set([0, maxScrollLeft, ...targets].map(Math.round))).sort(
    (a, b) => a - b,
  );
};

const resolveCarouselScrollTarget = (
  scroller: HTMLDivElement,
  currentTarget: number,
  rawTarget: number,
  direction: -1 | 1,
  maxScrollLeft: number,
) => {
  const clampedTarget = Math.min(Math.max(rawTarget, 0), maxScrollLeft);
  const snapTargets = getCarouselSnapTargets(scroller, maxScrollLeft);

  if (direction > 0) {
    const forwardTargets = snapTargets.filter(
      (target) =>
        target > currentTarget + CAROUSEL_SCROLL_EPSILON &&
        target <= clampedTarget + CAROUSEL_SCROLL_EPSILON,
    );

    return (
      forwardTargets[forwardTargets.length - 1] ??
      snapTargets.find((target) => target > currentTarget + CAROUSEL_SCROLL_EPSILON) ??
      clampedTarget
    );
  }

  const backwardTargets = snapTargets.filter(
    (target) =>
      target < currentTarget - CAROUSEL_SCROLL_EPSILON &&
      target >= clampedTarget - CAROUSEL_SCROLL_EPSILON,
  );

  return (
    backwardTargets[0] ??
    [...snapTargets]
      .reverse()
      .find((target) => target < currentTarget - CAROUSEL_SCROLL_EPSILON) ??
    clampedTarget
  );
};

const mobileJumpControls = [
  { label: 'Text', section: 'text' },
  { label: 'Paper', section: 'paper' },
  { label: 'Align', section: 'align' },
  { label: 'Realism', section: 'more' },
] as const;

interface CarouselRailProps {
  readonly testId: string;
  readonly previousLabel: string;
  readonly nextLabel: string;
  readonly children: React.ReactNode;
}

const CarouselRail = ({
  testId,
  previousLabel,
  nextLabel,
  children,
}: CarouselRailProps) => {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const targetScrollLeftRef = React.useRef(0);
  const scrollRequestIdRef = React.useRef(0);
  const [scrollState, setScrollState] = useState({
    canScrollBack: false,
    canScrollForward: false,
  });

  const updateScrollState = React.useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const nextState = {
      canScrollBack: scroller.scrollLeft > 1,
      canScrollForward: scroller.scrollLeft < maxScrollLeft - 1,
    };

    setScrollState((current) =>
      current.canScrollBack === nextState.canScrollBack &&
      current.canScrollForward === nextState.canScrollForward
        ? current
        : nextState,
    );
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const frame = window.requestAnimationFrame(updateScrollState);
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateScrollState);
    resizeObserver?.observe(scroller);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
    };
  }, [updateScrollState]);

  const scrollByPage = React.useCallback(
    (direction: -1 | 1) => {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      const currentTarget = Math.min(Math.max(targetScrollLeftRef.current, 0), maxScrollLeft);
      const rawTarget =
        currentTarget +
        direction * Math.max(scroller.clientWidth * CAROUSEL_BUTTON_SCROLL_RATIO, 1);
      const nextTarget = resolveCarouselScrollTarget(
        scroller,
        currentTarget,
        rawTarget,
        direction,
        maxScrollLeft,
      );

      targetScrollLeftRef.current = nextTarget;
      scrollRequestIdRef.current += 1;
      const scrollRequestId = scrollRequestIdRef.current;
      const startScrollLeft = scroller.scrollLeft;

      const forceTargetIfCurrent = () => {
        if (scrollRequestIdRef.current !== scrollRequestId) return;
        scroller.scrollLeft = nextTarget;
        updateScrollState();
      };

      scroller.scrollTo({ left: nextTarget, behavior: 'smooth' });
      window.requestAnimationFrame(updateScrollState);
      window.setTimeout(() => {
        const hasStarted =
          Math.abs(scroller.scrollLeft - startScrollLeft) > CAROUSEL_SCROLL_EPSILON;
        const hasReached =
          Math.abs(scroller.scrollLeft - nextTarget) <= CAROUSEL_SCROLL_EPSILON;

        if (!hasStarted && !hasReached) {
          forceTargetIfCurrent();
          return;
        }

        updateScrollState();
      }, 180);
      window.setTimeout(() => {
        if (Math.abs(scroller.scrollLeft - nextTarget) > CAROUSEL_SCROLL_EPSILON) {
          forceTargetIfCurrent();
          return;
        }

        updateScrollState();
      }, 600);
    },
    [updateScrollState],
  );

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label={previousLabel}
        className="h-11 w-11 rounded-full bg-background"
        disabled={!scrollState.canScrollBack}
        onClick={() => scrollByPage(-1)}
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
      </Button>

      <div className="min-w-0 flex-1 overflow-hidden">
        <div
          ref={scrollerRef}
          data-testid={testId}
          className={mobileCarouselClassName}
          onScroll={updateScrollState}
        >
          {children}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label={nextLabel}
        className="h-11 w-11 rounded-full bg-background"
        disabled={!scrollState.canScrollForward}
        onClick={() => scrollByPage(1)}
      >
        <ChevronRight className="size-5" aria-hidden="true" />
      </Button>
    </div>
  );
};

interface ControlRowProps {
  readonly label: string;
  readonly valueDisplay?: React.ReactNode;
  readonly actions?: React.ReactNode;
  readonly children?: React.ReactNode;
  readonly htmlFor?: string;
  readonly gapClass?: string;
}

const ControlRow = ({
  label,
  valueDisplay,
  actions,
  children,
  htmlFor,
  gapClass = "gap-2",
}: ControlRowProps) => {
  return (
    <div className={cn("flex flex-col", gapClass)}>
      <div className="flex justify-between items-center">
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </Label>
        <div className="flex items-center gap-3">
          {actions}
          {valueDisplay !== undefined && (
            <div className="text-xs font-semibold text-muted-foreground bg-secondary border border-border px-2 py-1 rounded-md">
              {valueDisplay}
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};

interface SliderRowProps {
  readonly label: string;
  readonly value: number;
  readonly onValueChange: (value: number) => void;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly formatValue?: (value: number) => React.ReactNode;
  readonly actions?: React.ReactNode;
  readonly disabled?: boolean;
  readonly gapClass?: string;
}

const SliderRow = ({
  label,
  value,
  onValueChange,
  min,
  max,
  step = 1,
  formatValue,
  actions,
  disabled = false,
  gapClass = "gap-2",
}: SliderRowProps) => {
  const stopGesturePropagation = (event: React.PointerEvent | React.TouchEvent) => {
    event.stopPropagation();
  };

  return (
    <ControlRow
      label={label}
      valueDisplay={formatValue ? formatValue(value) : value}
      actions={actions}
      gapClass={gapClass}
    >
      <Slider
        aria-label={label}
        disabled={disabled}
        value={[value]}
        onValueChange={([val]) => onValueChange(val)}
        min={min}
        max={max}
        step={step}
        onPointerDown={stopGesturePropagation}
        onPointerMove={stopGesturePropagation}
        onPointerUp={stopGesturePropagation}
        onPointerCancel={stopGesturePropagation}
        onTouchStart={stopGesturePropagation}
        onTouchMove={stopGesturePropagation}
        onTouchEnd={stopGesturePropagation}
        onTouchCancel={stopGesturePropagation}
      />
    </ControlRow>
  );
};

const MIN_UPLOAD_MARGIN = 20;
const MIN_UPLOAD_CONTENT_SIZE = 20;

function includeCurrentSliderValue(bounds: { min: number; max: number }, current: number) {
  const value = Number.isFinite(current) ? current : 0;
  return {
    min: Math.floor(Math.min(bounds.min, value)),
    max: Math.ceil(Math.max(bounds.max, value)),
  };
}

function resolveTextHorizontalOffsetBounds(input: {
  currentPageIndex: number;
  settings: HandwritingSettings;
  pageSettings: PageSettings;
}) {
  const zeroOffsetLayout = resolvePageLayout({
    pageIndex: input.currentPageIndex,
    settings: input.settings,
    pageSettings: {
      ...input.pageSettings,
      textHorizontalOffset: 0,
    },
  });
  const baselineLeft = zeroOffsetLayout.writing.textBounds.left;
  const contentRight = zeroOffsetLayout.writing.contentBounds.right;

  return includeCurrentSliderValue(
    {
      min: -baselineLeft,
      max: Math.max(0, contentRight - baselineLeft),
    },
    input.pageSettings.textHorizontalOffset,
  );
}

function resolveUploadMarginSliderBounds(input: {
  resolvedLayout: ReturnType<typeof resolvePageLayout>;
  pageSettings: PageSettings;
}) {
  const { pageSettings, resolvedLayout } = input;
  const maxVerticalMargin = (oppositeMargin: number) =>
    Math.max(
      MIN_UPLOAD_MARGIN,
      Math.floor(resolvedLayout.page.height - oppositeMargin - MIN_UPLOAD_CONTENT_SIZE),
    );
  const maxHorizontalMargin = (oppositeMargin: number) =>
    Math.max(
      MIN_UPLOAD_MARGIN,
      Math.floor(resolvedLayout.page.width - oppositeMargin - MIN_UPLOAD_CONTENT_SIZE),
    );

  return {
    top: includeCurrentSliderValue(
      { min: MIN_UPLOAD_MARGIN, max: maxVerticalMargin(pageSettings.marginBottom) },
      pageSettings.marginTop,
    ),
    bottom: includeCurrentSliderValue(
      { min: MIN_UPLOAD_MARGIN, max: maxVerticalMargin(pageSettings.marginTop) },
      pageSettings.marginBottom,
    ),
    left: includeCurrentSliderValue(
      { min: MIN_UPLOAD_MARGIN, max: maxHorizontalMargin(pageSettings.marginRight) },
      pageSettings.marginLeft,
    ),
    right: includeCurrentSliderValue(
      { min: MIN_UPLOAD_MARGIN, max: maxHorizontalMargin(pageSettings.marginLeft) },
      pageSettings.marginRight,
    ),
  };
}

interface ColorPickerRowProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly gapClass?: string;
}

const ColorPickerRow = ({
  label,
  value,
  onChange,
  gapClass = "gap-3",
}: ColorPickerRowProps) => {
  return (
    <div className={cn("flex flex-col", gapClass)}>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-3 p-2 bg-secondary border border-border rounded-lg">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-md cursor-pointer border-0 p-0 bg-transparent"
        />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
          {value}
        </span>
      </div>
    </div>
  );
};

interface SettingsPanelProps {
  readonly settings: HandwritingSettings;
  readonly onSettingsChange: (settings: HandwritingSettings) => void;
  readonly pageSettings: PageSettings;
  readonly onPageSettingsChange: (pageSettings: PageSettings) => void;
  readonly currentPageIndex: number;
  readonly onApplyToAllPages?: () => void;
  readonly previewScale: number;
  readonly onPreviewScaleChange: (value: number) => void;
  readonly onCurrentPageChange: (index: number) => void;
  readonly totalPages: number;
  readonly isPaginationComplete: boolean;
  readonly pages: LineData[][];
  readonly onClearAll: () => void;
  readonly showLogo?: boolean;
  readonly isMobileLayout?: boolean;
  readonly idPrefix?: string;
}

export default function SettingsPanel({
  settings,
  onSettingsChange,
  pageSettings,
  onPageSettingsChange,
  currentPageIndex,
  onApplyToAllPages,
  onClearAll,
  showLogo = true,
  isMobileLayout = false,
  idPrefix,
}: SettingsPanelProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const carouselDragRef = React.useRef<{
    pointerId: number;
    startX: number;
    scrollLeft: number;
    moved: boolean;
  } | null>(null);
  const suppressCarouselClickRef = React.useRef(false);
  const generatedIdPrefix = React.useId();
  const instanceIdPrefix = idPrefix ?? generatedIdPrefix;
  const paperFormatId = `${instanceIdPrefix}-paper-format`;
  const paperOrientationId = `${instanceIdPrefix}-paper-orientation`;
  const [customFontError, setCustomFontError] = useState<string | null>(null);
  const [lineDetecting, setLineDetecting] = useState(false);
  const [lineDetectError, setLineDetectError] = useState<string | null>(null);
  const [lineDetectInfo, setLineDetectInfo] = useState<{ offset: number; spacing: number } | null>(null);
  const resolvedLayout = useMemo(
    () =>
      resolvePageLayout({
        pageIndex: currentPageIndex,
        settings,
        pageSettings,
      }),
    [currentPageIndex, pageSettings, settings],
  );
  const resolvedPaper = resolvedLayout.paper;
  const textHorizontalOffsetBounds = useMemo(
    () =>
      resolveTextHorizontalOffsetBounds({
        currentPageIndex,
        settings,
        pageSettings,
      }),
    [currentPageIndex, pageSettings, settings],
  );
  const uploadMarginSliderBounds = useMemo(
    () =>
      resolveUploadMarginSliderBounds({
        resolvedLayout,
        pageSettings,
      }),
    [pageSettings, resolvedLayout],
  );

  const paperControls = useMemo(
    () => resolvePaperControlsModel({ settings, pageSettings, resolvedPaper }),
    [settings, pageSettings, resolvedPaper]
  );
  const currentBackground = paperControls.currentBackgroundImage;
  const showManualAlignmentControls = paperControls.showManualAlignmentControls;
  const showLineHeightControl = paperControls.showLineHeightControl;

  const getEffectiveBackgroundImages = () => {
    if ((settings.customBackgroundImages?.length ?? 0) > 0) {
      return settings.customBackgroundImages;
    }
    if (settings.customBackgroundImage) {
      return [settings.customBackgroundImage];
    }
    return [];
  };
  const effectiveBackgroundImages = getEffectiveBackgroundImages();
  const currentPaperStyle = useMemo(
    () => resolveDocumentPaperStyle(settings.paper),
    [settings.paper],
  );
  const currentPaperFormat = useMemo(
    () => resolveDocumentPaperFormat(settings.paper),
    [settings.paper],
  );
  const currentPaperOrientation = useMemo(
    () => resolveDocumentPaperOrientation(settings.paper),
    [settings.paper],
  );

  const availableFonts = useMemo(() => HANDWRITING_FONTS.filter(f => f.value !== 'custom'), []);
  useEffect(() => {
    setLineDetectError(null);
    setLineDetectInfo(null);
  }, [currentPageIndex, currentBackground]);

  const handleCarouselPointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return;

    event.stopPropagation();
    carouselDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
      moved: false,
    };

    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic test events and older browsers may not allow capture for this pointer.
    }
  }, []);

  const handleCarouselPointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = carouselDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startX;
    if (Math.abs(deltaX) > 4) {
      dragState.moved = true;
      suppressCarouselClickRef.current = true;
    }

    event.currentTarget.scrollLeft = dragState.scrollLeft - deltaX;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleCarouselPointerEnd = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = carouselDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    suppressCarouselClickRef.current = dragState.moved;
    carouselDragRef.current = null;
    event.stopPropagation();
  }, []);

  const handleCarouselClickCapture = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressCarouselClickRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    suppressCarouselClickRef.current = false;
  }, []);



  const updateSetting = <K extends keyof HandwritingSettings>(
    key: K,
    value: HandwritingSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const updatePageSetting = <K extends keyof PageSettings>(
    key: K,
    value: PageSettings[K]
  ) => {
    onPageSettingsChange({ ...pageSettings, [key]: value });
  };

  const updateSettings = (patch: Partial<HandwritingSettings>) => {
    onSettingsChange({ ...settings, ...patch });
  };

  const updateBuiltinSelection = (
    patch: Partial<{
      style: PaperStyle;
      format: PaperFormat;
      orientation: PaperOrientation;
    }>,
  ) => {
    onSettingsChange({
      ...settings,
      paper: updateDocumentPaperSelection(settings.paper, patch),
    });
  };

  const handleDetectLines = async () => {
    if (!currentBackground || lineDetecting) return;
    setLineDetectError(null);
    setLineDetectInfo(null);
    setLineDetecting(true);

    try {
      const expectedLineHeight = paperControls.effectiveSpacingValue ?? Math.round(pageSettings.fontSize * settings.lineHeight);
      const result = await detectBackgroundLines(currentBackground, {
        targetWidth: resolvedLayout.page.width,
        targetHeight: resolvedLayout.page.height,
        marginTop: pageSettings.marginTop,
        marginBottom: pageSettings.marginBottom,
        marginLeft: pageSettings.marginLeft,
        marginRight: pageSettings.marginRight,
        expectedLineHeight,
      });

      if (!result) {
        setLineDetectError('Could not detect consistent horizontal lines in this background.');
        return;
      }

      const { offset, spacing } = normalizeUploadCalibrationResult(result);

      onPageSettingsChange(applyUploadCalibration(pageSettings, { offset, spacing }));
      setLineDetectInfo({ offset, spacing });
    } catch {
      setLineDetectError('Failed to analyze background. Please try another image.');
    } finally {
      setLineDetecting(false);
    }
  };

  const updateRandomness = (
    key: keyof HandwritingSettings['randomness'],
    value: number | boolean
  ) => {
    onSettingsChange({
      ...settings,
      randomness: { ...settings.randomness, [key]: value },
    });
  };

  const renderCarousel = (
    testId: string,
    previousLabel: string,
    nextLabel: string,
    children: React.ReactNode,
  ) => {
    if (isMobileLayout) {
      return (
        <CarouselRail
          testId={testId}
          previousLabel={previousLabel}
          nextLabel={nextLabel}
        >
          {children}
        </CarouselRail>
      );
    }

    return (
      <div className="relative w-full overflow-hidden">
        <div
          data-testid={testId}
          className={desktopCarouselClassName}
          onPointerDown={handleCarouselPointerDown}
          onPointerMove={handleCarouselPointerMove}
          onPointerUp={handleCarouselPointerEnd}
          onPointerCancel={handleCarouselPointerEnd}
          onClickCapture={handleCarouselClickCapture}
        >
          {children}
        </div>
      </div>
    );
  };

  return (
    <div ref={panelRef} className="p-6 space-y-6">
      {showLogo ? (
        <div className="flex items-center">
          <div className="flex h-16 w-16 items-center justify-center">
            <NextImage
              src="/logo-without-background.png"
              alt="Text2Ink logo"
              width={56}
              height={56}
              loading="eager"
              className="h-14 w-14 object-contain"
            />
          </div>
        </div>
      ) : null}

      {isMobileLayout && (
        <div className="sticky top-0 -mt-6 pt-2 pb-3 bg-background z-20 border-b border-border/50 -mx-6 px-6 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {mobileJumpControls.map(({ label, section }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                const targetId = `${instanceIdPrefix}-section-${section}`;
                const el = panelRef.current?.querySelector(`[id="${targetId}"]`);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="min-h-11 px-4 py-1.5 text-xs font-semibold rounded-full bg-secondary border border-border text-foreground hover:bg-accent hover:text-accent-foreground active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Text Section */}
      <div
        id={`${instanceIdPrefix}-section-text`}
        data-section="text"
        className="space-y-6 scroll-mt-20"
      >
        <div className="flex items-center gap-2">
          <Type className="w-5 h-5 text-brand-accent" />
          <h2 className="text-section-title font-semibold tracking-tight text-foreground">Text</h2>
        </div>

        <div className="space-y-6">
          <ControlRow label="Fonts" gapClass="gap-3">
            {renderCarousel(
              "font-carousel",
              "Previous fonts",
              "Next fonts",
              availableFonts.map((font) => (
                <div key={font.value} className="snap-start">
                  <FontCard
                    font={font}
                    isSelected={settings.fontFamily === font.value}
                    onClick={() => {
                      setCustomFontError(null);
                      updateSetting('fontFamily', font.value);
                    }}
                  />
                </div>
              )),
            )}
          </ControlRow>

          <ControlRow label="Custom Font">
            <div className="grid grid-cols-2 gap-3">
              {settings.customFont ? (
                <div className="relative group">
                  <FontCard
                    font={{
                      name: settings.customFont.name,
                      value: 'custom',
                      className: '',
                      cssFontFamily: '',
                    }}
                    isSelected={settings.fontFamily === 'custom'}
                    onClick={() => {
                      setCustomFontError(null);
                      updateSetting('fontFamily', 'custom');
                    }}
                    customStyle={{ fontFamily: settings.customFont.family }}
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => {
                      setCustomFontError(null);
                      updateSettings({
                        fontFamily:
                          settings.fontFamily === 'custom'
                            ? HANDWRITING_FONTS[0].value
                            : settings.fontFamily,
                        customFont: null,
                      });
                    }}
                    className="absolute -top-1.5 -right-1.5 rounded-full opacity-100 xl:opacity-0 xl:group-hover:opacity-100 shadow-sm z-10 w-6 h-6 min-w-0"
                    title="Remove custom font"
                    type="button"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full aspect-[1/0.95] border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-brand-accent hover:bg-brand-accent/5 transition-all group">
                  <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center mb-2 group-hover:bg-brand-accent/10 transition-colors">
                    <Upload className="w-4 h-4 text-muted-foreground group-hover:text-brand-accent transition-colors" />
                  </div>
                  <span className="label-text text-label group-hover:text-brand-accent transition-colors text-center px-2">Upload Font</span>
                  <input
                    type="file"
                    accept=".ttf,.otf,font/ttf,font/otf,application/x-font-ttf,application/x-font-opentype"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;

                      setCustomFontError(null);

                      const { format, error } = validateFontFile(file);

                      if (error || !format) {
                        setCustomFontError(error);
                        return;
                      }

                      const reader = new FileReader();
                      reader.onerror = () => {
                        setCustomFontError('Failed to read the font file. Please try again.');
                      };
                      reader.onload = (event) => {
                        const dataUrl = event.target?.result as string | undefined;
                        if (!dataUrl) {
                          setCustomFontError('Failed to read the font file. Please try again.');
                          return;
                        }

                        const family = generateFontFamilyName(file.name);

                        updateSettings({
                          fontFamily: 'custom',
                          customFont: {
                            name: file.name,
                            family,
                            dataUrl,
                            format,
                          },
                        });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              )}

              {customFontError && (
                <p className="text-sm font-semibold text-destructive uppercase">{customFontError}</p>
              )}
            </div>
          </ControlRow>

          <SliderRow
            label="Font Size"
            value={pageSettings.fontSize}
            onValueChange={(value) => updatePageSetting('fontSize', value)}
            min={14}
            max={48}
            formatValue={(value) => `${value}px`}
          />

          <ColorPickerRow
            label="Ink Color"
            value={settings.inkColor}
            onChange={(value) => updateSetting('inkColor', value)}
          />
        </div>
      </div>

      <Separator />

      {/* Paper Section */}
      <div
        id={`${instanceIdPrefix}-section-paper`}
        data-section="paper"
        className="space-y-6 scroll-mt-20"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-accent" />
          <h2 className="text-section-title font-semibold tracking-tight text-foreground">Paper</h2>
        </div>

        <div className="space-y-6">
          <ControlRow label="Paper Style" gapClass="gap-3">
            {renderCarousel(
              "paper-style-carousel",
              "Previous paper styles",
              "Next paper styles",
              PAPER_STYLES.map((style) => (
                <div key={style.value} className="snap-start">
                  <PaperStyleCard
                    style={{ name: style.name, value: style.value }}
                    paperColor={settings.paperColor}
                    isSelected={currentPaperStyle === style.value}
                    onClick={() =>
                      updateBuiltinSelection({
                        style: style.value,
                      })
                    }
                  />
                </div>
              )),
            )}
          </ControlRow>

          <ControlRow label="Size" htmlFor={paperFormatId} gapClass="gap-3">
            <Select
              value={currentPaperFormat}
              onValueChange={(value) =>
                updateBuiltinSelection({
                  format: value as PaperFormat,
                })
              }
            >
              <SelectTrigger id={paperFormatId} className="w-full h-10">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {PAPER_FORMATS.map((format) => (
                  <SelectItem key={format.value} value={format.value}>
                    {format.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ControlRow>

          <ControlRow label="Orientation" htmlFor={paperOrientationId} gapClass="gap-3">
            <Select
              value={currentPaperOrientation}
              onValueChange={(value) =>
                updateBuiltinSelection({
                  orientation: value as PaperOrientation,
                })
              }
            >
              <SelectTrigger id={paperOrientationId} className="w-full h-10">
                <SelectValue placeholder="Select orientation" />
              </SelectTrigger>
              <SelectContent>
                {PAPER_ORIENTATIONS.map((orientation) => (
                  <SelectItem key={orientation.value} value={orientation.value}>
                    {orientation.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ControlRow>

          <ControlRow label="Custom Background Image">
            <div className="space-y-3">
              {effectiveBackgroundImages.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {effectiveBackgroundImages.map((src, idx) => (
                      <div key={`${idx}-${src.slice(0, 30)}`} className="relative group">
                        <NextImage
                          src={src}
                          alt={`Custom background ${idx + 1}`}
                          width={256}
                          height={128}
                          className="w-full h-16 object-cover rounded-lg border border-border"
                          unoptimized
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            const next = effectiveBackgroundImages.filter((_, i) => i !== idx);
                            updateSettings({
                              customBackgroundImages: next,
                              customBackgroundImage: next.length > 0 ? next[0] : null,
                            });
                          }}
                          className="absolute -top-1 -right-1 rounded-full opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity shadow-sm w-6 h-6 min-w-0"
                          title="Remove background image"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="link"
                    type="button"
                    onClick={() =>
                      updateSettings({
                        customBackgroundImages: [],
                        customBackgroundImage: null,
                      })
                    }
                    className="text-sm font-semibold text-destructive uppercase tracking-wider p-0 h-auto hover:no-underline"
                  >
                    Remove all
                  </Button>
                </div>
              )}

              <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-brand-accent hover:bg-muted/50 transition-colors">
                <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                <span className="text-sm font-medium">Upload PNG or JPG</span>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = '';
                    if (files.length === 0) return;

                    readFilesAsDataURL(files)
                      .then((results) => {
                        const next = [...effectiveBackgroundImages, ...results];
                        updateSettings({
                          customBackgroundImages: next,
                          customBackgroundImage: next[0] ?? null,
                        });
                      })
                      .catch(() => { });
                  }}
                />
              </label>
            </div>
          </ControlRow>

          {paperControls.showPaperColorControls && (
            <ControlRow label="Paper Color" gapClass="gap-3">
              <div className="flex flex-wrap gap-2 p-2 bg-secondary border border-border rounded-lg">
                {PAPER_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => updateSetting('paperColor', color.value)}
                    className={`w-8 h-8 rounded-md border-2 transition-all shadow-sm ${settings.paperColor === color.value
                      ? 'border-brand-accent scale-110'
                      : 'border-transparent hover:border-border hover:scale-105'
                      }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </ControlRow>
          )}

        </div>
      </div>

      <Separator />

      {/* Alignment Section */}
      <div
        id={`${instanceIdPrefix}-section-align`}
        data-section="align"
        className="space-y-6 scroll-mt-20"
      >
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-brand-accent" />
          <h2 className="text-section-title font-semibold tracking-tight text-foreground">Alignment</h2>
        </div>

        <div className="space-y-6">
          {showLineHeightControl && (
            <SliderRow
              label="Line Height"
              value={settings.lineHeight}
              onValueChange={(value) => updateSetting('lineHeight', value)}
              min={1.2}
              max={3}
              step={0.1}
              formatValue={(value) => value.toFixed(1)}
            />
          )}

          {paperControls.showTextHorizontalOffsetControl && (
            <SliderRow
              label="Text Position"
              value={pageSettings.textHorizontalOffset}
              onValueChange={(value) => updatePageSetting('textHorizontalOffset', value)}
              min={textHorizontalOffsetBounds.min}
              max={textHorizontalOffsetBounds.max}
              step={1}
              formatValue={(value) => `${value}px`}
            />
          )}

          {paperControls.showLineTiltControl && (
            <SliderRow
              label="Line Tilt"
              value={pageSettings.lineTilt}
              onValueChange={(value) => updatePageSetting('lineTilt', value)}
              min={-15}
              max={15}
              step={0.5}
              formatValue={(value) => `${value}°`}
            />
          )}

          {showManualAlignmentControls && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 pt-4 border-t border-border/50">
              <SliderRow
                label="Top Margin"
                value={pageSettings.marginTop}
                onValueChange={(value) => updatePageSetting('marginTop', value)}
                min={uploadMarginSliderBounds.top.min}
                max={uploadMarginSliderBounds.top.max}
                step={5}
                formatValue={(value) => `${value}px`}
                gapClass="gap-3"
              />

              <SliderRow
                label="Bottom Margin"
                value={pageSettings.marginBottom}
                onValueChange={(value) => updatePageSetting('marginBottom', value)}
                min={uploadMarginSliderBounds.bottom.min}
                max={uploadMarginSliderBounds.bottom.max}
                step={5}
                formatValue={(value) => `${value}px`}
                gapClass="gap-3"
              />

              <SliderRow
                label="Left Margin"
                value={pageSettings.marginLeft}
                onValueChange={(value) => updatePageSetting('marginLeft', value)}
                min={uploadMarginSliderBounds.left.min}
                max={uploadMarginSliderBounds.left.max}
                step={5}
                formatValue={(value) => `${value}px`}
                gapClass="gap-3"
              />

              <SliderRow
                label="Right Margin"
                value={pageSettings.marginRight}
                onValueChange={(value) => updatePageSetting('marginRight', value)}
                min={uploadMarginSliderBounds.right.min}
                max={uploadMarginSliderBounds.right.max}
                step={5}
                formatValue={(value) => `${value}px`}
                gapClass="gap-3"
              />
            </div>
          )}

          {paperControls.showSpacingControls && (
            <div className="space-y-6 pt-2 border-t border-border/50">
              <div className="flex flex-col gap-3">
                <Button
                  variant="brand"
                  onClick={handleDetectLines}
                  disabled={!currentBackground || lineDetecting}
                  className="w-full font-bold shadow-sm"
                >
                  {lineDetecting ? 'Detecting...' : 'Auto-Detect Lines'}
                </Button>
                {lineDetectInfo && (
                  <p className="text-sm font-medium text-success bg-success/10 px-3 py-2 rounded-lg">
                    ✓ Applied offset {lineDetectInfo.offset}px and spacing {lineDetectInfo.spacing}px.
                  </p>
                )}
                {lineDetectError && (
                  <p className="text-sm font-semibold text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{lineDetectError}</p>
                )}
              </div>

              <SliderRow
                label="Line Offset (Y Position)"
                value={pageSettings.customLineOffset}
                onValueChange={(value) => updatePageSetting('customLineOffset', value)}
                min={-50}
                max={50}
                step={1}
                formatValue={(value) => `${value}px`}
                gapClass="gap-3"
              />

              <SliderRow
                label="Custom Line Spacing"
                value={paperControls.effectiveSpacingValue ?? Math.round(pageSettings.fontSize * settings.lineHeight)}
                onValueChange={(value) => updatePageSetting('customLineSpacing', value)}
                min={20}
                max={120}
                step={1}
                disabled={!paperControls.isSpacingEditable}
                formatValue={() => paperControls.effectiveSpacingValue ?? 'Auto'}
                actions={
                  pageSettings.customLineSpacing !== null && (
                    <Button
                      variant="link"
                      onClick={() => updatePageSetting('customLineSpacing', null)}
                      className="text-xs font-semibold text-brand-accent uppercase tracking-wider p-0 h-auto hover:no-underline"
                    >
                      Reset
                    </Button>
                  )
                }
                gapClass="gap-3"
              />
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Realism Section */}
      <div
        id={`${instanceIdPrefix}-section-more`}
        data-section="more"
        className="space-y-6 scroll-mt-20"
      >
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-brand-accent" />
          <h2 className="text-section-title font-semibold tracking-tight text-foreground">Realism</h2>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-3 bg-secondary border border-border rounded-lg">
            <Label className="text-sm font-medium" htmlFor="randomness-toggle">Enable Randomness</Label>
            <Switch
              id="randomness-toggle"
              checked={settings.randomness.enabled}
              onCheckedChange={(checked) => updateRandomness('enabled', checked)}
            />
          </div>

          {settings.randomness.enabled && (
            <div className="space-y-6 pt-2">
              <SliderRow
                label="Letter Spacing Variation"
                value={settings.randomness.spacing}
                onValueChange={(value) => updateRandomness('spacing', value)}
                min={0}
                max={5}
                step={0.1}
                formatValue={(value) => value.toFixed(1)}
                gapClass="gap-3"
              />

              <SliderRow
                label="Baseline Variation"
                value={settings.randomness.baseline}
                onValueChange={(value) => updateRandomness('baseline', value)}
                min={0}
                max={3}
                step={0.1}
                formatValue={(value) => value.toFixed(1)}
                gapClass="gap-3"
              />

              <SliderRow
                label="Rotation Variation"
                value={settings.randomness.rotation}
                onValueChange={(value) => updateRandomness('rotation', value)}
                min={0}
                max={3}
                step={0.1}
                formatValue={(value) => `${value.toFixed(1)}°`}
                gapClass="gap-3"
              />
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Actions Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-brand-accent" />
          <h2 className="text-section-title font-semibold tracking-tight text-foreground">Actions</h2>
        </div>

        <div className="space-y-6">
          <div className="pt-2 space-y-4">
            <Button
              variant="brand"
              size="lg"
              onClick={onApplyToAllPages}
              className="w-full font-semibold transition-all"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Apply to all pages
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                const newField = {
                  id: crypto.randomUUID(),
                  text: '',
                  x: 100,
                  y: 100,
                  width: 200,
                  height: 50,
                  color: settings.inkColor,
                  fontSize: pageSettings.fontSize,
                };
                updatePageSetting('textFields', [...(pageSettings.textFields || []), newField]);
              }}
              className="w-full font-semibold transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Text Box
            </Button>

            <Button
              variant="outline"
              onClick={onClearAll}
              className="w-full py-3 text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive font-bold transition-all active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Everything
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
