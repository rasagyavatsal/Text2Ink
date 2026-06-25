import { Metadata } from 'next';
import Link from 'next/link';
import { preload } from 'react-dom';
import { Button } from '@/components/ui/button';
import SiteHeader from '@/components/patterns/SiteHeader';
import SiteFooter from '@/components/patterns/SiteFooter';
import HomeToc from '@/components/patterns/HomeToc';
import JsonLd from '@/components/seo/JsonLd';
import {
  buildBreadcrumbListJsonLd,
  buildFaqPageJsonLd,
  buildOrganizationJsonLd,
  buildSoftwareApplicationJsonLd,
  buildWebSiteJsonLd,
} from '@/lib/seo/jsonLd';
import {
  canonicalUrl,
  productFacts,
  siteFacts,
  webApplicationFeatureList,
} from '@/lib/seo/productFacts';

const pageTitle = 'Text to Handwriting Converter';
const pageDescription = 'Use Text2Ink to convert typed text into handwriting-style notebook pages with built-in fonts, paper styles, text boxes, and PDF, PNG, or JPG exports.';

const fontCount = productFacts.handwritingFonts.length;
const customFontFormats = productFacts.customFontUpload.formats.join(' or ');
const paperStyleCount = productFacts.paper.styles.length;
const paperStyleNames = productFacts.paper.styles.map((style) => style.name).join(', ');
const paperFormatNames = productFacts.paper.formats.map((format) => format.name).join(', ');
const paperOrientationNames = productFacts.paper.orientations.map((orientation) => orientation.name).join(' and ');
const paperColorNames = productFacts.paper.colors.map((color) => color.name).join(', ');
const backgroundFormats = productFacts.paper.customBackgroundFormats.join(' or ');
const exportFormatNames = productFacts.exportFormats.map((format) => format.label).join(', ');
const randomnessControlNames = productFacts.realism.variations.map((variation) => variation.name.toLowerCase()).join(', ');
const draftStorageKey = productFacts.browserDraft.storageKey;

const directAnswer = `Text2Ink is a browser-based text to handwriting converter for turning typed or pasted text into handwriting-style notebook pages. Open the editor, choose from ${fontCount} built-in handwriting fonts or upload ${customFontFormats} fonts, pick paper style, page size, orientation, colors, margins, realism controls, and text boxes, then export the rendered pages as PDF, PNG, or JPG files. No account or payment is required.`;

const landingSections = [
  {
    id: 'what-text2ink-does',
    title: 'What Text2Ink does',
    body: [
      'Text2Ink is a browser editor for converting typed or pasted text into handwriting-style notebook pages. It renders text with handwriting fonts on the selected paper setup, so the result is a visual page preview rather than plain text in a document. You enter content, tune the handwriting and paper controls, preview the pages, and export the rendered output when it looks right.',
      'The editor route opens directly from the homepage and does not require an account or payment step. The controls cover handwriting font, font size, ink color, line height, paper style, page size, orientation, margins, page colors, text boxes, page navigation, and export. That keeps the workflow focused on making a notebook-style page rather than managing a document account.',
      'Because Text2Ink is focused on rendered pages, the important choices are visual and practical. A longer essay needs different spacing than a short note. A worksheet background may need text boxes instead of one continuous block. A document meant for printing may need a PDF, while a single preview for another app may be easier to handle as an image.',
    ],
  },
  {
    id: 'how-to-convert-text-to-handwriting-online',
    title: 'How to convert text to handwriting online',
    body: [
      'Start by opening the editor, then type or paste the text you want to render. Choose a handwriting font, adjust the font size, set the ink color, and pick the paper setup that matches the page you need. The preview updates from the editor state, so you can make changes before downloading anything.',
      'Next, tune the layout. Set the paper style, page size, orientation, margin values, line height, line tilt, line offset, and custom line spacing where those controls apply. If a custom page design is needed, upload a PNG or JPG background image and place the handwriting over it. Use page navigation to check each rendered page before export.',
      'When the document has text, open the export dialog and choose the format. Text2Ink exports from the current editor state, including the typed text, paper settings, handwriting controls, text boxes, and per-page changes. If the editor is empty, export stays disabled so blank downloads are avoided.',
      'Before exporting, use the preview as the final check. Confirm that line breaks land where expected, the handwriting stays inside the margins, the ink color has enough contrast against the paper, and page navigation shows the page count you expect. For multi-page text, inspect more than the first page because a small change in font size, line height, or paper format can move content to a later page.',
    ],
  },
  {
    id: 'handwriting-font-options',
    title: 'Handwriting font options',
    body: [
      `Text2Ink includes ${fontCount} built-in handwriting fonts. The font list covers casual handwriting, script-style writing, narrow letterforms, heavier marker-like forms, and lighter note-taking styles. The goal is to provide useful variation without making you leave the editor to hunt for a font before the first preview is visible.`,
      `If the built-in set is not the right fit, upload a custom ${customFontFormats} font file. The editor reads the font file in the browser, stores the selected custom font in the draft state when persistence runs, and renders the page with that font family. Font size, ink color, and line height remain separate controls, so you can keep the same font and still change density, readability, and page coverage.`,
      'Font choice should match the output goal. Larger, open handwriting styles are easier to read on a small mobile screenshot, while narrower styles can fit more words onto a page. If the preview feels crowded, reduce font size carefully or increase the page format instead of only tightening line height. If the page feels artificial, try a different font before adding stronger randomness.',
    ],
  },
  {
    id: 'notebook-paper-and-page-setup',
    title: 'Notebook paper and page setup',
    body: [
      `The editor includes ${paperStyleCount} paper styles: ${paperStyleNames}. Those styles can be combined with ${paperFormatNames} page sizes and ${paperOrientationNames} orientation. Paper setup also includes page-level controls such as paper color, text position, margins, upload-backed line tilt, line offset, and custom line spacing.`,
      `Paper color is separate from ink color. The current catalog includes ${paperColorNames}, which lets you keep blue or dark ink while changing the page background. For custom paper, the editor accepts ${backgroundFormats} background images. Uploaded backgrounds can be used for forms, worksheets, branded pages, or scanned paper textures, then removed from the editor when no longer needed.`,
      'Page setup affects both appearance and pagination. Letter, A4, and A3 do not hold the same amount of handwriting, and landscape pages change the line length. Lined and ruled paper are useful when handwriting should follow rows, grid and dot grid work better for structured notes, and Cornell paper gives the page a note-taking layout with separate areas. Margins and line offsets help align handwriting with those page structures.',
    ],
  },
  {
    id: 'realism-controls',
    title: 'Realism controls',
    body: [
      `The ${productFacts.realism.toggleLabel} setting controls whether Text2Ink applies handwriting variation while rendering text. When it is on, the renderer can vary ${randomnessControlNames}. Those changes are designed to make repeated letters and long lines feel less mechanically identical while still keeping the typed content readable.`,
      'Randomness applies to rendered handwriting text and movable text boxes. That matters because text boxes often hold labels, corrections, signatures, or callouts, and those should not look disconnected from the main handwriting. If a cleaner technical page is needed, turn randomness down or disable it and keep the page closer to aligned type.',
      'Use realism controls as finishing controls, not as a substitute for layout. A page usually looks better when font, margins, line height, and paper choice are close first. Then small spacing, baseline, and rotation variation can add natural irregularity. Strong variation can make dense documents harder to read, especially on mobile screenshots or small exported images.',
    ],
  },
  {
    id: 'text-boxes-and-page-control',
    title: 'Text boxes and page control',
    body: [
      'Text boxes give the page a second layer of handwriting control. You can add movable boxes on the active page, edit their text, resize their placement area, and delete them when they are not needed. They are useful for annotations, side notes, headings, form fields, labels, and content that should sit outside the main typed flow.',
      `Page settings can differ by page, and the editor also has an Apply to all pages action when one page setup should become the document-wide setup. Draft persistence uses browser local storage under ${draftStorageKey}, including typed text, handwriting settings, page settings, text boxes, uploaded font data, uploaded background images, preview scale, and current page position.`,
      'Per-page control is useful when a document is not visually uniform. A first page might need a title text box, later pages may need tighter margins, and an uploaded background may only apply to a specific page. Apply to all pages is for the opposite case: after one page looks correct, it lets you reuse that setup instead of manually repeating the same controls on every page.',
    ],
  },
  {
    id: 'export-options',
    title: 'Export options',
    body: [
      `Text2Ink exports ${exportFormatNames}. PDF Document is for multi-page document sharing or printing. PNG Image and JPG Image are for image-first workflows where a page preview needs to be inserted into another app, attached to a message, or archived as a rendered image.`,
      'Exports are generated from the editor state at the time you download. That includes the active text, selected font, custom font if present, paper setup, colors, margins, line settings, text boxes, and page-specific settings. The export button is disabled until there is text, matching the editor behavior that a handwritten page needs content before it can be downloaded.',
      'For longer documents, PDF is usually the most convenient because it keeps the pages together. PNG is useful when crisp page images are more important than file size, and JPG is useful when a smaller photo-style image is acceptable. Whichever format you choose, check the preview first because the export reflects the same page state rather than reinterpreting the text separately.',
    ],
  },
  {
    id: 'responsible-use-and-privacy',
    title: 'Responsible use and privacy',
    body: [
      'Text2Ink gives you control over the content you type or paste, but it does not decide whether that content is appropriate for a school, workplace, platform, or assignment rule. Before submitting or sharing an export, check that your use of handwriting-style output follows the rules that apply to your situation.',
      `Custom fonts and background images are read by browser file APIs, and saved drafts stay in browser storage under ${draftStorageKey}. Clearing site data or removing the saved editor state removes the stored draft from that browser profile. For questions, bugs, feature requests, or privacy concerns, use the Contact page linked in the header and footer.`,
      'If you use a shared computer or managed browser profile, treat browser storage as shared with anyone who can access that profile. Remove drafts you do not want kept there, especially when they include private text, uploaded custom fonts, or background images. Also inspect exports before sharing them because the downloaded file may include every visible page element from the editor preview.',
    ],
  },
] as const;

const homeFaqs = [
  {
    question: 'Can I use Text2Ink without signing in?',
    answer: 'Yes. The editor opens from the homepage without an account or payment step.',
  },
  {
    question: 'Where is my draft saved?',
    answer: `Saved editor drafts use browser local storage under ${draftStorageKey}. That draft can include text, handwriting settings, page settings, text boxes, uploaded font data, uploaded background images, preview scale, and page position.`,
  },
  {
    question: 'How do I remove saved Text2Ink data from my browser?',
    answer: 'Clear the site data for text2ink.com in your browser settings, or clear the saved editor state from the editor controls when that option is available.',
  },
  {
    question: 'What happens when I upload a custom font or background image?',
    answer: 'The browser reads the selected file and stores it in the editor state for rendering. Custom font uploads accept .ttf and .otf files, and custom background uploads accept PNG or JPG images.',
  },
  {
    question: 'Why is export disabled when there is no text?',
    answer: 'Export is disabled for empty documents because the export engine needs text content to render a useful handwriting page.',
  },
  {
    question: 'Can one document produce more than one exported page?',
    answer: 'Yes. The editor paginates longer text into multiple rendered pages, and the export flow uses the document pages from the current editor state.',
  },
  {
    question: 'Can I change one page without changing every page?',
    answer: 'Yes. The editor supports per-page settings, and the Apply to all pages action is available when the current page setup should be reused across the document.',
  },
  {
    question: 'Does Text2Ink review whether my content is allowed by school or workplace rules?',
    answer: 'No. You control the content and are responsible for checking whether handwritten-style output is permitted before submitting, posting, or sharing it.',
  },
  {
    question: 'What should I check before submitting or sharing an export?',
    answer: 'Check the rendered text, page count, paper setup, margins, text boxes, and export format. Also confirm that your use of the output follows the relevant assignment, workplace, or platform rules.',
  },
  {
    question: 'How can I report a bug or request a feature?',
    answer: 'Use the Contact page from the header or footer and include what happened, which browser you used, and the editor steps that led to the issue.',
  },
] as const;

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: canonicalUrl('/'),
  },
  openGraph: {
    type: 'website',
    url: canonicalUrl('/'),
    siteName: siteFacts.siteName,
    title: `${pageTitle} | ${siteFacts.siteName}`,
    description: pageDescription,
    images: [
      {
        url: siteFacts.previewImagePath,
        width: 618,
        height: 800,
        alt: siteFacts.previewImageAlt,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${pageTitle} | ${siteFacts.siteName}`,
    description: pageDescription,
    images: [siteFacts.previewImagePath],
  },
};

export default function HomePage() {
  preload('/fonts/FFCommaTrial-Regular.ttf', { as: 'font', crossOrigin: '' });

  const frameClasses = 'w-full px-public-gutter';

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={buildWebSiteJsonLd()} />
      <JsonLd data={buildOrganizationJsonLd()} />
      <JsonLd
        data={buildSoftwareApplicationJsonLd({
          url: canonicalUrl('/editor'),
          description: pageDescription,
          featureList: webApplicationFeatureList,
        })}
      />
      <JsonLd data={buildFaqPageJsonLd(homeFaqs)} />
      <JsonLd
        data={buildBreadcrumbListJsonLd([
          { name: 'Home', url: canonicalUrl('/') },
        ])}
      />

      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className={`${frameClasses} py-chrome-y`}>
          <SiteHeader
            cta={(
              <Button variant="brand" size="chrome" asChild>
                <Link href="/editor">
                  Open Editor
                </Link>
              </Button>
            )}
          />
        </div>
      </header>

      <main className="py-page-y flex flex-col items-center gap-section w-full">
        <div className={frameClasses}>
          <div className="text-center flex flex-col items-center gap-6 max-w-7xl mx-auto">
            <h1 className="text-6xl sm:text-7xl md:text-8xl font-normal tracking-tight leading-tight whitespace-normal lg:whitespace-nowrap text-amber-600 dark:text-amber-300 font-[family-name:var(--font-snake)]">
              Text to Handwriting Converter
            </h1>
            <p data-testid="home-direct-answer" className="text-body-lg text-muted-foreground max-w-3xl leading-8">
              {directAnswer}
            </p>
            <Button variant="brand" size="lg" className="mt-2 shadow-sm" asChild>
              <Link href="/editor">
                Open Editor
              </Link>
            </Button>
          </div>
        </div>

        <div className="w-full px-public-gutter grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mt-6 sm:mt-8 lg:mt-10">
          <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-border shadow-sm bg-card flex items-center justify-center">
                <picture className="w-full h-auto flex">
                  <source srcSet="/Sample-handwriting-preview1.avif" type="image/avif" media="(min-width: 640px)" />
                  <source srcSet="/Sample-handwriting-preview1-mobile.avif" type="image/avif" />
                  <img
                    src="/Sample-handwriting-preview1.png"
                    alt="Text2Ink handwritten page preview on lined notebook paper"
                    width={618}
                    height={800}
                    className="w-full h-auto object-cover"
                    loading="eager"
                    fetchPriority="high"
                  />
                </picture>
              </div>
              <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-border shadow-sm bg-card flex items-center justify-center">
                <picture className="w-full h-auto flex">
                  <source srcSet="/Sample-handwriting-preview2.avif" type="image/avif" media="(min-width: 640px)" />
                  <source srcSet="/Sample-handwriting-preview2-mobile.avif" type="image/avif" />
                  <img
                    src="/Sample-handwriting-preview2.png"
                    alt="Text2Ink handwritten page preview with blue ink and notebook lines"
                    width={618}
                    height={800}
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                </picture>
              </div>
            </div>

        <div className={`${frameClasses} mt-10 sm:mt-16 md:mt-24 flex gap-10`}>
          <HomeToc
            items={[
              ...landingSections.map((s) => ({ id: s.id, title: s.title })),
              { id: 'faq', title: 'FAQ' },
            ]}
          />

          <div className="min-w-0 flex-1">
            <div className="mx-auto max-w-3xl space-y-12 px-2 sm:px-6 md:px-10">
              {landingSections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-4">
                    {section.title}
                  </h2>
                  <div className="space-y-4">
                    {section.body.map((paragraph) => (
                      <p key={paragraph} className="text-body-lg leading-8 text-muted-foreground">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div id="faq" className="scroll-mt-24 mx-auto max-w-3xl px-2 sm:px-6 md:px-10 mt-16 sm:mt-20 md:mt-24">
              <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6 text-center">
                Text2Ink FAQ
              </h2>
              <div className="space-y-5">
                {homeFaqs.map((faq) => (
                  <div key={faq.question} className="border-b border-border pb-5 last:border-b-0">
                    <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
                    <p className="text-body leading-7 text-muted-foreground">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-background py-footer mt-section">
        <div className={frameClasses}>
          <SiteFooter />
        </div>
      </footer>
    </div>
  );
}
