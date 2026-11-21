import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { contarNotificacionesNoLeidas, type Notificacion } from '../api/notificaciones';
import { conectarTiempoReal } from '../api/tiempoReal';
import { Observable } from '../comun/observable';
import { useSesion } from '../sesion/SesionContexto';
import { EVENTOS_EN_VIVO, type AvisoDeNotificacionNueva } from './notificaciones';

interface ValorNotificaciones {
  /** Cantidad sin leer confirmada por la API (RN4, ER2). */
  noLeidas: number;
  /** Actualiza el indicador con la cantidad que devolvió la API al marcar como leída (FP paso 6, A1). */
  actualizarNoLeidas: (cantidad: number) => void;
  /** Observer: avisa cada notificación nueva que llega en tiempo real (A3), por ejemplo al panel abierto. */
  nuevas: Observable<Notificacion>;
  /** Observer: avisa el id de cada notificación descartada en otro dispositivo (A5). */
  descartadas: Observable<string>;
  /** Vuelve a pedir la cantidad sin leer (al abrir el panel). */
  refrescarNoLeidas: () => void;
}

const NotificacionesContexto = createContext<ValorNotificaciones | null>(null);

/**
 * CU40: mantiene el indicador de no leídas y la conexión en tiempo real mientras haya sesión.
 * Al cerrar la sesión se desmonta junto con las pantallas privadas y cierra la conexión.
 */
export function ProveedorNotificaciones({ children }: { children: ReactNode }) {
  const { sesion } = useSesion();
  const token = sesion?.token ?? null;
  const [noLeidas, setNoLeidas] = useState(0);
  const nuevas = useMemo(
    () => new Observable<Notificacion>((error) => console.error('Falló un observador de notificaciones', error)),
    [],
  );
  const descartadas = useMemo(
    () => new Observable<string>((error) => console.error('Falló un observador de notificaciones descartadas', error)),
    [],
  );
  // Cambia con cada pedido para que refrescarNoLeidas() vuelva a disparar la consulta del efecto de abajo
  const [pedidoDeRefresco, setPedidoDeRefresco] = useState(0);

  useEffect(() => {
    if (token === null) return;
    let vigente = true;

    // ER1 y ER3: si falla, se conserva el último valor y se vuelve a pedir más tarde
    function refrescarNoLeidas() {
      contarNotificacionesNoLeidas()
        .then((cantidad) => {
          if (vigente) setNoLeidas(cantidad);
        })
        .catch(() => undefined);
    }

    function alCambiarVisibilidad() {
      if (document.visibilityState === 'visible') refrescarNoLeidas();
    }

    refrescarNoLeidas();
    const socket = conectarTiempoReal(token);
    socket.on(EVENTOS_EN_VIVO.nueva, (aviso: AvisoDeNotificacionNueva) => {
      setNoLeidas(aviso.noLeidas);
      nuevas.notificar(aviso.notificacion);
    });
    socket.on(EVENTOS_EN_VIVO.noLeidas, ({ cantidad }: { cantidad: number }) => setNoLeidas(cantidad));
    socket.on(EVENTOS_EN_VIVO.descartada, ({ id }: { id: string }) => descartadas.notificar(id));
    // ER3: al recuperar la conexión se vuelve a consultar, por si llegaron notificaciones mientras estaba caída
    socket.io.on('reconnect', refrescarNoLeidas);
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    // Al volver a la ventana del navegador (otra app o pestaña) también se actualiza el indicador
    window.addEventListener('focus', refrescarNoLeidas);

    return () => {
      vigente = false;
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      window.removeEventListener('focus', refrescarNoLeidas);
      socket.io.off('reconnect', refrescarNoLeidas);
      socket.disconnect();
    };
  }, [token, nuevas, descartadas]);

  // Pedido puntual del contador (al abrir el panel), sin reabrir la conexión en tiempo real
  useEffect(() => {
    if (token === null || pedidoDeRefresco === 0) return;
    let vigente = true;
    contarNotificacionesNoLeidas()
      .then((cantidad) => {
        if (vigente) setNoLeidas(cantidad);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [token, pedidoDeRefresco]);

  const valor = useMemo(
    () => ({
      noLeidas,
      actualizarNoLeidas: setNoLeidas,
      nuevas,
      descartadas,
      refrescarNoLeidas: () => setPedidoDeRefresco((anterior) => anterior + 1),
    }),
    [noLeidas, nuevas, descartadas],
  );
  return <NotificacionesContexto.Provider value={valor}>{children}</NotificacionesContexto.Provider>;
}

export function useNotificaciones(): ValorNotificaciones {
  const valor = useContext(NotificacionesContexto);
  if (!valor) {
    throw new Error('useNotificaciones se usa dentro de ProveedorNotificaciones');
  }
  return valor;
}
