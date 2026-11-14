import { Link } from 'react-router';
import { useActividadesPorGrupo } from '../comun/useActividadesPorGrupo';
import type { FiltrosDeBusqueda, GrupoDeActividades, UbicacionDelUsuario } from '../api/tipos';
import { MENSAJE_SIN_ACTIVIDADES } from '../paginas/mensajesExplorar';
import { TarjetaActividad } from './TarjetaActividad';

interface PropsResultados {
  grupo: GrupoDeActividades;
  filtros: FiltrosDeBusqueda;
  ubicacion: UbicacionDelUsuario | null;
}

/**
 * CU08: una sección del dashboard, de a 10 actividades.
 * El hook reinicia su paginación al cambiar filtros o ubicación.
 */
export function ResultadosDeBusqueda({ grupo, filtros, ubicacion }: PropsResultados) {
  const {
    actividades,
    hayMas,
    cargando,
    error: mensajeError,
    reintentar,
    verMas,
  } = useActividadesPorGrupo(grupo, filtros, ubicacion);

  const sinActividades = !cargando && !mensajeError && actividades.length === 0;

  return (
    <div className="resultados">
      {/* E1 */}
      {sinActividades && (
        <div className="tarjeta resultados__vacio">
          <p>
            {grupo === 'otras'
              ? MENSAJE_SIN_ACTIVIDADES
              : grupo === 'gestionando'
                ? 'Todavía no estás gestionando actividades.'
                : 'Todavía no estás unido a actividades.'}
          </p>
          {/* CU08 E1: se sugiere crear una (CU10) */}
          {grupo === 'otras' && (
            <Link to="/actividades/crear" className="boton boton--acento enlace-boton">
              + Crear actividad
            </Link>
          )}
        </div>
      )}

      {actividades.length > 0 && (
        <ul className="resultados__lista">
          {actividades.map((actividad) => (
            <li key={actividad.id}>
              <TarjetaActividad actividad={actividad} />
            </li>
          ))}
        </ul>
      )}

      {cargando && <p className="texto-suave">Cargando actividades…</p>}

      {mensajeError && (
        <div className="aviso-error resultados__error" role="alert">
          <span>{mensajeError}</span>
          <button type="button" className="boton-secundario" onClick={reintentar}>
            Reintentar
          </button>
        </div>
      )}

      {hayMas && !cargando && !mensajeError && (
        <button type="button" className="boton-secundario" onClick={verMas}>
          Ver más
        </button>
      )}
    </div>
  );
}
