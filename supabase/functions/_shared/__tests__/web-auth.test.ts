import { webcrypto } from 'node:crypto';
import { generateAccountNumber, hashAccountNumber, normalizeAccountNumber } from '../web-auth';

describe('web account credentials', () => {
  const originalDeno = (globalThis as { Deno?: unknown }).Deno;
  const originalCrypto = globalThis.crypto;
  let hashKey: string | undefined;

  beforeEach(() => {
    hashKey = 'a-stable-high-entropy-test-key';
    (globalThis as { Deno?: unknown }).Deno = {
      env: { get: (name: string) => (name === 'WEB_ACCOUNT_HASH_KEY' ? hashKey : undefined) },
    };
    Object.defineProperty(globalThis, 'crypto', {
      value: webcrypto,
      configurable: true,
    });
  });

  afterEach(() => {
    (globalThis as { Deno?: unknown }).Deno = originalDeno;
    Object.defineProperty(globalThis, 'crypto', {
      value: originalCrypto,
      configurable: true,
    });
  });

  it('normalizes display separators but requires exactly 16 digits', () => {
    expect(normalizeAccountNumber('1234 5678-9012 3456')).toBe('1234567890123456');
    expect(() => normalizeAccountNumber('1234')).toThrow('16 digits');
  });

  it('generates a 16-digit account number', () => {
    expect(generateAccountNumber()).toMatch(/^\d{16}$/);
  });

  it('uses a stable keyed HMAC for database lookup', async () => {
    const first = await hashAccountNumber('1234567890123456');
    const second = await hashAccountNumber('1234567890123456');
    hashKey = 'a-different-high-entropy-test-key';
    const withDifferentKey = await hashAccountNumber('1234567890123456');

    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(second).toBe(first);
    expect(withDifferentKey).not.toBe(first);
  });

  it('fails closed when the HMAC key is missing', async () => {
    hashKey = undefined;
    await expect(hashAccountNumber('1234567890123456')).rejects.toThrow(
      'WEB_ACCOUNT_HASH_KEY is not configured',
    );
  });
});
