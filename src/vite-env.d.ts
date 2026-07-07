/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_MAPBOX_ACCESS_TOKEN: string
  readonly VITE_MAPBOX_STYLE_LIGHT?: string
  readonly VITE_MAPBOX_STYLE_DARK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
