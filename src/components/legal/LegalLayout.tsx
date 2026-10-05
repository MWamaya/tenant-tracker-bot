import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/lib/routes';
import { PageSeo } from '@/components/seo/PageSeo';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

interface LegalLayoutProps {
  title: string;
  description: string;
  path: string;
  lastUpdated: string;
  notice?: string;
  sections: LegalSection[];
}

/** Shared chrome for the legal/support pages (privacy, terms, cookies, refunds, contact). */
export const LegalLayout = ({ title, description, path, lastUpdated, notice, sections }: LegalLayoutProps) => (
  <>
    <PageSeo title={`${title} — KODI PAP`} description={description} path={path} noindex />
    <div className="min-h-screen px-4 sm:px-8 py-12 sm:py-16">
      <div className="max-w-2xl mx-auto">
        <Link
          to={ROUTES.LANDING}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> KODI PAP
        </Link>

        <h1 className="mt-6 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>

        {notice && (
          <div className="mt-6 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
            <strong>Before publishing:</strong> {notice}
          </div>
        )}

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-semibold text-foreground">{section.heading}</h2>
              {section.paragraphs.map((p, i) => (
                <p
                  key={i}
                  className="mt-2 text-sm leading-relaxed text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: p }}
                />
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  </>
);
