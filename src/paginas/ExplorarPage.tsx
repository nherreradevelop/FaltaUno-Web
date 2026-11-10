import { useEffect, useState } from 'react';
import { listarDepartamentos } from '../api/actividades';
import { listarDeportes } from '../api/deportes';
import type { Deporte, FiltrosDeBusqueda, Ubicacion } from '../api/tipos';
import { obtenerUbicacion } from '../comun/ubicacion';
import { FiltrosDeActividades, type ErroresDeFiltros } from '../componentes/FiltrosDeActividades';
import { ResultadosDeBusqueda } from '../componentes/ResultadosDeBusqueda';
import { mensajeFallaDeFiltros } from './mensajesExplorar';

const FILTROS_VACIOS: FiltrosDeBusqueda = {
  deportes: [],
  departamentos: [],
  niveles: [],
  franjas: [],
  desde: '',
  hasta: '',
  cupoMaximo: null,
};

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
 */
export function ExplorarPage() {
  const opciones = useOpcionesDeFiltros();
  const [filtros, setFiltros] = useState<FiltrosDeBusqueda>(FILTROS_VACIOS);
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosDeBusqueda>(FILTROS_VACIOS);
  /** undefined: todavía se está pidiendo; null: sin permiso o no disponible. */
  const [ubicacion, setUbicacion] = useState<Ubicacion | null | undefined>(undefined);

  useEffect(() => {
    let vigente = true;
    obtenerUbicacion().then((ubicacionObtenida) => {
      if (vigente) setUbicacion(ubicacionObtenida);
    });
    return () => {
      vigente = false;
    };
  }, []);

  const errores = validarFiltros(filtros);

  // A1 a A6: la lista se actualiza sola un momento después del último cambio, solo si los filtros son válidos
  useEffect(() => {
    if (hayErrores(validarFiltros(filtros))) {
      return;
    }
    // Si el contenido no cambió (por ejemplo, se marcó y desmarcó lo mismo), se conserva el objeto anterior y no se vuelve a buscar
    const aplicar = () =>
      setFiltrosAplicados((anteriores) => (JSON.stringify(anteriores) === JSON.stringify(filtros) ? anteriores : filtros));
    const temporizador = setTimeout(aplicar, ESPERA_ANTES_DE_BUSCAR_MS);
    return () => clearTimeout(temporizador);
  }, [filtros]);

  // La key hace que la lista arranque de cero desde la página 1 cada vez que se aplican filtros nuevos
  const claveDeFiltros = JSON.stringify(filtrosAplicados);
  const orden = ubicacion ? 'Ordenadas por fecha y cercanía' : 'Ordenadas por fecha';

  return (
    <main className="explorar">
      <FiltrosDeActividades
        filtros={filtros}
        errores={errores}
        deportes={opciones.deportes}
        departamentos={opciones.departamentos}
        alCambiar={setFiltros}
        alLimpiar={() => setFiltros(FILTROS_VACIOS)}
      />

      <section className="explorar__contenido" aria-labelledby="titulo-explorar">
        <div className="explorar__titulo">
          <h1 id="titulo-explorar">Actividades disponibles</h1>
          {ubicacion !== undefined && <p className="texto-suave">{orden}</p>}
        </div>

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
          <ResultadosDeBusqueda key={claveDeFiltros} filtros={filtrosAplicados} ubicacion={ubicacion} />
        )}
      </section>
    </main>
  );
}
