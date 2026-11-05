import { useEffect, useState } from 'react';
import { obtenerMiHistorial } from '../api/usuarios';
import type { ActividadDelHistorial } from '../api/tipos';
import { formatearFecha } from '../comun/formato';
import { ETIQUETA_ESTADO, MENSAJE_FALLA_HISTORIAL } from '../paginas/mensajesPerfil';

/**
 * CU04 FP paso 2: actividades archivadas o canceladas en las que participó el usuario, de a 10.
 * "Ver más" pide la página siguiente y la agrega al final de la lista.
 */
export function HistorialDeActividades() {
  const [actividades, setActividades] = useState<ActividadDelHistorial[]>([]);
  const [paginaCargada, setPaginaCargada] = useState(0);
  const [paginaPedida, setPaginaPedida] = useState(1);
  /** Se incrementa al tocar "Reintentar" para volver a pedir la misma página. */
  const [intento, setIntento] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [hayError, setHayError] = useState(false);

  useEffect(() => {
    // Si el usuario sale de la pantalla antes de que llegue la respuesta, se descarta
    let vigente = true;
    setCargando(true);
    setHayError(false);

    obtenerMiHistorial(paginaPedida)
      .then((historial) => {
        if (!vigente) return;
        setActividades((anteriores) => [...anteriores, ...historial.actividades]);
        setPaginaCargada(historial.pagina);
        setHayMas(historial.hayMas);
      })
      .catch(() => {
        if (vigente) setHayError(true); // CU04 ER1
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [paginaPedida, intento]);

  /** RNF-10: vuelve a pedir la página que falló; las ya cargadas no se piden de nuevo ni se duplican. */
  function reintentar() {
    setIntento((anterior) => anterior + 1);
  }

  const sinActividades = !cargando && !hayError && actividades.length === 0;

  return (
    <section className="tarjeta historial" aria-labelledby="titulo-historial">
      <h2 id="titulo-historial">Actividades en las que participé</h2>

      {sinActividades && <p className="texto-suave">Todavía no tenés actividades archivadas o canceladas.</p>}

      {actividades.length > 0 && (
        <ul className="historial__lista">
          {actividades.map((actividad) => (
            <li key={actividad.id} className="historial__item">
              <div>
                <p className="historial__nombre">{actividad.nombre}</p>
                <p className="texto-suave">
                  {actividad.deporte} · {formatearFecha(actividad.fechaHoraInicio)}
                </p>
              </div>
              <span className={`etiqueta etiqueta--${actividad.estado}`}>{ETIQUETA_ESTADO[actividad.estado]}</span>
            </li>
          ))}
        </ul>
      )}

      {cargando && <p className="texto-suave">Cargando actividades…</p>}

      {hayError && (
        <div className="aviso-error historial__error" role="alert">
          <span>{MENSAJE_FALLA_HISTORIAL}</span>
          <button type="button" className="boton-secundario" onClick={reintentar}>
            Reintentar
          </button>
        </div>
      )}

      {hayMas && !cargando && !hayError && (
        <button type="button" className="boton-secundario" onClick={() => setPaginaPedida(paginaCargada + 1)}>
          Ver más
        </button>
      )}
    </section>
  );
}
