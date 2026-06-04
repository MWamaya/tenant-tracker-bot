import { MainLayout } from '@/components/layout/MainLayout';
import { AppBreadcrumbs } from '@/components/navigation/AppBreadcrumbs';
import { PaymentsContent } from '@/components/payments/PaymentsContent';

const Payments = () => {
  return (
    <MainLayout seo={{ title: "Payments \u2014 KODI PAP", description: "Recorded rent payments from M-Pesa and bank channels.", path: "/payments" }}>
      <div className="space-y-6">
        <AppBreadcrumbs />
        <PaymentsContent />
      </div>
    </MainLayout>
  );
};

export default Payments;
