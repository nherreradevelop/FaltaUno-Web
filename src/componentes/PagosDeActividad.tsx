import { obtenerPago } from '../api/pagos';
import { ErrorApi } from '../api/cliente';
import { useEffect, useState } from 'react';
import type { Balance, PersonaGasto } from '../api/gastos';
import type { Pago } from '../api/pagos';
import { nombrePersona } from '../comun/gastos';
import { formatearMonto, formatearFechaHora } from '../comun/formato';
import { usePagos } from '../hooks/usePagos';
import { FormularioPago } from './FormularioPago';
import { DialogoDeConfirmacion } from './DialogoDeConfirmacion';

/** CU26: reutiliza los balances ya obtenidos por Gastos; actualiza ambos después de confirmar. */
export function PagosDeActividad({
  actividadId,
  balances,
  personas,
  alCambiar,
}: {
  actividadId: string;
  balances: Balance[];
  personas: PersonaGasto[];
  alCambiar: () => Promise<void>;
}) {
  const modelo = usePagos(actividadId);
  const [pago, setPago] = useState<Pago | null>(modelo.pendiente?.pago ?? null);
  const [balance, setBalance] = useState<Balance | null>(
    () =>
      balances.find(
        (b) => b.deudorId === modelo.pendiente?.datos?.pagadorId && b.acreedorId === modelo.pendiente?.datos?.receptorId,
      ) ?? null,
  );
  const [formulario, setFormulario] = useState(!!modelo.pendiente && modelo.pendiente.accion !== 'eliminar');
  const [confirmar, setConfirmar] = useState(false);
  const bloqueado = modelo.ocupado || !!modelo.pendiente;
  const detalleId = pago?.id;
  useEffect(() => {
    // La lectura sigue los cambios; un borrador o una confirmación conserva su versión para revisar conflictos.
    if (!detalleId || formulario || confirmar || modelo.pendiente || modelo.ocupado) return;
    let vigente = true;
    obtenerPago(actividadId, detalleId)
      .then((actual) => {
        if (vigente) setPago(actual);
      })
      .catch((error: unknown) => {
        if (vigente && error instanceof ErrorApi && [404, 410].includes(error.estado)) setPago(null);
      });
    return () => {
      vigente = false;
    };
  }, [actividadId, detalleId, formulario, confirmar, modelo.pendiente, modelo.ocupado, modelo.pagos]);

  async function terminar(ok: boolean) {
    if (!ok) {
      await alCambiar();
      return;
    }
    setPago(null);
    setBalance(null);
    setFormulario(false);
    await alCambiar();
  }
  async function revisar(id: string) {
    const actual = await modelo.revisar(id);
    setPago(actual);
    if (!actual) setFormulario(false);
  }
  return (
    <section className="gastos__balances" aria-label="Pagos y balances" aria-busy={modelo.ocupado}>
      <h3>Balances vigentes</h3>
      {!balances.length && <p>No hay deudas pendientes.</p>}
      <ul>
        {balances.map((b) => (
          <li key={`${b.deudorId}:${b.acreedorId}`}>
            <span>
              {nombrePersona(personas, `p:${b.deudorId}`)} debe a {nombrePersona(personas, `p:${b.acreedorId}`)}
            </span>
            <strong>{formatearMonto(b.montoCentesimos)}</strong>
            {modelo.opciones?.puedeEscribir && [b.deudorId, b.acreedorId].includes(modelo.opciones.participacionActualId) && (
              <button
                className="boton-secundario"
                disabled={bloqueado || formulario || !!pago}
                onClick={() => {
                  setBalance(b);
                  setPago(null);
                  setFormulario(true);
                }}
              >
                Registrar pago
              </button>
            )}
          </li>
        ))}
      </ul>
      {modelo.aviso && (
        <p role="status" className="aviso-info">
          {modelo.aviso}
        </p>
      )}
      {modelo.error && (
        <p role="alert" className="aviso-error">
          {modelo.error}
        </p>
      )}
      {modelo.opciones?.motivo && <p className="aviso-info aviso-advertencia">{modelo.opciones.motivo}</p>}
      {modelo.pendiente && (
        <div className="aviso-info">
          <p>Operación pendiente de verificación.</p>
          <button className="boton-secundario" disabled={modelo.ocupado} onClick={() => void modelo.verificar().then(terminar)}>
            Verificar resultado
          </button>
          {modelo.puedeReintentar && (
            <button
              className="boton-secundario"
              disabled={modelo.ocupado}
              onClick={() => void modelo.reintentar().then(terminar)}
            >
              Reenviar mismo intento
            </button>
          )}
        </div>
      )}
      {!modelo.pendiente && (
        <button
          className="boton-secundario"
          disabled={bloqueado}
          onClick={() => {
            void modelo.recargar();
            void alCambiar();
          }}
        >
          Actualizar pagos y balances
        </button>
      )}
      {['PAGO_MODIFICADO', 'MONTO_PAGO_INVALIDO'].includes(modelo.codigo) && pago && (
        <div className="aviso-info">
          <p>Conservamos tu edición. Revisá la versión actual antes de confirmar nuevamente.</p>
          <button className="boton-secundario" disabled={bloqueado} onClick={() => void revisar(pago.id)}>
            Cargar versión actual
          </button>
        </div>
      )}
      {formulario && (
        <FormularioPago
          key={`${pago?.id ?? `${balance?.deudorId}:${balance?.acreedorId}`}:${pago?.version ?? 0}`}
          pago={pago}
          balance={
            balance
              ? (balances.find((b) => b.deudorId === balance.deudorId && b.acreedorId === balance.acreedorId) ?? {
                  ...balance,
                  montoCentesimos: 0,
                })
              : null
          }
          personas={personas}
          inicial={modelo.pendiente?.datos}
          bloqueado={bloqueado}
          puedeGuardar={!!modelo.opciones?.puedeEscribir}
          campos={modelo.campos}
          alCancelar={() => setFormulario(false)}
          alGuardar={(datos) => void modelo.enviar(pago ? 'editar' : 'registrar', datos, pago).then(terminar)}
        />
      )}
      {pago && !formulario && (
        <article className="gastos__detalle">
          <h4>Detalle del pago</h4>
          <p>
            {nombrePersona(personas, `p:${pago.pagadorId}`)} pagó a {nombrePersona(personas, `p:${pago.receptorId}`)}
          </p>
          <strong>{formatearMonto(pago.montoCentesimos)}</strong>
          <p>{formatearFechaHora(pago.fechaRegistro)}</p>
          <div className="gastos__acciones">
            <button className="boton-secundario" disabled={bloqueado} onClick={() => setPago(null)}>
              Volver a pagos
            </button>
            {modelo.opciones?.puedeEscribir && pago.registradoPorId === modelo.opciones.participacionActualId && (
              <>
                <button className="boton-secundario" disabled={bloqueado} onClick={() => setFormulario(true)}>
                  Editar pago
                </button>
                <button
                  className="boton-secundario boton-secundario--peligro"
                  disabled={bloqueado}
                  onClick={() => setConfirmar(true)}
                >
                  Eliminar pago
                </button>
              </>
            )}
          </div>
        </article>
      )}
      {!pago && !formulario && (
        <>
          <h3>Mis pagos</h3>
          <p className="texto-suave">
            Solo vos y la otra parte pueden consultar cada pago. El historial se conserva seis meses desde el archivo de la
            actividad.
          </p>
          {modelo.cargando && <p role="status">Cargando pagos…</p>}
          {modelo.opciones?.historialVencido && (
            <p className="aviso-info aviso-advertencia">Venció el plazo de conservación del historial de pagos.</p>
          )}
          {modelo.opciones?.historialHasta && !modelo.opciones.historialVencido && (
            <p>Disponible hasta {formatearFechaHora(modelo.opciones.historialHasta)}.</p>
          )}
          {!modelo.cargando && !modelo.pagos.length && !modelo.opciones?.historialVencido && (
            <p>Todavía no tenés pagos registrados.</p>
          )}
          <ul className="gastos__lista">
            {modelo.pagos.map((p) => (
              <li key={p.id}>
                <button className="gastos__fila" disabled={bloqueado} onClick={() => void revisar(p.id)}>
                  <span>
                    <strong>
                      {nombrePersona(personas, `p:${p.pagadorId}`)} → {nombrePersona(personas, `p:${p.receptorId}`)}
                    </strong>
                    <small>{formatearFechaHora(p.fechaRegistro)}</small>
                  </span>
                  <strong>{formatearMonto(p.montoCentesimos)}</strong>
                </button>
              </li>
            ))}
          </ul>
          {modelo.hayMas && (
            <button className="boton-secundario" disabled={bloqueado} onClick={() => void modelo.verMas()}>
              Ver más pagos
            </button>
          )}
        </>
      )}
      <DialogoDeConfirmacion
        abierto={confirmar && !bloqueado}
        titulo={
          pago
            ? `¿Eliminar el pago de ${nombrePersona(personas, `p:${pago.pagadorId}`)} a ${nombrePersona(personas, `p:${pago.receptorId}`)} por ${formatearMonto(pago.montoCentesimos)}? Esto actualizará los balances.`
            : ''
        }
        textoConfirmar="Eliminar pago"
        alCancelar={() => setConfirmar(false)}
        alConfirmar={() => {
          setConfirmar(false);
          if (pago) void modelo.enviar('eliminar', null, pago).then(terminar);
        }}
      />
    </section>
  );
}
