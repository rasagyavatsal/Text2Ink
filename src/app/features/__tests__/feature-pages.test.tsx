import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FontsPage, { metadata as fontsMetadata } from '../handwriting-fonts/page';
import PaperPage, { metadata as paperMetadata } from '../notebook-paper-styles/page';
import PaperColorsPage, { metadata as paperColorsMetadata } from '../paper-colors/page';
import RealismEffectsPage, { metadata as realismMetadata } from '../realism-effects/page';
import { productFacts } from '@/lib/seo/productFacts';

vi.mock('@/components/ThemePicker', () => ({
  default: () => <div data-testid="theme-picker" />,
}));

const getJsonLdTypes = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('script[type="application/ld+json"]'))
    .map((script) => JSON.parse(script.textContent ?? '{}'))
    .map((schema) => schema['@type']);

const getSectionParagraphCounts = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-testid="feature-content-section"]'))
    .map((section) => section.querySelectorAll('[data-testid="feature-section-paragraph"]').length);

const countMediaPlaceholders = (container: HTMLElement, kind: 'image' | 'video') =>
  container.querySelectorAll(`[data-testid="feature-media-placeholder-${kind}"]`).length;

describe('feature pages', () => {
  it('publishes canonical metadata for all crawlable feature routes', () => {
    expect(fontsMetadata.alternates?.canonical).toBe(
      'https://text2ink.com/features/handwriting-fonts',
    );
    expect(paperMetadata.alternates?.canonical).toBe(
      'https://text2ink.com/features/notebook-paper-styles',
    );
    expect(paperColorsMetadata.alternates?.canonical).toBe(
      'https://text2ink.com/features/paper-colors',
    );
    expect(realismMetadata.alternates?.canonical).toBe(
      'https://text2ink.com/features/realism-effects',
    );
  });

  it('renders the handwriting fonts page from product facts with image placeholders', () => {
    const { container } = render(<FontsPage />);

    expect(screen.getByRole('heading', {
      level: 1,
      name: 'Handwriting Fonts in Text2Ink',
    })).toBeInTheDocument();
    expect(screen.getByTestId('feature-direct-answer').textContent?.split(/\s+/).length)
      .toBeGreaterThanOrEqual(50);
    expect(screen.getByText(productFacts.handwritingFonts[0].name)).toBeInTheDocument();
    expect(screen.getByText(productFacts.handwritingFonts.at(-1)?.name ?? '')).toBeInTheDocument();
    expect(screen.getByText(/upload \.ttf or \.otf/i)).toBeInTheDocument();
    expect(screen.getAllByTestId('feature-media-placeholder-image')[0]).toHaveTextContent(/font picker/i);
    expect(screen.getByRole('link', { name: /open the editor/i })).toHaveAttribute('href', '/editor');
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
    expect(getJsonLdTypes(container)).toEqual(expect.arrayContaining(['BreadcrumbList', 'FAQPage']));
  });

  it('uses a blog-style article flow instead of feature section cards', () => {
    const { container } = render(<FontsPage />);

    const article = container.querySelector('[data-testid="feature-article"]');
    expect(article?.tagName).toBe('ARTICLE');
    expect(article).toHaveClass('w-full');
    expect(article).toHaveClass('max-w-none');
    expect(article).not.toHaveClass('max-w-3xl');
    expect(article).not.toHaveClass('grid');
    expect(article).not.toHaveClass('md:grid-cols-2');

    const directAnswer = screen.getByTestId('feature-direct-answer');
    expect(directAnswer).not.toHaveClass('bg-muted/40');
    expect(directAnswer).not.toHaveClass('border');
    expect(directAnswer).not.toHaveClass('rounded-lg');

    const section = screen.getByRole('heading', { level: 2, name: 'Built-in font choices' })
      .closest('section');
    expect(section).toBeInTheDocument();
    expect(section).not.toHaveClass('bg-card');
    expect(section).not.toHaveClass('border');
    expect(section).not.toHaveClass('rounded-lg');
    expect(section).not.toHaveClass('p-5');
    expect(section).not.toHaveClass('sm:p-6');
  });

  it('uses paragraph-heavy sections and multiple media placeholders across the gutter-width article', () => {
    const pages = [
      { page: <FontsPage />, kind: 'image' as const },
      { page: <PaperPage />, kind: 'image' as const },
      { page: <PaperColorsPage />, kind: 'image' as const },
      { page: <RealismEffectsPage />, kind: 'video' as const },
    ];

    for (const { page, kind } of pages) {
      const { container, unmount } = render(page);
      const article = container.querySelector('[data-testid="feature-article"]');

      expect(article).toHaveClass('w-full');
      expect(article).toHaveClass('max-w-none');
      expect(container.querySelector('.max-w-document')).not.toBeInTheDocument();
      expect(countMediaPlaceholders(container, kind)).toBeGreaterThanOrEqual(3);
      expect(getSectionParagraphCounts(container).every((count) => count >= 2)).toBe(true);
      expect(article?.querySelectorAll('ul').length).toBe(0);

      unmount();
    }
  });

  it('renders the notebook paper styles page from product facts with image placeholders', () => {
    const { container } = render(<PaperPage />);

    expect(screen.getByRole('heading', {
      level: 1,
      name: 'Notebook Paper Styles in Text2Ink',
    })).toBeInTheDocument();
    for (const style of productFacts.paper.styles) {
      expect(screen.getByText(style.name)).toBeInTheDocument();
    }
    expect(screen.getAllByText(/Letter, A4, and A3/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Portrait and Landscape/i).length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('feature-media-placeholder-image')[0]).toHaveTextContent(/paper picker/i);
    expect(screen.getByRole('link', { name: /open the editor/i })).toHaveAttribute('href', '/editor');
    expect(getJsonLdTypes(container)).toEqual(expect.arrayContaining(['BreadcrumbList', 'FAQPage']));
  });

  it('renders the paper colors page from product facts with image placeholders', () => {
    const { container } = render(<PaperColorsPage />);

    expect(screen.getByRole('heading', {
      level: 1,
      name: 'Paper Colors in Text2Ink',
    })).toBeInTheDocument();
    for (const color of productFacts.paper.colors) {
      expect(screen.getByText(color.name)).toBeInTheDocument();
      expect(screen.getByText(color.value)).toBeInTheDocument();
    }
    expect(screen.getByTestId('feature-direct-answer').textContent?.split(/\s+/).length)
      .toBeGreaterThanOrEqual(50);
    expect(screen.getAllByTestId('feature-media-placeholder-image')[0]).toHaveTextContent(/paper color/i);
    expect(screen.getByRole('link', { name: /open the editor/i })).toHaveAttribute('href', '/editor');
    expect(getJsonLdTypes(container)).not.toContain('Article');
  });

  it('renders the realism effects page from product facts with video placeholders', () => {
    const { container } = render(<RealismEffectsPage />);

    expect(screen.getByRole('heading', {
      level: 1,
      name: 'Realism Effects in Text2Ink',
    })).toBeInTheDocument();
    expect(screen.getByText('Enable Randomness')).toBeInTheDocument();
    expect(screen.getByText(/spacing: 2/i)).toBeInTheDocument();
    expect(screen.getByText(/baseline: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/rotation: 0\.5/i)).toBeInTheDocument();
    expect(screen.getAllByTestId('feature-media-placeholder-video')[0]).toHaveTextContent(/per-character/i);
    expect(screen.getByRole('link', { name: /open the editor/i })).toHaveAttribute('href', '/editor');
    expect(getJsonLdTypes(container)).toEqual(expect.arrayContaining(['BreadcrumbList', 'FAQPage']));
  });
});
