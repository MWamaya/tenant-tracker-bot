import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import kodiPapLogo from '@/assets/kodi-pap-logo.png';
import { ROUTES } from '@/lib/routes';

interface MobileTopBarProps {
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export const MobileTopBar = ({ title, showBackButton, onBack }: MobileTopBarProps) => {
  const navigate = useNavigate();

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-sidebar border-b border-sidebar-border">
      <div className="flex h-14 items-center gap-3 px-4">
        {showBackButton ? (
          <button
            type="button"
            onClick={() => (onBack ? onBack() : navigate(-1))}
            className="text-sidebar-foreground -ml-1 p-1"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="flex items-center"
          >
            <img src={kodiPapLogo} alt="Kodi Pap Logo" className="h-8 w-auto" />
          </button>
        )}
        <span className="text-base font-semibold text-sidebar-foreground truncate">
          {title}
        </span>
      </div>
    </div>
  );
};
