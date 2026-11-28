import { Link } from 'react-router';

/** CU42 A4: se muestra solo cuando la consulta de Explorar confirma una actividad propia iniciada hoy. */
export function BannerActividadesHoy() {
  return (
    <aside className="banner-actividades-hoy" aria-label="Actividades de hoy">
      <div>
        <strong>Tenes actividades que comienzan hoy!</strong>
        <p>hace click aca para ver tus actividades iniciadas y entra a la actividad para ver los detalles.</p>
      </div>
      <Link to="/mis-actividades" className="boton-secundario enlace-boton">
        Ver mis actividades
      </Link>
    </aside>
  );
}
