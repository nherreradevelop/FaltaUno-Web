import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useSesion } from '../sesion/SesionContexto';

/** Dirección a la que se quería entrar antes de pasar por el login (CU09 A3). */
interface EstadoConDestino {
  desde?: string;
}

/** Sin sesión, lleva al login recordando a dónde se quería entrar (CU09 A3, por ejemplo un enlace compartido). */
export function RutaPrivada({ children }: { children: ReactNode }) {
  const { sesion } = useSesion();
  const location = useLocation();
  if (sesion) {
    return children;
  }
  const destino: EstadoConDestino = { desde: location.pathname + location.search };
  return <Navigate to="/login" replace state={destino} />;
}

/**
 * CU01 precondición: con una sesión activa no se muestra el login.
 * Al iniciar sesión se vuelve a la dirección que se intentaba abrir (CU09 A3 paso 3) o a la pantalla principal.
 */
export function RutaSoloSinSesion({ children }: { children: ReactNode }) {
  const { sesion } = useSesion();
  const location = useLocation();
  if (!sesion) {
    return children;
  }
  const desde = (location.state as EstadoConDestino | null)?.desde;
  // Solo direcciones internas, para no redirigir a un sitio externo
  const destino = desde && desde.startsWith('/') && !desde.startsWith('//') ? desde : '/';
  return <Navigate to={destino} replace />;
}
