import type { Coordenadas } from '../api/actividades';

export interface UbicacionDispositivo extends Coordenadas {
  precisionMetros: number;
}

/** Obtiene una posición solo por solicitud explícita; cancelar impide procesar callbacks tardíos del navegador. */
export function obtenerUbicacionActual(
  geolocalizacion: Pick<Geolocation, 'getCurrentPosition'> | undefined = globalThis.navigator?.geolocation,
  signal?: AbortSignal,
): Promise<UbicacionDispositivo> {
  if (!geolocalizacion) {
    return Promise.reject(
      new Error('Tu navegador no permite obtener la ubicación en esta página. Podés marcar el punto manualmente.'),
    );
  }
  return new Promise((resolver, rechazar) => {
    let terminada = false;
    const terminar = (accion: () => void) => {
      if (terminada) return;
      terminada = true;
      signal?.removeEventListener('abort', cancelar);
      accion();
    };
    const cancelar = () => terminar(() => rechazar(new DOMException('Solicitud cancelada', 'AbortError')));
    if (signal?.aborted) {
      cancelar();
      return;
    }
    signal?.addEventListener('abort', cancelar, { once: true });
    try {
      geolocalizacion.getCurrentPosition(
        (posicion) =>
          terminar(() => {
            const { coords } = posicion;
            const { latitude: lat, longitude: lng, accuracy: precisionMetros } = coords;
            if (
              !Number.isFinite(lat) ||
              !Number.isFinite(lng) ||
              Math.abs(lat) > 90 ||
              Math.abs(lng) > 180 ||
              !Number.isFinite(precisionMetros) ||
              precisionMetros < 0
            ) {
              rechazar(new Error('No pudimos obtener una ubicación válida. Podés marcar el punto manualmente.'));
              return;
            }
            resolver({ lat, lng, precisionMetros });
          }),
        ({ code }) =>
          terminar(() => {
            const mensajes: Record<number, string> = {
              1: 'No permitiste acceder a tu ubicación. Podés revisar el permiso del navegador o marcar el punto manualmente.',
              2: 'No pudimos determinar tu ubicación. Probá de nuevo o marcá el punto manualmente.',
              3: 'Se agotó el tiempo para obtener tu ubicación. Probá de nuevo o marcá el punto manualmente.',
            };
            rechazar(new Error(mensajes[code] ?? 'No pudimos obtener tu ubicación. Podés marcar el punto manualmente.'));
          }),
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
      );
    } catch {
      terminar(() => rechazar(new Error('No pudimos acceder a tu ubicación. Podés marcar el punto manualmente.')));
    }
  });
}
