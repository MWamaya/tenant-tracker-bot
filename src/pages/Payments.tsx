import { MainLayout } from '@/components/layout/MainLayout';
import { AppBreadcrumbs } from '@/components/navigation/AppBreadcrumbs';
import { PaymentsContent } from '@/components/payments/PaymentsContent';

const Payments = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <AppBreadcrumbs />
        <PaymentsContent />
      </div>
    </MainLayout>
  );
};

export default Payments;
