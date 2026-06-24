import type { Metadata } from 'next';
import { canonicalUrl, siteFacts } from './productFacts';

type PageMetadataInput = {
  readonly path: string;
  readonly title: string;
  readonly description: string;
};


const buildSharedMetadata = ({ path, title, description }: PageMetadataInput) => {
  const canonical = canonicalUrl(path);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: 'website' as const,
      url: canonical,
      siteName: siteFacts.siteName,
      title,
      description,
    },
  };
};

const buildTwitterMetadata = (
  { title, description }: PageMetadataInput,
  card: 'summary' | 'summary_large_image'
) => ({
  card,
  title,
  description,
});


export const buildLegalMetadata = ({
  path,
  title,
  description,
}: PageMetadataInput): Metadata => {
  return {
    ...buildSharedMetadata({ path, title, description }),
    twitter: buildTwitterMetadata({ path, title, description }, 'summary'),
  };
};
