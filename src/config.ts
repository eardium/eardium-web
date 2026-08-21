const DEFAULT_CATALOG_AUDIO_BASE_URL =
  'https://xfqvqnsgwceitysdrqdn.supabase.co/storage/v1/object/public/catalog-audio';
const DEFAULT_WEB_APP_URL = 'https://eardium.github.io/eardium-web';

export function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export const catalogAudioBaseUrl = withoutTrailingSlash(
  import.meta.env.VITE_CATALOG_AUDIO_BASE_URL || DEFAULT_CATALOG_AUDIO_BASE_URL,
);
export const functionsBaseUrl = withoutTrailingSlash(import.meta.env.VITE_FUNCTIONS_BASE_URL || '');
export const webAppUrl = withoutTrailingSlash(
  import.meta.env.VITE_WEB_APP_URL || DEFAULT_WEB_APP_URL,
);
