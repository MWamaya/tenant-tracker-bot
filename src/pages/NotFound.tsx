import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { PageSeo } from "@/components/seo/PageSeo";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import kodiPapLogo from "@/assets/kodi-pap-logo.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <PageSeo
        title="Page not found — KODI PAP"
        description="The page you were looking for doesn't exist."
        path="/404"
        noindex
      />
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link to={ROUTES.LANDING} className="mb-10">
        <img src={kodiPapLogo} alt="KODI PAP" className="h-8 w-auto" />
      </Link>
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-wider text-primary">404</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          This page doesn't exist
        </h1>
        <p className="mt-3 text-muted-foreground">
          The page you're looking for may have moved or never existed.
        </p>
        <Button asChild size="lg" className="mt-7 gap-2">
          <Link to={ROUTES.LANDING}>
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </Button>
      </div>
    </main>
    </>
  );
};

export default NotFound;
