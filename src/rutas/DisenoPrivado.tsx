import { Outlet } from 'react-router';
import { Encabezado } from '../componentes/Encabezado';

/** Estructura común de las pantallas con sesión: encabezado y, debajo, la pantalla de la ruta. */
export function DisenoPrivado() {
  return (
    <>
      <Encabezado />
      <Outlet />
    </>
  );
}
