/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PAYMENT_CARD_NUMBER?: string;
  readonly VITE_PAYMENT_ACCOUNT_HOLDER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
