import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://tenant-tracker-bot.lovable.app';

interface PageSeoProps {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}

/**
 * Per-route SEO head tags. Sets a unique title, description, canonical and
 * og:* per page, overriding the sitewide defaults in index.html.
 */
export const PageSeo = ({ title, description, path, noindex }: PageSeoProps) => {
  const url = `${SITE_URL}${path}`;
  const image = `${SITE_URL}/kodi-pap-logo.png`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={image} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
    </Helmet>
  );
};
