import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ErrorApi } from '../api/cliente';
import { unirseAActividad } from '../api/actividades';
import type { DetalleActividad } from '../api/tipos';
import {
  aDatosUnirse,
  AVISO_PUNTO_DE_PARTIDA,
  clasificarErrorAlUnirse,
  formularioUnirseInicial,
  lugaresParaInvitados,
  MENSAJE_UNIDO,
  textoLugaresParaInvitados,
  validarFormularioUnirse,
  type CamposConError,
  type FormularioUnirse as DatosDelFormulario,
} from '../comun/formularioUnirse';
import { Boton } from './Boton';
import { Campo } from './Campo';
import { SelectorUbicacion } from './SelectorUbicacion';

/** Cómo terminó el intento: se unió, o ya no es posible unirse (E1, E2, E3). */
export type ResultadoAlUnirse = { tipo: 'unido'; mensaje: string } | { tipo: 'sinLugar'; mensaje: string };

interface Props {
  actividad: DetalleActividad;
  abierto: boolean;
  /** CU11 A1: el usuario decide no continuar. */
  alCancelar: () => void;
  alTerminar: (resultado: ResultadoAlUnirse) => void;
}

/**
 * W – CU11 FP pasos 5 y 6: vehículo, punto de partida e invitados externos, en un <dialog> modal sobre el detalle.
 * Si el envío falla, el formulario queda abierto con lo que el usuario escribió.
 */
export function FormularioUnirse({ actividad, abierto, alCancelar, alTerminar }: Props) {
  const referencia = useRef<HTMLDialogElement>(null);
  const [formulario, setFormulario] = useState<DatosDelFormulario>(formularioUnirseInicial);
  const [campos, setCampos] = useState<CamposConError>({});
  const [falla, setFalla] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mapasDisponibles, setMapasDisponibles] = useState(true);
  const cuposLibres = actividad.cupoMaximo - actividad.cuposOcupados;

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  function cambiar<Campo extends keyof DatosDelFormulario>(campo: Campo, valor: DatosDelFormulario[Campo]) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function cambiarInvitado(indice: number, nombre: string) {
    cambiar(
      'invitados',
      formulario.invitados.map((actual, posicion) => (posicion === indice ? nombre : actual)),
    );
  }

  function quitarInvitado(indice: number) {
    cambiar(
      'invitados',
      formulario.invitados.filter((_, posicion) => posicion !== indice),
    );
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const camposConError = validarFormularioUnirse(formulario);
    setCampos(camposConError);
    setFalla('');
    if (Object.keys(camposConError).length > 0) return;

    setEnviando(true);
    try {
      await unirseAActividad(actividad.id, aDatosUnirse(formulario));
      alTerminar({ tipo: 'unido', mensaje: MENSAJE_UNIDO }); // FP paso 10
    } catch (error) {
      manejarError(error);
    } finally {
      setEnviando(false);
    }
  }

  function manejarError(error: unknown) {
    const resultado = clasificarErrorAlUnirse(error instanceof ErrorApi ? error : null);
    if (resultado.tipo === 'unido') alTerminar({ tipo: 'unido', mensaje: MENSAJE_UNIDO });
    if (resultado.tipo === 'sinLugar') alTerminar(resultado);
    if (resultado.tipo === 'campos') setCampos(resultado.campos);
    if (resultado.tipo === 'falla') setFalla(resultado.mensaje);
  }

  const puedeAgregarInvitado = lugaresParaInvitados(cuposLibres, formulario.invitados.length) > 0;

  return (
    <dialog
      ref={referencia}
      className="dialogo dialogo--formulario"
      aria-labelledby="unirse-titulo"
      onCancel={(evento) => {
        // Escape no cierra mientras se envía, para no perder la respuesta
        if (enviando) evento.preventDefault();
        else alCancelar();
      }}
    >
      <form className="unirse" onSubmit={enviar} noValidate>
        <h2 id="unirse-titulo" className="dialogo__titulo">
          Unirme a {actividad.nombre}
        </h2>

        <fieldset className="unirse__seccion" disabled={enviando}>
          <legend>Traslado</legend>
          <label className="actividad-check">
            <input
              type="checkbox"
              checked={formulario.tieneVehiculo}
              onChange={(evento) => cambiar('tieneVehiculo', evento.target.checked)}
            />
            Tengo vehículo propio
          </label>
          {formulario.tieneVehiculo && (
            <Campo
              id="unirse-lugares"
              etiqueta="Personas que puedo llevar al destino (incluyéndome a mí mismo)"
              type="number"
              inputMode="numeric"
              min={0}
              value={formulario.lugaresVehiculo}
              error={campos.lugaresVehiculo}
              onChange={(evento) => cambiar('lugaresVehiculo', evento.target.value)}
            />
          )}
          <SelectorUbicacion
            key={'punto:' + (formulario.puntoPartida?.placeId ?? JSON.stringify(formulario.puntoPartida))}
            id="unirse-punto-partida"
            etiqueta="Punto de partida (opcional)"
            centroInicial={actividad.destino}
            valor={formulario.puntoPartida}
            error={campos.puntoPartida}
            deshabilitado={!mapasDisponibles || enviando}
            alNoDisponible={() => setMapasDisponibles(false)}
            alCambiar={(valor) => cambiar('puntoPartida', valor)}
          />
          <p className="texto-suave unirse__aviso">{AVISO_PUNTO_DE_PARTIDA}</p>
          {!mapasDisponibles && (
            <p className="texto-suave">La búsqueda de lugares no está disponible. Podés unirte sin punto de partida.</p>
          )}
        </fieldset>

        <fieldset className="unirse__seccion" disabled={enviando}>
          <legend>Invitados externos</legend>
          <p className="texto-suave">{textoLugaresParaInvitados(cuposLibres, formulario.invitados.length)}</p>
          {formulario.invitados.map((nombre, indice) => (
            <div className="actividad-invitado" key={indice}>
              <Campo
                id={`unirse-invitado-${indice}`}
                etiqueta={`Nombre del invitado ${indice + 1}`}
                maxLength={100}
                value={nombre}
                error={campos[`invitados.${indice}`]}
                onChange={(evento) => cambiarInvitado(indice, evento.target.value)}
              />
              <button
                type="button"
                className="boton-enlace"
                aria-label={`Quitar invitado ${indice + 1}`}
                onClick={() => quitarInvitado(indice)}
              >
                Quitar
              </button>
            </div>
          ))}
          <button
            type="button"
            className="boton-secundario"
            disabled={!puedeAgregarInvitado}
            onClick={() => cambiar('invitados', [...formulario.invitados, ''])}
          >
            Agregar invitado
          </button>
          {campos.invitados && <p className="campo__error">{campos.invitados}</p>}
        </fieldset>

        {falla && (
          <p className="aviso-error" role="alert">
            {falla}
          </p>
        )}

        <div className="dialogo__acciones">
          <button type="button" className="boton-secundario" onClick={alCancelar} disabled={enviando}>
            Cancelar
          </button>
          <Boton type="submit" cargando={enviando} textoCargando="Uniéndote…">
            Unirme
          </Boton>
        </div>
      </form>
    </dialog>
  );
}
