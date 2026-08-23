const STORAGE_KEY = 'eardium.web.account-number.v1';

export function normalizeAccountNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 16);
}

export function formatAccountNumber(value: string): string {
  return normalizeAccountNumber(value).replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function isValidAccountNumber(value: string): boolean {
  return normalizeAccountNumber(value).length === 16;
}

export function loadAccountNumber(): string | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value && isValidAccountNumber(value) ? normalizeAccountNumber(value) : null;
  } catch {
    return null;
  }
}

export function saveAccountNumber(value: string): void {
  window.localStorage.setItem(STORAGE_KEY, normalizeAccountNumber(value));
}

export function clearAccountNumber(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
