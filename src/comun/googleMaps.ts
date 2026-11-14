import { cargarGoogleMaps as cargarSdkDeGoogleMaps } from '../infra/google-maps';

/**
 * Carga de la Maps JavaScript API de Google (CU09 A2: mapa interactivo de "Cómo llegar").
 *
 * El script se pide una sola vez por página (con infra/google-maps, compartido con el CU10) y la promesa se comparte. Sin VITE_GOOGLE_MAPS_API_KEY no se carga nada y se usa el mapa embebido, que no lleva key.
 *
 * No se agregó @types/google.maps: se declaran solo las partes de la API que usa la app.
 */

const CLAVE_API = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
// Los marcadores avanzados necesitan un Map ID. DEMO_MAP_ID sirve para desarrollo; en producción va uno propio.
export const ID_DE_MAPA = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface MapaDeGoogle {
  fitBounds(limites: LimitesDeGoogle, relleno?: number): void;
}

export interface LimitesDeGoogle {
  extend(punto: Coordenadas): void;
}

interface OpcionesDelMapa {
  center: Coordenadas;
  zoom: number;
  mapId: string;
  streetViewControl?: boolean;
  mapTypeControl?: boolean;
  gestureHandling?: 'cooperative' | 'greedy' | 'none' | 'auto';
}

interface OpcionesDelPin {
  background: string;
  borderColor: string;
  glyphColor: string;
}

interface OpcionesDelMarcador {
  map: MapaDeGoogle;
  position: Coordenadas;
  title: string;
  content: HTMLElement;
}

export interface MarcadorDeGoogle {
  map: MapaDeGoogle | null;
}

export interface BibliotecaDeMapas {
  Map: new (contenedor: HTMLElement, opciones: OpcionesDelMapa) => MapaDeGoogle;
  LatLngBounds: new () => LimitesDeGoogle;
}

export interface BibliotecaDeMarcadores {
  AdvancedMarkerElement: new (opciones: OpcionesDelMarcador) => MarcadorDeGoogle;
  PinElement: new (opciones: OpcionesDelPin) => { element: HTMLElement };
}

export interface GoogleMapsGlobal {
  maps: {
    importLibrary(nombre: 'maps'): Promise<BibliotecaDeMapas>;
    importLibrary(nombre: 'marker'): Promise<BibliotecaDeMarcadores>;
  };
}

declare global {
  interface Window {
    google?: GoogleMapsGlobal;
    /** Google llama a esta función cuando la key es inválida o la API no está habilitada. */
    gm_authFailure?: () => void;
  }
}

/** true si hay key configurada: sin key el mapa interactivo ni se intenta. */
export function hayClaveDeGoogleMaps(): boolean {
  return CLAVE_API !== '';
}

/**
 * Devuelve el objeto global `google` con el SDK ya cargado.
 * La descarga la hace infra/google-maps (la misma que usa el CU10): si la web cargara el script dos veces,
 * Google lo rechaza ("included the Google Maps JavaScript API multiple times").
 */
export async function cargarGoogleMaps(): Promise<GoogleMapsGlobal> {
  await cargarSdkDeGoogleMaps();
  if (!window.google) {
    throw new Error('Google Maps cargó pero no definió window.google');
  }
  return window.google;
}
