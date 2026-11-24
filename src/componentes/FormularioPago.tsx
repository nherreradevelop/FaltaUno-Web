import { useState, type FormEvent } from 'react';
import type { Balance, PersonaGasto } from '../api/gastos';
import type { DatosPago, Pago } from '../api/pagos';
import { leerMontoGasto, nombrePersona } from '../comun/gastos';
import { maximoParaPago, montoEditablePago, validarMontoPago } from '../comun/pagos';
import { formatearMonto } from '../comun/formato';

interface Props {
  pago: Pago | null;
  balance: Balance | null;
  personas: PersonaGasto[];
  inicial?: DatosPago | null;
  bloqueado: boolean;
  puedeGuardar: boolean;
  campos: Record<string, string>;
  alGuardar: (datos: DatosPago) => void;
  alCancelar: () => void;
}
/** CU26 FP/A1/E1: monto sugerido, pago parcial y borrador conservado ante errores. */
export function FormularioPago({
  pago,
  balance,
  personas,
  inicial,
  bloqueado,
  puedeGuardar,
  campos,
  alGuardar,
  alCancelar,
}: Props) {
  const maximo = maximoParaPago(pago, balance);
  const [monto, setMonto] = useState(() => montoEditablePago(inicial?.montoCentesimos ?? pago?.montoCentesimos ?? maximo));
  const [enviado, setEnviado] = useState(false);
  const centesimos = leerMontoGasto(monto);
  const error = campos.montoCentesimos ?? (enviado ? validarMontoPago(centesimos, maximo) : null);
  const pagador = pago?.pagadorId ?? balance?.deudorId ?? inicial?.pagadorId ?? '';
  const receptor = pago?.receptorId ?? balance?.acreedorId ?? inicial?.receptorId ?? '';
  function confirmar(e: FormEvent) {
    e.preventDefault();
    setEnviado(true);
    if (!validarMontoPago(centesimos, maximo))
      alGuardar({ montoCentesimos: centesimos!, pagadorId: pagador, receptorId: receptor });
  }
  return (
    <form className="gastos__formulario" onSubmit={confirmar} noValidate>
      <h3>{pago ? 'Editar pago' : 'Registrar pago'}</h3>
      <p>
        {nombrePersona(personas, `p:${pagador}`)} pagó a {nombrePersona(personas, `p:${receptor}`)}
      </p>
      <p>
        Máximo permitido: <strong>{formatearMonto(maximo)}</strong>. Podés registrar un pago total o parcial.
      </p>
      <fieldset className="gastos__campos" disabled={bloqueado}>
        <label htmlFor="pago-monto">Monto pagado ($)</label>
        <input
          id="pago-monto"
          inputMode="decimal"
          value={monto}
          autoFocus
          aria-invalid={!!error}
          aria-describedby="pago-error-monto"
          onChange={(e) => setMonto(e.target.value)}
        />
        <span id="pago-error-monto" className="gastos__error" role={error ? 'alert' : undefined}>
          {error}
        </span>
      </fieldset>
      <div className="gastos__acciones">
        <button className="boton-secundario" type="button" disabled={bloqueado} onClick={alCancelar}>
          Cancelar
        </button>
        <button className="boton" type="submit" disabled={bloqueado || !puedeGuardar}>
          {pago ? 'Guardar cambios' : 'Registrar pago'}
        </button>
      </div>
    </form>
  );
}
