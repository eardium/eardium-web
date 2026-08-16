import { formatAccountNumber, isValidAccountNumber, normalizeAccountNumber } from '../src/account';

describe('number-only account formatting', () => {
  it('normalizes and groups a complete account number', () => {
    expect(normalizeAccountNumber('1234 5678-9012 3456 extra')).toBe('1234567890123456');
    expect(formatAccountNumber('1234567890123456')).toBe('1234 5678 9012 3456');
    expect(isValidAccountNumber('1234 5678 9012 3456')).toBe(true);
  });

  it('rejects incomplete credentials', () => {
    expect(isValidAccountNumber('1234')).toBe(false);
  });
});
