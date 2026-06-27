import LegalPage from '@/components/patterns/LegalPage';
import { privacyPolicyContent } from '@/lib/legalContent';
import { buildLegalMetadata } from '@/lib/seo/pageMetadata';

export const metadata = buildLegalMetadata(privacyPolicyContent);

export default function PrivacyPolicyPage() {
  return <LegalPage {...privacyPolicyContent} />;
}
