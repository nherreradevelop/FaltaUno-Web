/// <reference types="vite/client" />
/// <reference types="google.maps" />

interface ImportMetaEnv {
  readonly VITE_URL_API: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** Maps JavaScript API (CU09 A2 y CU10). Vacía: se usa el mapa embebido, que no lleva key. */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  /** Map ID para los marcadores avanzados. Vacío: DEMO_MAP_ID (solo desarrollo). */
  readonly VITE_GOOGLE_MAPS_MAP_ID?: string;
}
