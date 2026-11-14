import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { cerrarSesionEnServidor } from '../api/auth';
import { ErrorApi } from '../api/cliente';
import type { RespuestaLogin } from '../api/tipos';
import { obtenerUsuarioActual } from '../api/usuarios';
import { almacenSesion, type Sesion } from './almacenSesion';

interface ValorSesion {
  sesion: Sesion | null;
  abrirSesion: (respuesta: RespuestaLogin) => void;
  /** CU37: cierra la sesión en el servidor y en el navegador. Nunca lanza: si algo falla, el login lo avisa (ER1, ER2). */
  cerrarSesion: () => Promise<void>;
}

const SesionContexto = createContext<ValorSesion | null>(null);

/** Expone la sesión a las pantallas y la mantiene sincronizada con almacenSesion. */
export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(() => almacenSesion.actual());

  // Observer: cualquier cambio (login, o un 401 que la cierra) llega acá y re-renderiza las rutas
  useEffect(() => {
    const desuscribir = almacenSesion.cambios.suscribir(setSesion);
    return desuscribir;
  }, []);

  // Al abrir la web con una sesión guardada, se confirma que siga vigente (CU01 RN4).
  // Si venció, el cliente HTTP recibe 401 y la cierra. Si la API no responde, se conserva (RNF-15).
  useEffect(() => {
    const sesionGuardada = almacenSesion.actual();
    if (!sesionGuardada) {
      return;
    }
    obtenerUsuarioActual()
      .then((usuario) => almacenSesion.abrir({ token: sesionGuardada.token, usuario }))
      .catch(() => undefined);
  }, []);

  const abrirSesion = useCallback((respuesta: RespuestaLogin) => {
    almacenSesion.abrir({ token: respuesta.token, usuario: respuesta.usuario });
  }, []);

  const cerrarSesion = useCallback(async () => {
    const confirmadoEnServidor = await invalidarEnServidor();
    // Pendiente: CU07 – cerrar la conexión en tiempo real de la mensajería (FP paso 7), cuando exista
    almacenSesion.cerrarPorElUsuario(confirmadoEnServidor);
  }, []);

  const valor = useMemo(() => ({ sesion, abrirSesion, cerrarSesion }), [sesion, abrirSesion, cerrarSesion]);
  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>;
}

export function useSesion(): ValorSesion {
  const valor = useContext(SesionContexto);
  if (!valor) {
    throw new Error('useSesion se usó fuera de <ProveedorSesion>');
  }
  return valor;
}

/** CU37 FP pasos 4 a 6. Devuelve false si la API no confirmó el cierre (ER1); el error se registra sin el token. */
async function invalidarEnServidor(): Promise<boolean> {
  try {
    await cerrarSesionEnServidor();
    return true;
  } catch (error) {
    const detalle = error instanceof ErrorApi ? { estado: error.estado, codigo: error.codigo } : { error: String(error) };
    console.warn('CU37 ER1: no se pudo confirmar el cierre de sesión en el servidor', detalle);
    return false;
  }
}
