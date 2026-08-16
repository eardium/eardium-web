import { functionsBaseUrl } from './config';
import type { Folder } from './types';

interface ApiErrorBody {
  error?: string;
}

async function request<T>(
  functionName: string,
  body: Record<string, unknown>,
  accountNumber?: string,
): Promise<T> {
  if (!functionsBaseUrl) {
    throw new Error('The web backend is not configured yet.');
  }
  const response = await fetch(`${functionsBaseUrl}/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accountNumber ? { Authorization: `Bearer ${accountNumber}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function createAccount(): Promise<{ account_number: string; folders: Folder[] }> {
  return request('web-account', { action: 'create' });
}

export async function loginAccount(accountNumber: string): Promise<{ folders: Folder[] }> {
  return request('web-account', { action: 'login', account_number: accountNumber });
}

export async function deleteAccount(accountNumber: string): Promise<void> {
  await request('web-account', { action: 'delete_account' }, accountNumber);
}

export async function listFolders(accountNumber: string): Promise<Folder[]> {
  const result = await request<{ folders: Folder[] }>('web-folders', { action: 'list' }, accountNumber);
  return result.folders;
}

export async function folderAction<T = { ok: true }>(
  accountNumber: string,
  action: string,
  values: Record<string, unknown>,
): Promise<T> {
  return request('web-folders', { action, ...values }, accountNumber);
}

export async function joinWaitlist(email: string): Promise<void> {
  await request('web-waitlist', { action: 'join', email });
}
