import { describe, expect, it } from 'vitest';
import {
  buildBreadcrumbListJsonLd,
  buildContactPageJsonLd,
  buildFaqPageJsonLd,
  buildOrganizationJsonLd,
  buildSoftwareApplicationJsonLd,
  buildWebSiteJsonLd,
} from '../jsonLd';
import { siteFacts } from '../productFacts';

describe('JSON-LD helpers', () => {
  it('builds WebSite and Organization schema from site facts', () => {
    expect(buildWebSiteJsonLd()).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteFacts.siteName,
      url: `${siteFacts.canonicalBaseUrl}/`,
    });

    expect(buildOrganizationJsonLd()).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: siteFacts.siteName,
      url: `${siteFacts.canonicalBaseUrl}/`,
      email: siteFacts.contactEmail,
    });
  });

  it('builds a WebApplication schema without unsupported ratings', () => {
    const schema = buildSoftwareApplicationJsonLd({
      url: 'https://text2ink.com/editor',
      description: 'Use Text2Ink controls to create handwriting-style pages.',
      featureList: ['Built-in handwriting fonts', 'PDF, PNG, and JPG exports'],
    });

    expect(schema).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: siteFacts.siteName,
      url: 'https://text2ink.com/editor',
      applicationCategory: 'UtilityApplication',
      operatingSystem: 'Any',
    });
    expect(schema.featureList).toEqual(['Built-in handwriting fonts', 'PDF, PNG, and JPG exports']);
    expect(schema).not.toHaveProperty('aggregateRating');
    expect(schema).not.toHaveProperty('review');
  });

  it('builds BreadcrumbList and FAQPage schema from visible page content', () => {
    expect(buildBreadcrumbListJsonLd([
      { name: 'Home', url: 'https://text2ink.com/' },
      { name: 'Feature', url: 'https://text2ink.com/features/example' },
    ])).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://text2ink.com/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Feature',
          item: 'https://text2ink.com/features/example',
        },
      ],
    });

    expect(buildFaqPageJsonLd([
      {
        question: 'What can Text2Ink export?',
        answer: 'Text2Ink exports PDF, PNG, and JPG files.',
      },
    ])).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What can Text2Ink export?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Text2Ink exports PDF, PNG, and JPG files.',
          },
        },
      ],
    });
  });

  it('builds ContactPage schema for the visible contact route', () => {
    expect(buildContactPageJsonLd({
      url: 'https://text2ink.com/contact',
      description: 'Send Text2Ink a question, bug report, or feature request.',
    })).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contact Text2Ink',
      url: 'https://text2ink.com/contact',
      email: siteFacts.contactEmail,
    });
  });
});
