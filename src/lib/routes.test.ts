import { describe, it, expect } from 'vitest';
import { ROUTES } from './routes';

describe('ROUTES', () => {
  it('puts the public landing page at the bare root', () => {
    expect(ROUTES.LANDING).toBe('/');
  });

  it('prefixes every landlord and super-admin path with /app', () => {
    // Public marketing/legal/lead-intake pages live at the bare root, not
    // under the authenticated /app shell — exclude them from this check.
    const PUBLIC_ROUTE_KEYS = new Set([
      'LANDING',
      'PRIVACY_POLICY',
      'TERMS_OF_USE',
      'COOKIE_POLICY',
      'REFUND_CANCELLATION',
      'CONTACT',
      'GET_STARTED',
    ]);
    for (const [key, value] of Object.entries(ROUTES)) {
      if (PUBLIC_ROUTE_KEYS.has(key)) continue;
      expect(value.startsWith('/app')).toBe(true);
    }
  });

  it('has the exact expected value for every route', () => {
    expect(ROUTES).toEqual({
      LANDING: '/',
      PRIVACY_POLICY: '/privacy-policy',
      TERMS_OF_USE: '/terms-of-use',
      COOKIE_POLICY: '/cookie-policy',
      REFUND_CANCELLATION: '/refund-cancellation',
      CONTACT: '/contact',
      GET_STARTED: '/get-started',
      DASHBOARD: '/app',
      AUTH: '/app/auth',
      RESET_PASSWORD: '/app/reset-password',
      SUBSCRIBE: '/app/subscribe',
      PROPERTIES: '/app/properties',
      PROPERTY: '/app/property',
      HOUSES: '/app/houses',
      TENANTS: '/app/tenants',
      PAYMENTS: '/app/payments',
      REPORTS: '/app/reports',
      EMAIL_LOGS: '/app/email-logs',
      RECONCILIATION: '/app/reconciliation',
      SETTINGS: '/app/settings',
      SUPER_ADMIN_ROOT: '/app/super-admin',
      SUPER_ADMIN_LOGIN: '/app/super-admin/login',
      SUPER_ADMIN_LANDLORDS: '/app/super-admin/landlords',
      SUPER_ADMIN_SUBSCRIPTIONS: '/app/super-admin/subscriptions',
      SUPER_ADMIN_PAYMENTS: '/app/super-admin/payments',
      SUPER_ADMIN_AUDIT_LOGS: '/app/super-admin/audit-logs',
      SUPER_ADMIN_SETTINGS: '/app/super-admin/settings',
      SUPER_ADMIN_PROPERTIES: '/app/super-admin/properties',
      SUPER_ADMIN_ONBOARDING_REQUESTS: '/app/super-admin/onboarding-requests',
    });
  });
});
