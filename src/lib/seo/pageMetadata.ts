import type { Metadata } from 'next';
import { canonicalUrl, siteFacts } from './productFacts';

type PageMetadataInput = {
  readonly path: string;
  readonly title: string;
  readonly description: string;
};

const previewImage = {
  url: siteFacts.previewImagePath,
  width: 618,
  height: 800,
  alt: siteFacts.previewImageAlt,
} as const;

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

export const buildFeatureMetadata = ({
  path,
  title,
  description,
}: PageMetadataInput): Metadata => {
  const input = { path, title, description };
  const sharedMetadata = buildSharedMetadata(input);

  return {
    ...sharedMetadata,
    openGraph: {
      ...sharedMetadata.openGraph,
      images: [previewImage],
    },
    twitter: {
      ...buildTwitterMetadata(input, 'summary_large_image'),
      images: [siteFacts.previewImagePath],
    },
  };
};

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
