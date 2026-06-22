import { canonicalUrl, siteFacts } from './productFacts';

export type BreadcrumbItem = {
  name: string;
  url: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

type JsonLdObject = Record<string, unknown>;

const withContext = (schema: JsonLdObject): JsonLdObject & { '@context': string } => ({
  '@context': 'https://schema.org',
  ...schema,
});

export const buildWebSiteJsonLd = () =>
  withContext({
    '@type': 'WebSite',
    name: siteFacts.siteName,
    url: canonicalUrl('/'),
  });

export const buildOrganizationJsonLd = () =>
  withContext({
    '@type': 'Organization',
    name: siteFacts.siteName,
    url: canonicalUrl('/'),
    logo: canonicalUrl(siteFacts.logoPath),
    email: siteFacts.contactEmail,
  });

export const buildSoftwareApplicationJsonLd = ({
  url,
  description,
  featureList,
  screenshot = canonicalUrl(siteFacts.previewImagePath),
}: {
  url: string;
  description: string;
  featureList: readonly string[];
  screenshot?: string;
}) =>
  withContext({
    '@type': 'WebApplication',
    name: siteFacts.siteName,
    description,
    url,
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [...featureList],
    screenshot,
  });

export const buildBreadcrumbListJsonLd = (items: readonly BreadcrumbItem[]) =>
  withContext({
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  });

export const buildFaqPageJsonLd = (faqs: readonly FaqItem[]) =>
  withContext({
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  });

export const buildContactPageJsonLd = ({
  url,
  description,
}: {
  url: string;
  description: string;
}) =>
  withContext({
    '@type': 'ContactPage',
    name: 'Contact Text2Ink',
    description,
    url,
    email: siteFacts.contactEmail,
    about: {
      '@type': 'Organization',
      name: siteFacts.siteName,
      url: canonicalUrl('/'),
    },
  });
