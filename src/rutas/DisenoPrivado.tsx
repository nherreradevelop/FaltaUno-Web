import { Outlet } from 'react-router';
import { Encabezado } from '../componentes/Encabezado';
import { ProveedorNotificaciones } from '../notificaciones/ProveedorNotificaciones';

/**
 * Estructura común de las pantallas con sesión: encabezado y, debajo, la pantalla de la ruta.
 * Las notificaciones (CU40) viven mientras haya sesión: al cerrarla se desmontan y cierran la conexión en tiempo real.
 */
export function DisenoPrivado() {
  return (
    <ProveedorNotificaciones>
      <Encabezado />
      <Outlet />
    </ProveedorNotificaciones>
  );
}
