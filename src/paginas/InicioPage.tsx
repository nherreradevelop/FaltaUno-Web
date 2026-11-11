import { useLocation } from 'react-router';
import { useSesion } from '../sesion/SesionContexto';

/**
 * Pantalla principal provisoria: destino del CU01 FP paso 8. Desde el encabezado se llega a "Mi perfil" (CU04).
 * También muestra el aviso con el que vuelve otra pantalla (CU09 E2: la actividad no está disponible).
 * Pendiente: CU08 – Buscar actividades (W02 Explorar).
 */
export function InicioPage() {
  const { sesion } = useSesion();
  const location = useLocation();
  const aviso = (location.state as { aviso?: string } | null)?.aviso;

  return (
    <main className="inicio">
      {aviso && (
        <p className="aviso-info" role="alert">
          {aviso}
        </p>
      )}
      <h1>¡Hola, {sesion?.usuario.nombre}!</h1>
      <p>Iniciaste sesión correctamente.</p>
    </main>
  );
}
