/**
 * Carga de la Maps JavaScript API de Google (CU09 A2: mapa interactivo de "Cómo llegar").
 *
 * El script se pide una sola vez por página y la promesa se comparte: si varios mapas se montan a la vez,
 * no se duplica la descarga. Sin VITE_GOOGLE_MAPS_API_KEY no se carga nada y se usa el mapa embebido, que no lleva key.
 *
 * No se agregó @types/google.maps: se declaran solo las partes de la API que usa la app.
 */

const CLAVE_API = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
// Los marcadores avanzados necesitan un Map ID. DEMO_MAP_ID sirve para desarrollo; en producción va uno propio.
export const ID_DE_MAPA = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

const NOMBRE_DEL_CALLBACK = '__faltaUnoGoogleMapsListo';

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
    __faltaUnoGoogleMapsListo?: () => void;
    /** Google llama a esta función cuando la key es inválida o la API no está habilitada. */
    gm_authFailure?: () => void;
  }
}

/** true si hay key configurada: sin key el mapa interactivo ni se intenta. */
export function hayClaveDeGoogleMaps(): boolean {
  return CLAVE_API !== '';
}

let cargaEnCurso: Promise<GoogleMapsGlobal> | null = null;

/** Descarga el script de Google Maps (una sola vez) y devuelve el objeto global `google`. */
export function cargarGoogleMaps(): Promise<GoogleMapsGlobal> {
  if (cargaEnCurso) {
    return cargaEnCurso;
  }
  cargaEnCurso = new Promise<GoogleMapsGlobal>((resolver, rechazar) => {
    window[NOMBRE_DEL_CALLBACK] = () => {
      if (window.google) {
        resolver(window.google);
      } else {
        rechazar(new Error('Google Maps cargó pero no definió window.google'));
      }
    };

    const parametros = new URLSearchParams({
      key: CLAVE_API,
      v: 'weekly',
      loading: 'async',
      callback: NOMBRE_DEL_CALLBACK,
      language: 'es',
      region: 'UY',
    });
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?${parametros.toString()}`;
    script.async = true;
    script.onerror = () => {
      cargaEnCurso = null; // permite reintentar en el próximo montaje (por ejemplo, si volvió la conexión)
      script.remove();
      rechazar(new Error('No se pudo descargar el script de Google Maps'));
    };
    document.head.appendChild(script);
  });
  return cargaEnCurso;
}
