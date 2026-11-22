import type { MiValoracion } from '../api/valoraciones';
import { etiquetaDelBotonDeValorar, PUNTAJES } from '../comun/valoraciones';

interface PropsEstrellas {
  nombre: string;
  /** La valoración que el usuario ya le dio (A2), o null si está pendiente (A1). */
  valoracion: MiValoracion | null;
  alPresionar: () => void;
}

/**
 * CU21: junto a cada participante, las estrellas muestran con cuánto lo valoraste. Tocarlas abre el formulario para
 * valorarlo o cambiar la valoración (A2). Es un solo botón: las estrellas se eligen dentro del formulario.
 */
export function EstrellasDeValoracion({ nombre, valoracion, alPresionar }: PropsEstrellas) {
  const puntaje = valoracion?.puntaje ?? 0;
  return (
    <button
      type="button"
      className={`estrellas${valoracion ? '' : ' estrellas--pendiente'}`}
      aria-label={etiquetaDelBotonDeValorar(nombre, valoracion)}
      onClick={alPresionar}
    >
      <span className="estrellas__dibujo" aria-hidden="true">
        {PUNTAJES.map((estrella) => (estrella <= puntaje ? '★' : '☆')).join('')}
      </span>
      {/* El color no es la única señal: el texto dice si falta valorarlo */}
      <span className="estrellas__texto" aria-hidden="true">
        {valoracion ? 'Cambiar' : 'Valorar'}
      </span>
    </button>
  );
}
