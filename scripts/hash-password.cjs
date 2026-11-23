const { randomBytes, scryptSync } = require('node:crypto');

const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const KEY_LENGTH = 32;

if (!process.stdin.isTTY) {
  console.error('Run this command in an interactive terminal so the password is not echoed.');
  process.exit(1);
}

const input = process.stdin;
input.setRawMode(true);
input.setEncoding('utf8');
input.resume();
process.stdout.write('Enter a 12-character password (upper/lowercase, number, symbol; no spaces): ');

let password = '';
input.on('data', (chunk) => {
  for (const character of chunk) {
    if (character === '\u0003') {
      input.setRawMode(false);
      process.stdout.write('\nCancelled.\n');
      process.exit(1);
    }
    if (character === '\r' || character === '\n') {
      input.setRawMode(false);
      input.pause();
      process.stdout.write('\n');

      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])[!-~]{12}$/.test(password)) {
        console.error(
          'Password must be exactly 12 characters and include uppercase, lowercase, a number, and a symbol (no spaces).'
        );
        process.exit(1);
      }

      const salt = randomBytes(16);
      const hash = scryptSync(password, salt, KEY_LENGTH, {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
        maxmem: 64 * 1024 * 1024,
      });
      process.stdout.write(
        `AUTH_PASSWORD_HASH=scrypt:${SCRYPT_COST}:${SCRYPT_BLOCK_SIZE}:${SCRYPT_PARALLELIZATION}:${salt.toString('base64url')}:${hash.toString('base64url')}\n`
      );
      process.exit(0);
    }
    if (character === '\u0008' || character === '\u007f') {
      password = password.slice(0, -1);
    } else if (/^[\x21-\x7e]$/.test(character)) {
      password += character;
    }
  }
});
