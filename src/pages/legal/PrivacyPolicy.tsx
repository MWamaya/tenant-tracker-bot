import { LegalLayout, type LegalSection } from '@/components/legal/LegalLayout';
import { ROUTES } from '@/lib/routes';

const SECTIONS: LegalSection[] = [
  {
    heading: '1. Who we are',
    paragraphs: [
      'KODI PAP is a rental-management platform for landlords and property managers in Kenya. For privacy questions, contact <strong>[privacy email]</strong>.',
    ],
  },
  {
    heading: '2. Information we collect',
    paragraphs: [
      'Depending on how you use KODI PAP, we may collect account and contact information, property and unit information, tenant information, payment and transaction records, support communications, and technical information such as device, browser and log data.',
    ],
  },
  {
    heading: '3. How we use information',
    paragraphs: [
      'We use information to provide and secure the service, manage properties and tenants, match and record payments, generate statements and reports, send service communications and reminders, provide support, prevent fraud or misuse, comply with legal obligations, and improve the service.',
    ],
  },
  {
    heading: '4. Sharing',
    paragraphs: [
      'We may use service providers that process information on our behalf, such as hosting, messaging, payment or analytics providers. We do not sell personal information. We disclose information where necessary to provide the service, comply with law, protect rights and safety, or with your direction.',
    ],
  },
  {
    heading: '5. Retention',
    paragraphs: [
      'We retain personal information only for as long as reasonably necessary for the purposes described above, contractual requirements, legal obligations, dispute resolution and legitimate business needs. Specific retention periods should be documented in KODI PAP’s internal retention schedule.',
    ],
  },
  {
    heading: '6. Security',
    paragraphs: [
      'We use reasonable technical and organisational safeguards appropriate to the information we process. Access should be limited to authorised users and personnel who need it for their role.',
    ],
  },
  {
    heading: '7. Your rights',
    paragraphs: [
      'Subject to applicable law, data subjects may have rights including being informed about processing, accessing personal information, correcting inaccurate information, objecting to certain processing, requesting deletion where applicable, and other rights provided by Kenyan data-protection law.',
    ],
  },
  {
    heading: '8. International transfers',
    paragraphs: [
      'If information is processed outside Kenya or by an overseas service provider, KODI PAP will apply the safeguards required by applicable data-protection law and its contractual arrangements.',
    ],
  },
  {
    heading: '9. Cookies',
    paragraphs: [
      `See our <a href="${ROUTES.COOKIE_POLICY}" class="underline hover:no-underline">Cookie Policy</a> for information about cookies and similar technologies.`,
    ],
  },
  {
    heading: '10. Complaints and contact',
    paragraphs: [
      'Contact us first at <strong>[privacy email]</strong>. You may also have the right to complain to the Office of the Data Protection Commissioner (ODPC) in Kenya.',
    ],
  },
  {
    heading: '11. Changes',
    paragraphs: [
      'We may update this policy when our practices or legal obligations change. The current version will be posted on this page.',
    ],
  },
];

const PrivacyPolicy = () => (
  <LegalLayout
    title="Privacy Policy"
    description="How KODI PAP collects, uses and protects your information."
    path={ROUTES.PRIVACY_POLICY}
    lastUpdated="5 October 2026"
    notice="replace the bracketed fields with KODI PAP's legal entity name, address, privacy contact and actual data practices."
    sections={SECTIONS}
  />
);

export default PrivacyPolicy;
