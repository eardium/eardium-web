/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CATALOG_AUDIO_BASE_URL?: string;
  readonly VITE_FUNCTIONS_BASE_URL?: string;
  readonly VITE_WEB_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
