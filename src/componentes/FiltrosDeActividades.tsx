import type { Deporte, FiltrosDeBusqueda, FranjaHoraria, NivelActividad } from '../api/tipos';
import { ETIQUETA_FRANJA, ETIQUETA_NIVEL } from '../paginas/mensajesExplorar';

const NIVELES: NivelActividad[] = ['principiante', 'intermedio', 'avanzado'];
const FRANJAS: FranjaHoraria[] = ['manana', 'tarde', 'noche'];

export interface ErroresDeFiltros {
  hasta?: string;
  cupoMaximo?: string;
}

interface PropsFiltros {
  filtros: FiltrosDeBusqueda;
  errores: ErroresDeFiltros;
  /** null: las opciones no se pudieron cargar (CU08 ER2) o todavía se están cargando. */
  deportes: Deporte[] | null;
  departamentos: string[] | null;
  alCambiar: (filtros: FiltrosDeBusqueda) => void;
  alLimpiar: () => void;
}

/** Agrega el valor si no estaba o lo quita si estaba (filtros con varios valores, CU08 RN5). */
function alternar<T>(lista: T[], valor: T): T[] {
  return lista.includes(valor) ? lista.filter((elemento) => elemento !== valor) : [...lista, valor];
}

/** "" → null (sin filtro). Cualquier otro texto se convierte en número y se valida en la página. */
function aCupoMaximo(texto: string): number | null {
  return texto === '' ? null : Number(texto);
}

/** CU08 A1 a A6: sección de filtros (mockup W02). Cada cambio se informa a la página, que actualiza la lista. */
export function FiltrosDeActividades({ filtros, errores, deportes, departamentos, alCambiar, alLimpiar }: PropsFiltros) {
  function cambiar(cambios: Partial<FiltrosDeBusqueda>) {
    alCambiar({ ...filtros, ...cambios });
  }

  return (
    <aside className="tarjeta filtros" aria-labelledby="titulo-filtros">
      <div className="filtros__encabezado">
        <h2 id="titulo-filtros">Filtros</h2>
        <button type="button" className="boton-enlace" onClick={alLimpiar}>
          Restablecer
        </button>
      </div>

      {/* A1 */}
      {deportes && (
        <fieldset className="filtros__grupo">
          <legend>Deporte</legend>
          {deportes.map((deporte) => (
            <label key={deporte.id} className="opcion">
              <input
                type="checkbox"
                checked={filtros.deportes.includes(deporte.id)}
                onChange={() => cambiar({ deportes: alternar(filtros.deportes, deporte.id) })}
              />
              {deporte.nombre}
            </label>
          ))}
        </fieldset>
      )}

      {/* A2 */}
      <fieldset className="filtros__grupo">
        <legend>Entre fechas</legend>
        <div className="filtros__fechas">
          <label className="filtros__fecha">
            <span>Desde</span>
            <input type="date" value={filtros.desde} onChange={(evento) => cambiar({ desde: evento.target.value })} />
          </label>
          <label className="filtros__fecha">
            <span>Hasta</span>
            <input
              type="date"
              value={filtros.hasta}
              min={filtros.desde || undefined}
              aria-invalid={errores.hasta ? true : undefined}
              aria-describedby={errores.hasta ? 'error-hasta' : undefined}
              onChange={(evento) => cambiar({ hasta: evento.target.value })}
            />
          </label>
        </div>
        {errores.hasta && (
          <p id="error-hasta" className="campo__error">
            {errores.hasta}
          </p>
        )}
      </fieldset>

      {/* A4 */}
      <fieldset className="filtros__grupo">
        <legend>Franja horaria</legend>
        <div className="filtros__chips">
          {FRANJAS.map((franja) => (
            <button
              key={franja}
              type="button"
              className="chip"
              aria-pressed={filtros.franjas.includes(franja)}
              onClick={() => cambiar({ franjas: alternar(filtros.franjas, franja) })}
            >
              {ETIQUETA_FRANJA[franja]}
            </button>
          ))}
        </div>
      </fieldset>

      {/* A5 */}
      {departamentos && (
        <fieldset className="filtros__grupo">
          <legend>Departamento</legend>
          <div className="filtros__departamentos">
            {departamentos.map((departamento) => (
              <label key={departamento} className="opcion">
                <input
                  type="checkbox"
                  checked={filtros.departamentos.includes(departamento)}
                  onChange={() => cambiar({ departamentos: alternar(filtros.departamentos, departamento) })}
                />
                {departamento}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* A6 */}
      <fieldset className="filtros__grupo">
        <legend>Nivel</legend>
        {NIVELES.map((nivel) => (
          <label key={nivel} className="opcion">
            <input
              type="checkbox"
              checked={filtros.niveles.includes(nivel)}
              onChange={() => cambiar({ niveles: alternar(filtros.niveles, nivel) })}
            />
            {ETIQUETA_NIVEL[nivel]}
          </label>
        ))}
      </fieldset>

      {/* A3 */}
      <div className="filtros__grupo campo">
        <label htmlFor="cupo-maximo">Máximo de personas</label>
        <input
          id="cupo-maximo"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          placeholder="Sin límite"
          value={filtros.cupoMaximo ?? ''}
          aria-invalid={errores.cupoMaximo ? true : undefined}
          aria-describedby={errores.cupoMaximo ? 'error-cupo-maximo' : undefined}
          onChange={(evento) => cambiar({ cupoMaximo: aCupoMaximo(evento.target.value) })}
        />
        {errores.cupoMaximo && (
          <p id="error-cupo-maximo" className="campo__error">
            {errores.cupoMaximo}
          </p>
        )}
      </div>
    </aside>
  );
}
