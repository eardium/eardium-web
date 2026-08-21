import type { Route } from './types';

// Hash segments come from shared/typed links; a stray % must not throw out of
// the hashchange listener, so fall back to the raw segment on bad encoding.
function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').replace(/\/+$/, '');
  if (!path) return { name: 'home' };
  const parts = path.split('/').map(decodeSegment);
  if (parts[0] === 'c' && parts[1]) return { name: 'category', category: parts[1] };
  if (parts[0] === 's' && parts[1]) return { name: 'session', id: parts[1] };
  if (parts[0] === 'folders' && parts[1]) return { name: 'folder', id: parts[1] };
  if (parts[0] === 'folders') return { name: 'folders' };
  if (parts[0] === 'subscribe' && parts[1]) return { name: 'subscribe', token: parts[1] };
  if (parts[0] === 'account') return { name: 'account' };
  return { name: 'not-found' };
}
