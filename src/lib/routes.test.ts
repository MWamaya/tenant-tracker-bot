import { describe, it, expect } from 'vitest';
import { ROUTES } from './routes';

describe('ROUTES', () => {
  it('puts the public landing page at the bare root', () => {
    expect(ROUTES.LANDING).toBe('/');
  });

  it('prefixes every landlord and super-admin path with /app', () => {
    const { LANDING, ...rest } = ROUTES;
    for (const [key, value] of Object.entries(rest)) {
      expect(value.startsWith('/app')).toBe(true);
    }
  });

  it('has the exact expected value for every route', () => {
    expect(ROUTES).toEqual({
      LANDING: '/',
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
    });
  });
});
