import { LegalLayout, type LegalSection } from '@/components/legal/LegalLayout';
import { ROUTES } from '@/lib/routes';

const SECTIONS: LegalSection[] = [
  {
    heading: '1. What cookies are',
    paragraphs: [
      'Cookies and similar technologies are small files or identifiers used to remember preferences, maintain sessions, understand usage and support security.',
    ],
  },
  {
    heading: '2. How KODI PAP uses them',
    paragraphs: [
      'We may use strictly necessary cookies for authentication, security and core functionality. If analytics or marketing cookies are introduced, this policy should be updated to identify the providers, purposes, retention and choices available to users.',
    ],
  },
  {
    heading: '3. Your choices',
    paragraphs: [
      'You can manage cookies through your browser settings. Blocking essential cookies may prevent parts of KODI PAP from working correctly.',
    ],
  },
  {
    heading: '4. Changes',
    paragraphs: ['We may update this policy when our use of cookies changes.'],
  },
  {
    heading: '5. Contact',
    paragraphs: ['[privacy email]'],
  },
];

const CookiePolicy = () => (
  <LegalLayout
    title="Cookie Policy"
    description="How KODI PAP uses cookies and similar technologies."
    path={ROUTES.COOKIE_POLICY}
    lastUpdated="5 October 2026"
    sections={SECTIONS}
  />
);

export default CookiePolicy;
