import { LegalLayout, type LegalSection } from '@/components/legal/LegalLayout';
import { ROUTES } from '@/lib/routes';

const SECTIONS: LegalSection[] = [
  {
    heading: '1. Cancellation',
    paragraphs: [
      'You may cancel your subscription at any time by contacting support at <strong>support@kodipap.com</strong>. Cancellation stops future renewals; it does not refund the current billing period already paid for.',
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
      'Payment is made manually via M-Pesa before your account is activated, so refunds are limited to clear payment errors: a duplicate payment, an amount sent in excess of the selected plan\'s price, or a payment for which your account was not activated within 48 hours. Report these to <strong>support@kodipap.com</strong> with your M-Pesa transaction code within 7 days of payment; approved refunds are sent back to the originating M-Pesa number within 5 business days. Subscription fees are otherwise non-refundable once your account has been activated for the billing period paid.',
    ],
  },
  {
    heading: '4. Failed payments',
    paragraphs: [
      'If we cannot confirm your M-Pesa payment against your account, your account will remain inactive (or will not renew) until payment is confirmed. We do not auto-debit or auto-retry charges — you control when payment is sent. Contact <strong>support@kodipap.com</strong> with your M-Pesa transaction code if a payment you sent was not reflected on your account.',
    ],
  },
  {
    heading: '5. Contact',
    paragraphs: ['support@kodipap.com<br/>Nairobi, Kenya'],
  },
];

const RefundCancellation = () => (
  <LegalLayout
    title="Refund & Cancellation Policy"
    description="How subscription cancellations and refunds work on KODI PAP."
    path={ROUTES.REFUND_CANCELLATION}
    lastUpdated="5 October 2026"
    sections={SECTIONS}
  />
);

export default RefundCancellation;
