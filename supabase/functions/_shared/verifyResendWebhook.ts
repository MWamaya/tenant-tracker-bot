import { Webhook } from 'https://esm.sh/svix@1.24.0';

export async function verifyResendWebhook(
  rawBody: string,
  headers: Headers,
  secret: string,
): Promise<boolean> {
  const svixId = headers.get('svix-id');
  const svixTimestamp = headers.get('svix-timestamp');
  const svixSignature = headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return false;
  }

  try {
    const wh = new Webhook(secret);
    wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
    return true;
  } catch {
    return false;
  }
}
