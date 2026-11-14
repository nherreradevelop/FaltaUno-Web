import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { CrearActividadPage } from '../paginas/CrearActividadPage';
import { DetalleActividadPage } from '../paginas/DetalleActividadPage';
import { ExplorarPage } from '../paginas/ExplorarPage';
import { LoginPage } from '../paginas/LoginPage';
import { PerfilPage } from '../paginas/PerfilPage';
import { DisenoPrivado } from './DisenoPrivado';
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
    element: (
      <RutaPrivada>
        <DisenoPrivado />
      </RutaPrivada>
    ),
    children: [
      // CU08: la búsqueda de actividades es la pantalla principal con sesión
      { path: '/', element: <ExplorarPage /> },
      // CU04 FP y A1
      { path: '/perfil', element: <PerfilPage /> },
      { path: '/usuarios/:id', element: <PerfilPage /> },
      // CU10 (va antes que /actividades/:id para que "crear" no se tome como un id)
      { path: '/actividades/crear', element: <CrearActividadPage /> },
      // CU09: el detalle incluye participantes (A1) y mapa (A2)
      { path: '/actividades/:id', element: <DetalleActividadPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function Rutas() {
  return <RouterProvider router={rutas} />;
}
