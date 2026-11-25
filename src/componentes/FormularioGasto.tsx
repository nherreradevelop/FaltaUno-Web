import { useState, type FormEvent } from 'react';
import type { DatosGasto, Gasto, PersonaGasto } from '../api/gastos';
import {
  datosDelFormulario,
  formularioDeGasto,
  leerMontoGasto,
  nombrePersona,
  previsualizarReparto,
  validarFormularioGasto,
} from '../comun/gastos';
import { formatearMonto } from '../comun/formato';

interface Props {
  gasto: Gasto | null;
  personas: PersonaGasto[];
  inicial?: DatosGasto | null;
  bloqueado: boolean;
  puedeGuardar: boolean;
  campos: Record<string, string>;
  alGuardar: (datos: DatosGasto) => void;
  alCancelar: () => void;
}

/** CU23 y CU24: conserva el borrador ante errores; el reparto mostrado se vuelve a validar en la API. */
export function FormularioGasto({ gasto, personas, inicial, bloqueado, puedeGuardar, campos, alGuardar, alCancelar }: Props) {
  const [formulario, setFormulario] = useState(() =>
    inicial
      ? { ...inicial, monto: formularioDeGasto({ montoCentesimos: inicial.montoCentesimos } as Gasto).monto }
      : formularioDeGasto(gasto),
  );
  const [tocados, setTocados] = useState<Record<string, boolean>>({});
  const [enviado, setEnviado] = useState(false);
  const errores = validarFormularioGasto(formulario);
  const error = (campo: string) => campos[campo] ?? (enviado || tocados[campo] ? errores[campo] : undefined);
  const reparto = previsualizarReparto(leerMontoGasto(formulario.monto), formulario.participantes, personas);
  function confirmar(evento: FormEvent) {
    evento.preventDefault();
    setEnviado(true);
    if (!Object.keys(errores).length) alGuardar(datosDelFormulario(formulario));
  }
  function seleccionar(id: string) {
    setFormulario((actual) => ({
      ...actual,
      participantes: actual.participantes.includes(id)
        ? actual.participantes.filter((p) => p !== id)
        : [...actual.participantes, id],
    }));
    setTocados((actual) => ({ ...actual, participantes: true }));
  }
  return (
    <form className="gastos__formulario" onSubmit={confirmar} noValidate>
      <h3>{gasto ? 'Editar gasto' : 'Registrar gasto'}</h3>
      <fieldset disabled={bloqueado} className="gastos__campos">
        <label htmlFor="gasto-concepto">Concepto</label>
        <input
          id="gasto-concepto"
          value={formulario.concepto}
          maxLength={150}
          aria-invalid={!!error('concepto')}
          aria-describedby="gasto-error-concepto"
          onBlur={() => setTocados((t) => ({ ...t, concepto: true }))}
          onChange={(e) => setFormulario({ ...formulario, concepto: e.target.value })}
        />
        <span id="gasto-error-concepto" className="gastos__error">
          {error('concepto')}
        </span>
        <label htmlFor="gasto-monto">Monto total ($)</label>
        <input
          id="gasto-monto"
          inputMode="decimal"
          value={formulario.monto}
          aria-invalid={!!error('montoCentesimos')}
          aria-describedby="gasto-error-monto"
          onBlur={() => setTocados((t) => ({ ...t, montoCentesimos: true }))}
          onChange={(e) => setFormulario({ ...formulario, monto: e.target.value })}
        />
        <span id="gasto-error-monto" className="gastos__error">
          {error('montoCentesimos')}
        </span>
        <label htmlFor="gasto-pagador">Quién realizó el pago</label>
        <select
          id="gasto-pagador"
          value={formulario.pagadorId}
          aria-invalid={!!error('pagadorId')}
          aria-describedby="gasto-error-pagador"
          onBlur={() => setTocados((t) => ({ ...t, pagadorId: true }))}
          onChange={(e) => setFormulario({ ...formulario, pagadorId: e.target.value })}
        >
          <option value="">Seleccionar persona</option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {nombrePersona(personas, p.id)}
            </option>
          ))}
        </select>
        <span id="gasto-error-pagador" className="gastos__error">
          {error('pagadorId')}
        </span>
        <fieldset className="gastos__seleccion" aria-describedby="gasto-error-participantes">
          <legend>Entre quiénes se divide</legend>
          {personas.map((p) => (
            <label key={p.id} className="gastos__persona">
              <input type="checkbox" checked={formulario.participantes.includes(p.id)} onChange={() => seleccionar(p.id)} />
              {nombrePersona(personas, p.id)}
            </label>
          ))}
        </fieldset>
        <span id="gasto-error-participantes" className="gastos__error">
          {error('participantes')}
        </span>
        {reparto.length > 0 && (
          <div className="gastos__reparto">
            <h4>Reparto en partes iguales</h4>
            <p className="texto-suave">
              Los centésimos sobrantes se distribuyen por identificador. La suma coincide con el total.
            </p>
            <ul>
              {reparto.map((p) => (
                <li key={p.personaId}>
                  <span>{nombrePersona(personas, p.personaId)}</span>
                  <strong>{formatearMonto(p.montoCentesimos)}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
      </fieldset>
      <div className="gastos__acciones">
        <button type="button" className="boton-secundario" disabled={bloqueado} onClick={alCancelar}>
          Cancelar
        </button>
        <button type="submit" className="boton" disabled={bloqueado || !puedeGuardar}>
          {gasto ? 'Guardar cambios' : 'Registrar gasto'}
        </button>
      </div>
    </form>
  );
}
