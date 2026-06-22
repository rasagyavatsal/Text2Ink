import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ExportPage, { metadata as exportMetadata } from '../export-handwritten-notes/page';
import FontsPage, { metadata as fontsMetadata } from '../handwriting-fonts/page';
import PaperPage, { metadata as paperMetadata } from '../notebook-paper-styles/page';
import { productFacts } from '@/lib/seo/productFacts';

vi.mock('@/components/ThemePicker', () => ({
  default: () => <div data-testid="theme-picker" />,
}));

const getJsonLdTypes = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('script[type="application/ld+json"]'))
    .map((script) => JSON.parse(script.textContent ?? '{}'))
    .map((schema) => schema['@type']);

describe('feature pages', () => {
  it('publishes canonical metadata for all crawlable feature routes', () => {
    expect(fontsMetadata.alternates?.canonical).toBe(
      'https://text2ink.com/features/handwriting-fonts',
    );
    expect(paperMetadata.alternates?.canonical).toBe(
      'https://text2ink.com/features/notebook-paper-styles',
    );
    expect(exportMetadata.alternates?.canonical).toBe(
      'https://text2ink.com/features/export-handwritten-notes',
    );
  });

  it('renders the handwriting fonts page from product facts', () => {
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
    expect(screen.getByRole('link', { name: /open the editor/i })).toHaveAttribute('href', '/editor');
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
    expect(getJsonLdTypes(container)).toEqual(expect.arrayContaining(['BreadcrumbList', 'FAQPage']));
  });

  it('renders the notebook paper styles page from product facts', () => {
    render(<PaperPage />);

    expect(screen.getByRole('heading', {
      level: 1,
      name: 'Notebook Paper Styles in Text2Ink',
    })).toBeInTheDocument();
    for (const style of productFacts.paper.styles) {
      expect(screen.getByText(style.name)).toBeInTheDocument();
    }
    expect(screen.getAllByText(/Letter, A4, and A3/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Portrait and Landscape/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /open the editor/i })).toHaveAttribute('href', '/editor');
  });

  it('renders the export page from product facts without article schema', () => {
    const { container } = render(<ExportPage />);

    expect(screen.getByRole('heading', {
      level: 1,
      name: 'Export Handwritten Notes from Text2Ink',
    })).toBeInTheDocument();
    for (const format of productFacts.exportFormats) {
      expect(screen.getByText(format.label)).toBeInTheDocument();
    }
    expect(screen.getAllByText(/cancel an active export/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /open the editor/i })).toHaveAttribute('href', '/editor');
    expect(getJsonLdTypes(container)).not.toContain('Article');
  });
});
