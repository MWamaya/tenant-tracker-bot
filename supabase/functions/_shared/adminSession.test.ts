import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { sessionIdFromVerifiedRequest } from './adminSession.ts';

const userId = '00000000-0000-0000-0000-000000000001';
const sessionId = '10000000-0000-0000-0000-000000000001';
const request = (claims: unknown) => new Request('http://localhost', {
  headers: { Authorization: `Bearer header.${btoa(JSON.stringify(claims))}.signature` },
});
Deno.test('session extraction binds verified user to a valid session ID', () => {
  assertEquals(sessionIdFromVerifiedRequest(request({ sub: userId, session_id: sessionId }), userId), sessionId);
  assertEquals(sessionIdFromVerifiedRequest(request({ sub: 'someone-else', session_id: sessionId }), userId), null);
  assertEquals(sessionIdFromVerifiedRequest(request({ sub: userId }), userId), null);
  assertEquals(sessionIdFromVerifiedRequest(request({ sub: userId, session_id: 'invalid' }), userId), null);
  assertEquals(sessionIdFromVerifiedRequest(new Request('http://localhost'), userId), null);
});
