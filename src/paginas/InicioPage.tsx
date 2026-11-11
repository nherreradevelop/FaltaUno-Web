import { Link } from 'react-router';
import { useSesion } from '../sesion/SesionContexto';

/** Pantalla principal provisoria: destino del CU01 FP paso 8. Pendiente: CU08 – Buscar actividades (W02 Explorar). */
export function InicioPage() {
  const { sesion } = useSesion();
  return (
    <main className="inicio">
      <h1>¡Hola, {sesion?.usuario.nombre}!</h1>
      <p>Iniciaste sesión correctamente.</p>
      <Link className="inicio-crear" to="/actividades/crear">
        Crear actividad
      </Link>
    </main>
  );
}
