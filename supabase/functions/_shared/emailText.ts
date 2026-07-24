export function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractForwardedFrom(text: string): string | null {
  const forwardedIndex = text.search(/-{5,}\s*Forwarded message\s*-{5,}/i);
  if (forwardedIndex < 0) return null;

  const searchArea = text.slice(forwardedIndex);
  const fromLineMatch = searchArea.match(/From:\s*.*?<?([\w.+-]+@[\w-]+\.[\w.-]+)>?/i);
  return fromLineMatch ? fromLineMatch[1].toLowerCase() : null;
}
