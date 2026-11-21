const SESSION_COOKIE_NAME = 'ash_admin_session';
const SESSION_DURATION_SECONDS = 8 * 60 * 60;
const REMEMBERED_SESSION_DURATION_SECONDS = 14 * 24 * 60 * 60;
const MAX_SESSION_DURATION_SECONDS = REMEMBERED_SESSION_DURATION_SECONDS;

export type AdminSession = {
  username: string;
  expiresAt: number;
};

function getSigningKey(): Promise<CryptoKey> | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret || new TextEncoder().encode(secret).length < 32) return null;

  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;

  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

export async function createSessionToken(
  username: string,
  rememberMe: boolean
): Promise<{ token: string; maxAge: number }> {
  const keyPromise = getSigningKey();
  if (!keyPromise) throw new Error('Authentication signing secret is not configured.');

  const maxAge = rememberMe
    ? REMEMBERED_SESSION_DURATION_SECONDS
    : SESSION_DURATION_SECONDS;
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = toBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        version: 1,
        sub: username,
        iat: issuedAt,
        exp: issuedAt + maxAge,
      })
    )
  );
  const key = await keyPromise;
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload)
  );

  return { token: `${payload}.${toBase64Url(new Uint8Array(signature))}`, maxAge };
}

export async function verifySessionToken(token: string): Promise<AdminSession | null> {
  if (token.length > 2048) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return null;

  const keyPromise = getSigningKey();
  if (!keyPromise) return null;

  const signatureBytes = fromBase64Url(signature);
  if (!signatureBytes || signatureBytes.length !== 32) return null;

  try {
    const key = await keyPromise;
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      new TextEncoder().encode(payload)
    );
    if (!valid) return null;

    const payloadBytes = fromBase64Url(payload);
    if (!payloadBytes) return null;

    const session = JSON.parse(new TextDecoder().decode(payloadBytes));
    const expectedUsername = process.env.AUTH_USERNAME?.trim();
    const now = Math.floor(Date.now() / 1000);

    if (
      session.version !== 1 ||
      typeof expectedUsername !== 'string' ||
      !expectedUsername ||
      session.sub !== expectedUsername ||
      !Number.isSafeInteger(session.iat) ||
      !Number.isSafeInteger(session.exp) ||
      session.iat > now + 60 ||
      session.exp <= now ||
      session.exp - session.iat > MAX_SESSION_DURATION_SECONDS
    ) {
      return null;
    }

    return { username: session.sub, expiresAt: session.exp };
  } catch {
    return null;
  }
}

export const adminSessionCookie = SESSION_COOKIE_NAME;
