'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('t2i-section-card', className)} aria-label={typeof title === 'string' ? title : undefined}>
      <div className="t2i-section-card__header">
        <h3 className="t2i-section-card__title">{title}</h3>
        {description ? <p className="t2i-section-card__description">{description}</p> : null}
      </div>
      <div className="t2i-section-card__body">{children}</div>
    </section>
  );
}

export function SettingRow({
  label,
  value,
  hint,
  children,
  className,
}: {
  label: React.ReactNode;
  value?: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('t2i-setting-row', className)}>
      <div className="t2i-setting-row__meta">
        <div className="t2i-setting-row__label">{label}</div>
        {hint ? <p className="t2i-setting-row__hint">{hint}</p> : null}
      </div>
      <div className="t2i-setting-row__control">
        {value !== undefined ? <span className="t2i-value-chip">{value}</span> : null}
        {children}
      </div>
    </div>
  );
}

type SidebarView<T extends string = string> = {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

export function SidebarTabStrip<T extends string>({
  activeView,
  onViewChange,
  views,
  className,
}: {
  activeView: T;
  onViewChange: (view: T) => void;
  views: SidebarView<T>[];
  className?: string;
}) {
  return (
    <div className={cn('t2i-sidebar-tabs', className)} role="tablist" aria-label="Editor tool views">
      {views.map((view) => {
        const selected = activeView === view.id;
        const Icon = view.icon;

        return (
          <button
            key={view.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`editor-${view.id}-panel`}
            id={`editor-${view.id}-tab`}
            className="t2i-sidebar-tab"
            data-active={selected ? 'true' : 'false'}
            onClick={() => onViewChange(view.id)}
          >
            {Icon ? <Icon className="h-4 w-4" /> : null}
            {view.label}
          </button>
        );
      })}
    </div>
  );
}

export function SelectorCarousel({
  ariaLabel,
  pageLabel,
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  children,
  className,
}: {
  ariaLabel: string;
  pageLabel: string;
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const normalizedPage = Math.min(Math.max(currentPage + 1, 1), Math.max(totalPages, 1));

  return (
    <div className={cn('t2i-selector-carousel', className)} role="group" aria-label={ariaLabel}>
      <div className="sr-only" aria-live="polite">
        {pageLabel} {normalizedPage} of {Math.max(totalPages, 1)}
      </div>
      <button
        type="button"
        className="t2i-carousel-button t2i-carousel-button--previous"
        onClick={onPrevious}
        aria-label={`Previous ${ariaLabel.toLowerCase()}`}
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <div className="t2i-selector-carousel__items">{children}</div>
      <button
        type="button"
        className="t2i-carousel-button t2i-carousel-button--next"
        onClick={onNext}
        aria-label={`Next ${ariaLabel.toLowerCase()}`}
      >
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function UploadWell({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<'label'>) {
  return (
    <label className={cn('t2i-upload-well', className)} {...props}>
      {children}
    </label>
  );
}

export function StatusCallout({
  tone = 'info',
  children,
  className,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('t2i-status-callout', className)} data-tone={tone} role="status">
      {children}
    </div>
  );
}
