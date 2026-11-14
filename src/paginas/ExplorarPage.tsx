import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { listarDepartamentos } from '../api/actividades';
import { listarDeportes } from '../api/deportes';
import type { Deporte, FiltrosDeBusqueda, UbicacionDelUsuario } from '../api/tipos';
import { FILTROS_INICIALES } from '../comun/filtrosDeSesion';
import { useFiltrosDeSesion } from '../sesion/useFiltrosDeSesion';
import { obtenerUbicacion } from '../comun/ubicacion';
import { FiltrosDeActividades, type ErroresDeFiltros } from '../componentes/FiltrosDeActividades';
import { ResultadosDeBusqueda } from '../componentes/ResultadosDeBusqueda';
import { mensajeFallaDeFiltros } from './mensajesExplorar';

// Espera tras el último cambio de filtro antes de buscar, para no pedir una lista por cada tecla del campo numérico
const ESPERA_ANTES_DE_BUSCAR_MS = 350;

/** Validación de forma, para no llamar a la API con filtros que va a rechazar. */
function validarFiltros(filtros: FiltrosDeBusqueda): ErroresDeFiltros {
  const errores: ErroresDeFiltros = {};
  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
    errores.hasta = 'La fecha "hasta" no puede ser anterior a "desde".';
  }
  if (filtros.cupoMaximo !== null && (!Number.isInteger(filtros.cupoMaximo) || filtros.cupoMaximo < 1)) {
    errores.cupoMaximo = 'Ingresá un número entero mayor o igual a 1.';
  }
  return errores;
}

function hayErrores(errores: ErroresDeFiltros): boolean {
  return Object.keys(errores).length > 0;
}

interface OpcionesDeFiltros {
  deportes: Deporte[] | null;
  departamentos: string[] | null;
  /** CU08 ER2: nombres de los filtros que no se pudieron cargar. */
  fallaron: string[];
  reintentar: () => void;
}

/** CU08 ER2: carga las opciones de los filtros de deporte y departamento; si una falla, la otra se muestra igual. */
function useOpcionesDeFiltros(): OpcionesDeFiltros {
  const [deportes, setDeportes] = useState<Deporte[] | null>(null);
  const [departamentos, setDepartamentos] = useState<string[] | null>(null);
  const [fallaron, setFallaron] = useState<string[]>([]);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    Promise.allSettled([listarDeportes(), listarDepartamentos()]).then(([resultadoDeportes, resultadoDepartamentos]) => {
      if (!vigente) return;
      const filtrosQueFallaron: string[] = [];
      if (resultadoDeportes.status === 'fulfilled') setDeportes(resultadoDeportes.value);
      else filtrosQueFallaron.push('deporte');
      if (resultadoDepartamentos.status === 'fulfilled') setDepartamentos(resultadoDepartamentos.value);
      else filtrosQueFallaron.push('departamento');
      setFallaron(filtrosQueFallaron);
    });
    return () => {
      vigente = false;
    };
  }, [intento]);

  return { deportes, departamentos, fallaron, reintentar: () => setIntento((anterior) => anterior + 1) };
}

/**
 * W02 – CU08 Buscar actividades (Explorar). Es la pantalla principal con sesión.
 * Al entrar se pide la ubicación del navegador una sola vez; sin permiso, se ordena solo por fecha (RN1).
 * También muestra el aviso con el que vuelve otra pantalla (CU09 E2: la actividad no está disponible).
 */
export function ExplorarPage() {
  const location = useLocation();
  const aviso = (location.state as { aviso?: string } | null)?.aviso;
  const opciones = useOpcionesDeFiltros();
  const { filtros: filtrosAplicados, aplicar, error: errorFiltros, reintentar: reintentarFiltros } = useFiltrosDeSesion();
  const [edicion, setFiltros] = useState<FiltrosDeBusqueda | null>(null);
  const filtros = edicion ?? filtrosAplicados;
  /** undefined: todavía se está pidiendo; null: sin permiso o no disponible. */
  const [ubicacion, setUbicacion] = useState<UbicacionDelUsuario | null | undefined>(undefined);

  useEffect(() => {
    let vigente = true;
    obtenerUbicacion().then((ubicacionObtenida) => {
      if (vigente) setUbicacion(ubicacionObtenida);
    });
    return () => {
      vigente = false;
    };
  }, []);

  const errores = filtros ? validarFiltros(filtros) : {};

  useEffect(() => {
    if (
      !filtros ||
      !filtrosAplicados ||
      hayErrores(validarFiltros(filtros)) ||
      JSON.stringify(filtros) === JSON.stringify(filtrosAplicados)
    )
      return;
    const temporizador = setTimeout(() => aplicar(filtros), ESPERA_ANTES_DE_BUSCAR_MS);
    return () => clearTimeout(temporizador);
  }, [filtros, filtrosAplicados, aplicar]);

  const orden = ubicacion ? 'Ordenadas por fecha y cercanía' : 'Ordenadas por fecha';

  return (
    <main className="explorar">
      {filtros ? (
        <FiltrosDeActividades
          filtros={filtros}
          errores={errores}
          deportes={opciones.deportes}
          departamentos={opciones.departamentos}
          alCambiar={setFiltros}
          alLimpiar={() => setFiltros(FILTROS_INICIALES)}
        />
      ) : (
        <p className="texto-suave">Cargando tus filtros…</p>
      )}

      <section className="explorar__contenido" aria-labelledby="titulo-explorar">
        <div className="explorar__titulo">
          <h1 id="titulo-explorar">Explorar actividades</h1>
          {ubicacion !== undefined && <p className="texto-suave">{orden}</p>}
        </div>

        {aviso && (
          <p className="aviso-info" role="alert">
            {aviso}
          </p>
        )}

        {errorFiltros && (
          <div className="aviso-error resultados__error" role="alert">
            <span>{errorFiltros}</span>
            <button type="button" className="boton-secundario" onClick={reintentarFiltros}>
              Reintentar
            </button>
          </div>
        )}
        <p className="texto-suave">Los filtros se aplican solo a las actividades que podrían interesarte.</p>

        {/* ER2 */}
        {opciones.fallaron.length > 0 && (
          <div className="aviso-error resultados__error" role="alert">
            <span>{mensajeFallaDeFiltros(opciones.fallaron)}</span>
            <button type="button" className="boton-secundario" onClick={opciones.reintentar}>
              Reintentar
            </button>
          </div>
        )}

        {ubicacion === undefined ? (
          <p className="texto-suave">Cargando actividades…</p>
        ) : (
          <>
            <section className="resultados" aria-labelledby="titulo-gestionando">
              <h2 id="titulo-gestionando">Actividades que estoy gestionando</h2>
              <ResultadosDeBusqueda grupo="gestionando" filtros={FILTROS_INICIALES} ubicacion={ubicacion} />
            </section>
            <section className="resultados" aria-labelledby="titulo-unido">
              <h2 id="titulo-unido">Actividades a las que estoy unido</h2>
              <ResultadosDeBusqueda grupo="unido" filtros={FILTROS_INICIALES} ubicacion={ubicacion} />
            </section>
            <section className="resultados" aria-labelledby="titulo-otras">
              <h2 id="titulo-otras">Actividades que podrían interesarte</h2>
              {filtrosAplicados && <ResultadosDeBusqueda grupo="otras" filtros={filtrosAplicados} ubicacion={ubicacion} />}
            </section>
          </>
        )}
      </section>
    </main>
  );
}
