import type { UbicacionDelUsuario } from '../api/tipos';

// Si el navegador tarda más que esto en dar la ubicación, se busca sin ella para no demorar la lista
const TIEMPO_ESPERA_UBICACION_MS = 8_000;
// Una ubicación de hasta 10 minutos atrás alcanza para ordenar por cercanía
const ANTIGUEDAD_MAXIMA_MS = 10 * 60_000;

/**
 * CU08 RN1: ubicación del navegador para ordenar por cercanía.
 * Devuelve null si el navegador no la soporta, el usuario no dio permiso o no se pudo obtener: en ese caso se ordena solo por fecha.
 */
export function obtenerUbicacion(): Promise<UbicacionDelUsuario | null> {
  if (!('geolocation' in navigator)) {
    return Promise.resolve(null);
  }
  return new Promise((resolver) => {
    navigator.geolocation.getCurrentPosition(
      (posicion) => resolver({ lat: posicion.coords.latitude, lng: posicion.coords.longitude }),
      () => resolver(null),
      { timeout: TIEMPO_ESPERA_UBICACION_MS, maximumAge: ANTIGUEDAD_MAXIMA_MS },
    );
  });
}
