/** Read only after auth.getUser() has verified this request's JWT.
 * Decoding here does not authenticate a request; it binds an already
 * verified identity to the session represented by that same token. */
export function sessionIdFromVerifiedRequest(req: Request, verifiedUserId: string): string | null {
  try {
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const claims = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const sessionId = claims.session_id;
    return claims.sub === verifiedUserId && typeof sessionId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)
      ? sessionId : null;
  } catch {
    return null;
  }
}
