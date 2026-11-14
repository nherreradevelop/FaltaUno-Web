import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { RespuestaLogin } from '../api/tipos';
import { obtenerUsuarioActual } from '../api/usuarios';
import { almacenSesion, type Sesion } from './almacenSesion';

interface ValorSesion {
  sesion: Sesion | null;
  abrirSesion: (respuesta: RespuestaLogin) => void;
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
      .then((usuario) => {
        if (almacenSesion.token() === sesionGuardada.token) almacenSesion.abrir({ token: sesionGuardada.token, usuario });
      })
      .catch(() => undefined);
  }, []);

  const abrirSesion = useCallback((respuesta: RespuestaLogin) => {
    almacenSesion.abrir({ token: respuesta.token, usuario: respuesta.usuario });
  }, []);

  const valor = useMemo(() => ({ sesion, abrirSesion }), [sesion, abrirSesion]);
  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>;
}

export function useSesion(): ValorSesion {
  const valor = useContext(SesionContexto);
  if (!valor) {
    throw new Error('useSesion se usó fuera de <ProveedorSesion>');
  }
  return valor;
}
