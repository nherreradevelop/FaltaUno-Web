import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { listarDepartamentos } from '../api/actividades';
import { listarDeportes } from '../api/deportes';
import type { Deporte, FiltrosDeBusqueda, UbicacionDelUsuario } from '../api/tipos';
import { FILTROS_INICIALES } from '../comun/filtrosDeSesion';
import { useFiltrosDeSesion } from '../sesion/useFiltrosDeSesion';
import { obtenerUbicacion } from '../comun/ubicacion';
import { FiltrosDeActividades, type ErroresDeFiltros } from '../componentes/FiltrosDeActividades';
import { EsqueletoDeActividades } from '../componentes/EsqueletoDeActividades';
import { ResultadosDeBusqueda } from '../componentes/ResultadosDeBusqueda';
import { BannerActividadesHoy } from '../componentes/BannerActividadesHoy';
import { terminoLaPrimeraCarga, useActividadesPorGrupo, type ResultadoDeGrupo } from '../comun/useActividadesPorGrupo';
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
          <EsqueletoDeActividades />
        ) : (
          <SeccionesDelDashboard filtrosAplicados={filtrosAplicados} ubicacion={ubicacion} />
        )}
      </section>
    </main>
  );
}

/** Una sección propia (organizando, unido) solo se muestra si tiene actividades, o un error para reintentar. */
function tieneQueMostrarse(resultado: ResultadoDeGrupo): boolean {
  return resultado.actividades.length > 0 || resultado.error !== null;
}

/**
 * CU08: las tres secciones del dashboard. Hasta que respondan las dos propias se muestra un esqueleto,
 * así no aparecen después y empujan hacia abajo la lista que el usuario ya estaba mirando.
 */
function SeccionesDelDashboard({
  filtrosAplicados,
  ubicacion,
}: {
  filtrosAplicados: FiltrosDeBusqueda | null;
  ubicacion: UbicacionDelUsuario | null;
}) {
  const organizando = useActividadesPorGrupo('gestionando', FILTROS_INICIALES, ubicacion);
  const unido = useActividadesPorGrupo('unido', FILTROS_INICIALES, ubicacion);
  const otras = useActividadesPorGrupo('otras', filtrosAplicados, ubicacion);

  const propiasListas = terminoLaPrimeraCarga(organizando) && terminoLaPrimeraCarga(unido);
  if (!propiasListas) {
    return <EsqueletoDeActividades cantidad={3} />;
  }

  return (
    <>
      {otras.hayIniciadasHoy && <BannerActividadesHoy />}
      {tieneQueMostrarse(organizando) && (
        <ResultadosDeBusqueda id="organizando" titulo="Actividades que estás organizando" resultado={organizando} />
      )}
      {tieneQueMostrarse(unido) && <ResultadosDeBusqueda id="unido" titulo="Actividades a las que te uniste" resultado={unido} />}
      <ResultadosDeBusqueda id="otras" titulo="Actividades que podrían interesarte" resultado={otras} sugerirCrear />
    </>
  );
}
