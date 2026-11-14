import { Link } from 'react-router';
import type { ResultadoDeGrupo } from '../comun/useActividadesPorGrupo';
import { MENSAJE_SIN_ACTIVIDADES } from '../paginas/mensajesExplorar';
import { EsqueletoDeActividades } from './EsqueletoDeActividades';
import { TarjetaActividad } from './TarjetaActividad';

interface PropsResultados {
  id: string;
  titulo: string;
  resultado: ResultadoDeGrupo;
  /** CU08 E1: solo la sección "podrían interesarte" sugiere crear una actividad cuando está vacía. */
  sugerirCrear?: boolean;
}

/**
 * CU08: una sección del dashboard (título y actividades), de a 10 actividades.
 * Solo presenta: la página carga los datos de cada sección con useActividadesPorGrupo.
 */
export function ResultadosDeBusqueda({ id, titulo, resultado, sugerirCrear = false }: PropsResultados) {
  const { actividades, hayMas, cargando, error: mensajeError, reintentar, verMas } = resultado;
  const sinActividades = !cargando && !mensajeError && actividades.length === 0;
  const idTitulo = `titulo-${id}`;

  return (
    <section className="resultados" aria-labelledby={idTitulo}>
      <h2 id={idTitulo}>{titulo}</h2>
      <div className="resultados">
        {/* E1 */}
        {sinActividades && (
          <div className="tarjeta resultados__vacio">
            <p>{MENSAJE_SIN_ACTIVIDADES}</p>
            {/* CU08 E1: se sugiere crear una (CU10) */}
            {sugerirCrear && (
              <Link to="/actividades/crear" className="boton-secundario enlace-boton">
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

        {cargando && <EsqueletoDeActividades cantidad={actividades.length > 0 ? 1 : 2} />}

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
    </section>
  );
}
