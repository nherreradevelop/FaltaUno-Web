import { obtenerGasto } from '../api/gastos';
import { ErrorApi } from '../api/cliente';
import { PagosDeActividad } from './PagosDeActividad';
import { useEffect, useState } from 'react';
import type { Gasto } from '../api/gastos';
import { nombrePersona } from '../comun/gastos';
import { formatearFechaHora, formatearMonto } from '../comun/formato';
import { useGastos } from '../hooks/useGastos';
import { FormularioGasto } from './FormularioGasto';
import { DialogoDeConfirmacion } from './DialogoDeConfirmacion';

/** CU23–CU25, alcance aprobado de gastos. Pagos de CU26 integrados desde balances; pendiente el resto de CU34. */
export function GastosDeActividad({ actividadId }: { actividadId: string }) {
  const modelo = useGastos(actividadId);
  const [seleccionado, setSeleccionado] = useState<Gasto | null>(modelo.pendiente?.gasto ?? null);
  const [formulario, setFormulario] = useState(!!modelo.pendiente && modelo.pendiente.accion !== 'eliminar');
  const [confirmar, setConfirmar] = useState(false);
  const personas = modelo.opciones?.personas ?? [];
  const bloqueado = modelo.ocupado || modelo.pendiente !== null;
  const detalleId = seleccionado?.id;
  useEffect(() => {
    // La lectura sigue los cambios; un borrador o una confirmación conserva su versión para revisar conflictos.
    if (!detalleId || formulario || confirmar || modelo.pendiente || modelo.ocupado) return;
    let vigente = true;
    obtenerGasto(actividadId, detalleId)
      .then((actual) => {
        if (vigente) setSeleccionado(actual);
      })
      .catch((error: unknown) => {
        if (vigente && error instanceof ErrorApi && [404, 410].includes(error.estado)) setSeleccionado(null);
      });
    return () => {
      vigente = false;
    };
  }, [actividadId, detalleId, formulario, confirmar, modelo.pendiente, modelo.ocupado, modelo.gastos]);

  const puedeEditar =
    seleccionado && modelo.opciones?.puedeEscribir && seleccionado.registradoPorId === modelo.opciones.participacionActualId;
  function terminar(ok: boolean) {
    if (ok) {
      setFormulario(false);
      setSeleccionado(null);
    }
  }
  async function revisar() {
    if (!seleccionado) return;
    const actual = await modelo.revisar(seleccionado.id);
    setSeleccionado(actual);
    if (!actual) setFormulario(false);
  }
  return (
    <section className="gastos" aria-label="Gastos de la actividad" aria-busy={modelo.ocupado}>
      <div className="gastos__cabecera">
        <div>
          <h2>Gastos de la actividad</h2>
          <p className="texto-suave">Cada gasto y su reparto actualizan los balances juntos.</p>
        </div>
        {!seleccionado && !formulario && modelo.opciones?.puedeEscribir && (
          <button className="boton" disabled={bloqueado} onClick={() => setFormulario(true)}>
            Registrar gasto
          </button>
        )}
      </div>
      {modelo.aviso && (
        <p role="status" className="aviso-info">
          {modelo.aviso}
        </p>
      )}
      {modelo.error && (
        <div role="alert" className="aviso-error">
          <p>{modelo.error}</p>
          {modelo.pendiente ? (
            <div className="gastos__acciones">
              <button
                className="boton-secundario"
                disabled={modelo.ocupado}
                onClick={() => void modelo.verificar().then(terminar)}
              >
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
          ) : (
            <button className="boton-secundario" disabled={modelo.ocupado} onClick={() => void modelo.recargar()}>
              Actualizar lista y balances
            </button>
          )}
        </div>
      )}
      {modelo.pendiente && !modelo.error && (
        <div className="aviso-info" role="status">
          Operación pendiente de verificación.{' '}
          <button className="boton-secundario" disabled={modelo.ocupado} onClick={() => void modelo.verificar().then(terminar)}>
            Verificar resultado
          </button>
        </div>
      )}
      {modelo.opciones?.motivo && <p className="aviso-info">{modelo.opciones.motivo}</p>}
      {modelo.codigo === 'GASTO_MODIFICADO' && seleccionado && (
        <div className="aviso-info">
          <p>
            Conservamos tu edición. Cargá y revisá la versión actual antes de aplicar nuevamente los cambios o confirmar una
            eliminación.
          </p>
          <button className="boton-secundario" onClick={() => void revisar()}>
            Cargar versión actual
          </button>
        </div>
      )}
      {modelo.cargando && !modelo.opciones && (
        <div role="status" aria-label="Cargando gastos" className="gastos__esqueleto">
          <div />
          <div />
          <div />
        </div>
      )}
      {formulario && modelo.opciones && (
        <FormularioGasto
          key={`${seleccionado?.id ?? 'nuevo'}:${seleccionado?.version ?? 0}`}
          gasto={seleccionado}
          personas={personas}
          inicial={modelo.pendiente?.datos}
          bloqueado={bloqueado}
          puedeGuardar={modelo.opciones.puedeEscribir}
          campos={modelo.campos}
          alCancelar={() => setFormulario(false)}
          alGuardar={(datos) => void modelo.enviar(seleccionado ? 'editar' : 'registrar', datos, seleccionado).then(terminar)}
        />
      )}
      {!formulario && seleccionado && (
        <article className="gastos__detalle">
          <h3>{seleccionado.concepto}</h3>
          <strong className="gastos__monto">{formatearMonto(seleccionado.montoCentesimos)}</strong>
          <p>Pagó {nombrePersona(personas, seleccionado.pagadorId)}</p>
          <p className="texto-suave">{formatearFechaHora(seleccionado.fechaRegistro)}</p>
          <h4>Reparto</h4>
          <ul className="gastos__partes">
            {seleccionado.partes.map((p) => (
              <li key={p.personaId}>
                <span>{nombrePersona(personas, p.personaId)}</span>
                <strong>{formatearMonto(p.montoCentesimos)}</strong>
              </li>
            ))}
          </ul>
          <div className="gastos__acciones">
            <button className="boton-secundario" disabled={bloqueado} onClick={() => setSeleccionado(null)}>
              Volver a gastos
            </button>
            {puedeEditar && (
              <>
                <button className="boton-secundario" disabled={bloqueado} onClick={() => setFormulario(true)}>
                  Editar
                </button>
                <button
                  className="boton-secundario boton-secundario--peligro"
                  disabled={bloqueado}
                  onClick={() => setConfirmar(true)}
                >
                  Eliminar gasto
                </button>
              </>
            )}
          </div>
        </article>
      )}
      {!formulario && !seleccionado && modelo.opciones && (
        <>
          <ul className="gastos__lista">
            {modelo.gastos.map((gasto) => (
              <li key={gasto.id}>
                <button
                  className="gastos__fila"
                  disabled={bloqueado}
                  onClick={() => {
                    setSeleccionado(gasto);
                    void modelo.revisar(gasto.id).then(setSeleccionado);
                  }}
                >
                  <span>
                    <strong>{gasto.concepto}</strong>
                    <small>Pagó {nombrePersona(personas, gasto.pagadorId)}</small>
                  </span>
                  <strong>{formatearMonto(gasto.montoCentesimos)}</strong>
                </button>
              </li>
            ))}
          </ul>
          {!modelo.gastos.length && <p className="gastos__vacio">Todavía no hay gastos registrados en esta actividad.</p>}
          {modelo.hayMas && (
            <button className="boton-secundario" disabled={bloqueado} onClick={() => void modelo.verMas()}>
              Ver más gastos
            </button>
          )}
          <PagosDeActividad
            actividadId={actividadId}
            balances={modelo.balances}
            personas={personas}
            alCambiar={modelo.recargar}
          />
        </>
      )}
      <DialogoDeConfirmacion
        abierto={confirmar && !bloqueado}
        titulo={
          seleccionado
            ? `¿Eliminar “${seleccionado.concepto}” por ${formatearMonto(seleccionado.montoCentesimos)}, pagado por ${nombrePersona(personas, seleccionado.pagadorId)}? Esto actualizará los balances de la actividad.`
            : ''
        }
        textoConfirmar="Eliminar gasto"
        alCancelar={() => setConfirmar(false)}
        alConfirmar={() => {
          setConfirmar(false);
          if (seleccionado) void modelo.enviar('eliminar', null, seleccionado).then(terminar);
        }}
      />
    </section>
  );
}
