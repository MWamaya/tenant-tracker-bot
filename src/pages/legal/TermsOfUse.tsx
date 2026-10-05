import { LegalLayout, type LegalSection } from '@/components/legal/LegalLayout';
import { ROUTES } from '@/lib/routes';

const SECTIONS: LegalSection[] = [
  {
    heading: '1. Acceptance',
    paragraphs: [
      'These Terms govern your access to and use of KODI PAP. By creating an account or using the service, you agree to these Terms.',
    ],
  },
  {
    heading: '2. The service',
    paragraphs: [
      'KODI PAP provides software for managing rental properties, tenants, payment records, statements, reminders and reporting. Features may vary by subscription plan.',
    ],
  },
  {
    heading: '3. Accounts',
    paragraphs: [
      'You are responsible for providing accurate information, maintaining account credentials securely, and activity performed through your account. Notify KODI PAP promptly of suspected unauthorised access.',
    ],
  },
  {
    heading: '4. Payments and subscriptions',
    paragraphs: [
      'Subscription fees, billing periods, included limits and payment methods are shown at checkout or in the applicable plan. Taxes, payment-provider fees and other charges should be disclosed where applicable.',
    ],
  },
  {
    heading: '5. Acceptable use',
    paragraphs: [
      'You must not misuse the service, attempt unauthorised access, interfere with the platform, upload unlawful content, or use KODI PAP to violate another person’s rights or applicable law.',
    ],
  },
  {
    heading: '6. Your data',
    paragraphs: [
      `You retain rights in information you submit to KODI PAP. You authorise KODI PAP to process that information as necessary to provide the service, subject to the <a href="${ROUTES.PRIVACY_POLICY}" class="underline hover:no-underline">Privacy Policy</a> and applicable data-protection law.`,
    ],
  },
  {
    heading: '7. Payment records and automation',
    paragraphs: [
      'Automated matching and reports are provided to assist your rental administration. You remain responsible for reviewing records and resolving discrepancies before relying on them for financial, legal or accounting decisions.',
    ],
  },
  {
    heading: '8. Intellectual property',
    paragraphs: [
      'KODI PAP and its software, branding and materials are protected by applicable intellectual-property laws. You receive a limited right to use the service while your account is active.',
    ],
  },
  {
    heading: '9. Availability',
    paragraphs: [
      'We aim to provide a reliable service but do not guarantee uninterrupted availability. Planned maintenance, third-party outages and events outside our reasonable control may affect availability.',
    ],
  },
  {
    heading: '10. Termination',
    paragraphs: [
      'Accounts may be suspended or terminated for material breach, misuse, non-payment or other circumstances permitted by the applicable agreement. Any customer termination and refund rights should follow the applicable cancellation policy.',
    ],
  },
  {
    heading: '11. Liability',
    paragraphs: [
      'To the extent permitted by law, the agreement should define appropriate limits on liability and exclusions for indirect or consequential losses. These provisions should be reviewed by qualified counsel before publication.',
    ],
  },
  {
    heading: '12. Governing law',
    paragraphs: [
      'These Terms should identify the applicable governing law and dispute-resolution process for KODI PAP. <strong>[Confirm Kenyan governing law and dispute forum with counsel.]</strong>',
    ],
  },
  {
    heading: '13. Contact',
    paragraphs: ['<strong>[Legal entity name]</strong><br/>[Business address]<br/>[support email]'],
  },
];

const TermsOfUse = () => (
  <LegalLayout
    title="Terms of Use"
    description="The terms that govern your use of KODI PAP."
    path={ROUTES.TERMS_OF_USE}
    lastUpdated="5 October 2026"
    notice="have these terms reviewed for KODI PAP's actual company structure, pricing, payment flows and applicable Kenyan law."
    sections={SECTIONS}
  />
);

export default TermsOfUse;
