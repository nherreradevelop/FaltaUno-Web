import { Link } from 'react-router';
import { useSesion } from '../sesion/SesionContexto';
import { Avatar } from './Avatar';

/**
 * Encabezado de las pantallas con sesión (mockup W02). El avatar lleva a "Mi perfil" (CU04 FP paso 1).
 * Pendiente: CU08 Explorar, Mis actividades, CU07 Mensajes y CU06 Amigos, cuando existan.
 */
export function Encabezado() {
  const { sesion } = useSesion();
  if (!sesion) {
    return null;
  }

  return (
    <header className="encabezado">
      <Link to="/" className="encabezado__marca">
        <img src="/logo-faltauno.png" alt="" />
        FaltaUno
      </Link>
      <Link to="/perfil" className="encabezado__perfil" aria-label="Mi perfil" title="Mi perfil">
        <Avatar nombre={sesion.usuario.nombre} fotoUrl={sesion.usuario.fotoUrl} tamano={40} />
      </Link>
    </header>
  );
}
