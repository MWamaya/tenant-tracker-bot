import { Sidebar } from './Sidebar';
import { MobileTopBar } from './MobileTopBar';
import { MobileTabBar } from './MobileTabBar';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';
import { PageSeo } from '@/components/seo/PageSeo';

interface MainLayoutProps {
  children: React.ReactNode;
  seo?: {
    title: string;
    description: string;
    path: string;
  };
  mobileTitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export const MainLayout = ({ children, seo, mobileTitle, showBackButton, onBack }: MainLayoutProps) => {
  const title = mobileTitle ?? seo?.title?.split(' — ')[0] ?? seo?.title ?? 'KODI PAP';

  return (
    <div className="min-h-screen bg-background">
      {seo ? (
        <PageSeo title={seo.title} description={seo.description} path={seo.path} noindex />
      ) : null}
      <ImpersonationBanner />
      <Sidebar />
      <MobileTopBar title={title} showBackButton={showBackButton} onBack={onBack} />
      <main className="lg:pl-64 pt-14 lg:pt-0 pb-20 lg:pb-0">
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
      <MobileTabBar />
    </div>
  );
};
