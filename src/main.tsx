import { GoogleOAuthProvider } from '@react-oauth/google';
import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Rutas } from './rutas/Rutas';
import { ProveedorSesion } from './sesion/SesionContexto';
import './estilos.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/** El script de Google solo se carga si hay un Client ID configurado. */
function ConGoogle({ children }: { children: ReactNode }) {
  if (!GOOGLE_CLIENT_ID) {
    return children;
  }
  return <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>;
}

const raiz = document.getElementById('raiz');
if (!raiz) {
  throw new Error('No se encontró el elemento #raiz en index.html');
}

createRoot(raiz).render(
  <StrictMode>
    <ConGoogle>
      <ProveedorSesion>
        <Rutas />
      </ProveedorSesion>
    </ConGoogle>
  </StrictMode>,
);
