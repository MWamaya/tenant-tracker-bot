import { Sidebar } from './Sidebar';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';
import { PageSeo } from '@/components/seo/PageSeo';

interface MainLayoutProps {
  children: React.ReactNode;
  seo?: {
    title: string;
    description: string;
    path: string;
  };
}

export const MainLayout = ({ children, seo }: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {seo ? (
        <PageSeo title={seo.title} description={seo.description} path={seo.path} noindex />
      ) : null}
      <ImpersonationBanner />
      <Sidebar />
      <main className="lg:pl-64 pt-14 lg:pt-0">
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
