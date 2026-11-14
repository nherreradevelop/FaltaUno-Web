import { Link, NavLink } from 'react-router';
import { useSesion } from '../sesion/SesionContexto';
import { Avatar } from './Avatar';

/**
 * Encabezado de las pantallas con sesión (mockup W02). "Explorar" lleva a la búsqueda (CU08), "Crear actividad" al alta (CU10)
 * y el avatar a "Mi perfil" (CU04 FP paso 1).
 * Pendiente: Mis actividades, CU07 Mensajes y CU06 Amigos, cuando existan.
 */
export function Encabezado() {
  const { sesion } = useSesion();
  if (!sesion) {
    return null;
  }

  return (
    <header className="encabezado">
      <div className="encabezado__izquierda">
        <Link to="/" className="encabezado__marca">
          <img src="/logo-faltauno.png" alt="" />
          FaltaUno
        </Link>
        <nav className="encabezado__navegacion" aria-label="Principal">
          <NavLink to="/" end className="encabezado__enlace">
            Explorar actividades
          </NavLink>
        </nav>
      </div>
      <div className="encabezado__derecha">
        {/* CU10 – Crear actividad */}
        <Link to="/actividades/crear" className="boton boton--acento enlace-boton encabezado__crear">
          + Crear actividad
        </Link>
        <Link to="/perfil" className="encabezado__perfil" aria-label="Mi perfil" title="Mi perfil">
          <Avatar nombre={sesion.usuario.nombre} fotoUrl={sesion.usuario.fotoUrl} tamano={40} />
        </Link>
      </div>
    </header>
  );
}
