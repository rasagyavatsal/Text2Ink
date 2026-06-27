import LegalPage from '@/components/patterns/LegalPage';
import { termsOfServiceContent } from '@/lib/legalContent';
import { buildLegalMetadata } from '@/lib/seo/pageMetadata';

export const metadata = buildLegalMetadata(termsOfServiceContent);

export default function TermsOfServicePage() {
  return <LegalPage {...termsOfServiceContent} />;
}
