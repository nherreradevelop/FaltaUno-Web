import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useSesion } from '../sesion/SesionContexto';

/** Sin sesión, lleva al login. */
export function RutaPrivada({ children }: { children: ReactNode }) {
  const { sesion } = useSesion();
  return sesion ? children : <Navigate to="/login" replace />;
}

/** CU01 precondición: con una sesión activa no se muestra el login, se va a la pantalla principal. */
export function RutaSoloSinSesion({ children }: { children: ReactNode }) {
  const { sesion } = useSesion();
  return sesion ? <Navigate to="/" replace /> : children;
}
