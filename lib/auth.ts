import { scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const HASH_BYTES = 32;

function parsePasswordHash(value: string | undefined) {
  if (!value) return null;

  const [algorithm, cost, blockSize, parallelization, saltText, hashText, extra] =
    value.split(':');
  if (
    algorithm !== 'scrypt' ||
    cost !== String(SCRYPT_COST) ||
    blockSize !== String(SCRYPT_BLOCK_SIZE) ||
    parallelization !== String(SCRYPT_PARALLELIZATION) ||
    !saltText ||
    !hashText ||
    extra !== undefined
  ) {
    return null;
  }

  try {
    const salt = Buffer.from(saltText, 'base64url');
    const hash = Buffer.from(hashText, 'base64url');
    if (salt.length !== 16 || hash.length !== HASH_BYTES) return null;
    return { salt, hash };
  } catch {
    return null;
  }
}

export function isAdminAuthConfigured(): boolean {
  const username = process.env.AUTH_USERNAME?.trim();
  const secret = process.env.AUTH_SECRET;
  return Boolean(
    username &&
      secret &&
      Buffer.byteLength(secret, 'utf8') >= 32 &&
      parsePasswordHash(process.env.AUTH_PASSWORD_HASH)
  );
}

export async function verifyAdminCredentials(
  username: string,
  pin: string
): Promise<boolean> {
  const configuredUsername = process.env.AUTH_USERNAME?.trim();
  const passwordHash = parsePasswordHash(process.env.AUTH_PASSWORD_HASH);
  if (!configuredUsername || !passwordHash) return false;

  const derivedHash = await new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(
      pin,
      passwordHash.salt,
      HASH_BYTES,
      {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
        maxmem: 64 * 1024 * 1024,
      },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey as Buffer);
      }
    );
  });

  return (
    timingSafeEqual(derivedHash, passwordHash.hash) &&
    username.trim() === configuredUsername
  );
}
