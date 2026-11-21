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
process.stdout.write('Enter an admin password (12+ characters): ');

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

      if (password.length < 12) {
        console.error('Password must contain at least 12 characters.');
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
    } else {
      password += character;
    }
  }
});
