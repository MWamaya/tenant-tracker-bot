import { LegalLayout, type LegalSection } from '@/components/legal/LegalLayout';
import { ROUTES } from '@/lib/routes';

const SECTIONS: LegalSection[] = [
  {
    heading: 'General support',
    paragraphs: ['[support email]'],
  },
  {
    heading: 'Privacy & data requests',
    paragraphs: ['[privacy email]'],
  },
  {
    heading: 'Business address',
    paragraphs: ['[legal/business address]'],
  },
  {
    heading: 'Payment disputes & account security',
    paragraphs: [
      'Include your account email and relevant transaction reference where appropriate. Do not send passwords or full payment credentials.',
    ],
  },
];

const Contact = () => (
  <LegalLayout
    title="Contact & Support"
    description="Get help with your KODI PAP account, payments or subscription."
    path={ROUTES.CONTACT}
    lastUpdated="5 October 2026"
    sections={SECTIONS}
  />
);

export default Contact;
