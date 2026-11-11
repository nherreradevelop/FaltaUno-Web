import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { InicioPage } from '../paginas/InicioPage';
import { LoginPage } from '../paginas/LoginPage';
import { CrearActividadPage } from '../paginas/CrearActividadPage';
import { RutaPrivada, RutaSoloSinSesion } from './RutaPrivada';

// El data router permite confirmar también la salida con Atrás del navegador (CU10 A1).
const rutas = createBrowserRouter([
  {
    path: '/login',
    element: (
      <RutaSoloSinSesion>
        <LoginPage />
      </RutaSoloSinSesion>
    ),
  },
  {
    path: '/',
    element: (
      <RutaPrivada>
        <InicioPage />
      </RutaPrivada>
    ),
  },
  {
    path: '/actividades/crear',
    element: (
      <RutaPrivada>
        <CrearActividadPage />
      </RutaPrivada>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function Rutas() {
  return <RouterProvider router={rutas} />;
}
