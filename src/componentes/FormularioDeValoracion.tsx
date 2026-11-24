import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ErrorApi } from '../api/cliente';
import { guardarValoracion, type MiValoracion } from '../api/valoraciones';
import { armarValoracion, LARGO_MAXIMO_COMENTARIO, MENSAJES_VALORACION, PUNTAJES } from '../comun/valoraciones';
import { Boton } from './Boton';

interface PropsFormulario {
  actividadId: string;
  participante: { id: string; nombre: string };
  /** A2: si ya lo había valorado, el formulario arranca con esa valoración. */
  valoracionActual: MiValoracion | null;
  alGuardar: (valoracion: MiValoracion) => void;
  /** A1: cerrar sin guardar deja al participante como estaba (pendiente o con su valoración anterior). */
  alCerrar: () => void;
}

/**
 * CU21 FP pasos 4 a 10: formulario de valoración en un diálogo modal (puntaje obligatorio y comentario opcional, RN6).
 * Si falla, conserva lo ingresado para reintentar (ER1).
 */
export function FormularioDeValoracion({ actividadId, participante, valoracionActual, alGuardar, alCerrar }: PropsFormulario) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [puntaje, setPuntaje] = useState<number | null>(valoracionActual?.puntaje ?? null);
  const [comentario, setComentario] = useState(valoracionActual?.comentario ?? '');
  const [errorPuntaje, setErrorPuntaje] = useState<string | null>(null);
  const [errorAlGuardar, setErrorAlGuardar] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // El navegador maneja el foco y la tecla Escape del <dialog> modal. En desarrollo el efecto corre dos veces
  // (StrictMode) y abrir un diálogo ya abierto es un error: por eso se pregunta antes
  useEffect(() => {
    const elemento = dialogo.current;
    if (elemento && !elemento.open) {
      elemento.showModal();
    }
  }, []);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const valoracion = armarValoracion(puntaje, comentario);
    if (valoracion === null) {
      setErrorPuntaje(MENSAJES_VALORACION.sinPuntaje); // E1
      return;
    }
    setGuardando(true);
    setErrorAlGuardar(null);
    try {
      alGuardar(await guardarValoracion(actividadId, participante.id, valoracion));
    } catch (error) {
      setErrorAlGuardar(mensajeDeError(error));
      setGuardando(false);
    }
  }

  function elegirPuntaje(elegido: number) {
    setPuntaje(elegido);
    setErrorPuntaje(null);
  }

  return (
    <dialog
      ref={dialogo}
      className="dialogo dialogo-valoracion"
      aria-labelledby="valoracion-titulo"
      onCancel={(evento) => {
        evento.preventDefault();
        if (!guardando) alCerrar();
      }}
    >
      <form onSubmit={(evento) => void enviar(evento)} noValidate>
        <h2 id="valoracion-titulo" className="dialogo__titulo">
          Valorar a {participante.nombre}
        </h2>

        <fieldset
          className="estrellas-formulario"
          aria-invalid={errorPuntaje ? true : undefined}
          aria-describedby={errorPuntaje ? 'valoracion-puntaje-error' : undefined}
        >
          <legend className="estrellas-formulario__titulo">Puntaje</legend>
          <div className="estrellas-formulario__opciones">
            {PUNTAJES.map((opcion) => (
              <label key={opcion} className="estrellas-formulario__opcion">
                <input
                  type="radio"
                  name="puntaje"
                  className="sr-only"
                  value={opcion}
                  checked={puntaje === opcion}
                  onChange={() => elegirPuntaje(opcion)}
                />
                <span aria-hidden="true" className={puntaje !== null && opcion <= puntaje ? 'estrella--llena' : undefined}>
                  {puntaje !== null && opcion <= puntaje ? '★' : '☆'}
                </span>
                <span className="sr-only">{`${opcion} de 5 estrellas`}</span>
              </label>
            ))}
          </div>
          {errorPuntaje && (
            <p id="valoracion-puntaje-error" className="campo__error">
              {errorPuntaje}
            </p>
          )}
        </fieldset>

        <div className="campo">
          <label htmlFor="valoracion-comentario">Comentario (opcional)</label>
          <textarea
            id="valoracion-comentario"
            className="dialogo-valoracion__comentario"
            maxLength={LARGO_MAXIMO_COMENTARIO}
            rows={3}
            value={comentario}
            onChange={(evento) => setComentario(evento.target.value)}
          />
        </div>

        {errorAlGuardar && (
          <p className="aviso-error" role="alert">
            {errorAlGuardar}
          </p>
        )}

        <div className="dialogo__acciones">
          <button type="button" className="boton-secundario" onClick={alCerrar} disabled={guardando}>
            Cancelar
          </button>
          <Boton type="submit" cargando={guardando} textoCargando="Guardando…">
            Guardar valoración
          </Boton>
        </div>
      </form>
    </dialog>
  );
}

/** ER1 si es una falla técnica; si la API rechazó la valoración (E2, RN1), su propio mensaje. */
function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorApi && !error.esFallaTecnica()) {
    return error.message;
  }
  return MENSAJES_VALORACION.errorAlGuardar;
}
