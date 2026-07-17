/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_API_URL: string;
  readonly VITE_USER_API_URL: string;
  readonly VITE_AI_API_URL: string;
  readonly VITE_COURSE_API_URL: string;
  readonly VITE_ANALYTICS_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
