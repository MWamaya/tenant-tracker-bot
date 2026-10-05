import { LegalLayout, type LegalSection } from '@/components/legal/LegalLayout';
import { ROUTES } from '@/lib/routes';

const SECTIONS: LegalSection[] = [
  {
    heading: '1. Cancellation',
    paragraphs: [
      'You may cancel your subscription using the cancellation method provided in your account or by contacting support at <strong>[support email]</strong>.',
    ],
  },
  {
    heading: '2. Renewals',
    paragraphs: [
      'Unless otherwise stated at checkout, paid subscriptions renew according to the selected billing period until cancelled.',
    ],
  },
  {
    heading: '3. Refunds',
    paragraphs: [
      '[Insert the actual KODI PAP refund rules, including any trial-period, duplicate-charge, failed-service or statutory refund rights.]',
    ],
  },
  {
    heading: '4. Failed payments',
    paragraphs: [
      '[Insert how failed or reversed payments are handled, including any grace period or account restrictions.]',
    ],
  },
  {
    heading: '5. Contact',
    paragraphs: ['[support email]<br/>[business address]'],
  },
];

const RefundCancellation = () => (
  <LegalLayout
    title="Refund & Cancellation Policy"
    description="How subscription cancellations and refunds work on KODI PAP."
    path={ROUTES.REFUND_CANCELLATION}
    lastUpdated="5 October 2026"
    notice="confirm the actual trial, renewal, cancellation and refund rules used by KODI PAP."
    sections={SECTIONS}
  />
);

export default RefundCancellation;
