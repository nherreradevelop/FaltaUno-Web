import { useEffect, useState } from 'react';
import { buscarActividades } from '../api/actividades';
import type { ActividadEncontrada, FiltrosDeBusqueda, UbicacionDelUsuario } from '../api/tipos';
import { MENSAJE_SIN_ACTIVIDADES, mensajeDeErrorDeBusqueda } from '../paginas/mensajesExplorar';
import { TarjetaActividad } from './TarjetaActividad';

interface PropsResultados {
  filtros: FiltrosDeBusqueda;
  ubicacion: UbicacionDelUsuario | null;
}

/**
 * CU08 FP paso 2: lista de actividades disponibles para los filtros, de a 10.
 * La página la monta con una key por filtros: al cambiar un filtro, la lista arranca de cero desde la página 1.
 */
export function ResultadosDeBusqueda({ filtros, ubicacion }: PropsResultados) {
  const [actividades, setActividades] = useState<ActividadEncontrada[]>([]);
  const [paginaCargada, setPaginaCargada] = useState(0);
  const [paginaPedida, setPaginaPedida] = useState(1);
  /** Se incrementa al tocar "Reintentar" para volver a pedir la misma página (RNF-10). */
  const [intento, setIntento] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  useEffect(() => {
    // Si cambian los filtros o se sale de la pantalla antes de que llegue la respuesta, se descarta
    let vigente = true;
    setCargando(true);
    setMensajeError(null);

    buscarActividades(filtros, paginaPedida, ubicacion)
      .then((resultado) => {
        if (!vigente) return;
        setActividades((anteriores) => [...anteriores, ...resultado.actividades]);
        setPaginaCargada(resultado.pagina);
        setHayMas(resultado.hayMas);
      })
      .catch((error: unknown) => {
        if (vigente) setMensajeError(mensajeDeErrorDeBusqueda(error)); // ER1 y ER4
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [filtros, ubicacion, paginaPedida, intento]);

  const sinActividades = !cargando && !mensajeError && actividades.length === 0;

  return (
    <div className="resultados">
      {/* E1 */}
      {sinActividades && (
        <div className="tarjeta resultados__vacio">
          <p>{MENSAJE_SIN_ACTIVIDADES}</p>
          {/* Pendiente: CU10 – Crear actividad */}
          <button type="button" className="boton boton--acento" disabled>
            + Crear actividad
          </button>
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
          <button type="button" className="boton-secundario" onClick={() => setIntento((anterior) => anterior + 1)}>
            Reintentar
          </button>
        </div>
      )}

      {hayMas && !cargando && !mensajeError && (
        <button type="button" className="boton-secundario" onClick={() => setPaginaPedida(paginaCargada + 1)}>
          Ver más
        </button>
      )}
    </div>
  );
}
