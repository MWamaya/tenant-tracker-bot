import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { ROUTES } from '@/lib/routes';

interface SuperAdminMobileTopBarProps {
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export const SuperAdminMobileTopBar = ({ title, showBackButton, onBack }: SuperAdminMobileTopBarProps) => {
  const navigate = useNavigate();

  return (
    <div className="lg:hidden sticky top-0 z-40 bg-[#0F172A] border-b border-white/10">
      <div className="flex h-14 items-center gap-3 px-4">
        {showBackButton ? (
          <button
            type="button"
            onClick={() => (onBack ? onBack() : navigate(-1))}
            className="text-white -ml-1 p-1"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate(ROUTES.SUPER_ADMIN_ROOT)}
            className="flex items-center gap-2"
          >
            <Shield className="h-6 w-6 text-[#2DD4BF]" />
          </button>
        )}
        <span className="text-base font-semibold text-white truncate">{title}</span>
      </div>
    </div>
  );
};
