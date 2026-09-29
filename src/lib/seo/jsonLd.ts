import { canonicalUrl, siteFacts } from './productFacts';

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
}) => ({
  '@context': 'https://schema.org',
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
