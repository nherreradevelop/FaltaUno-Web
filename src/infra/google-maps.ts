import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

let carga: Promise<google.maps.MapsLibrary> | undefined;

/** Carga compartida y diferida del SDK: la búsqueda por nombre no descarga el mapa. */
export function cargarGoogleMaps(): Promise<google.maps.MapsLibrary> {
  const clave = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!clave) return Promise.reject(new Error('El mapa no está disponible. Podés seguir buscando un lugar por nombre.'));
  if (!carga) {
    setOptions({ key: clave, v: 'weekly', language: 'es', region: 'UY' });
    carga = importLibrary('maps').catch((error: unknown) => {
      carga = undefined;
      throw error;
    });
  }
  return carga;
}
