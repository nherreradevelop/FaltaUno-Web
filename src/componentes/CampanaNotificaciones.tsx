import { useEffect, useRef, useState } from 'react';
import { etiquetaDelIcono, textoDelIndicador } from '../notificaciones/notificaciones';
import { useNotificaciones } from '../notificaciones/ProveedorNotificaciones';
import { IconoNotificaciones } from './Iconos';
import { PanelNotificaciones } from './PanelNotificaciones';

/** CU40 FP pasos 1 y 2: campana con el indicador de no leídas, arriba a la derecha del encabezado. */
export function CampanaNotificaciones() {
  const { noLeidas } = useNotificaciones();
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const indicador = textoDelIndicador(noLeidas);

  // A4: se cierra con Escape o con un clic fuera del panel, sin cambiar el estado de las notificaciones
  useEffect(() => {
    if (!abierto) return;

    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key !== 'Escape') return;
      setAbierto(false);
      boton.current?.focus();
    }
    function alHacerClic(evento: MouseEvent) {
      if (contenedor.current && !contenedor.current.contains(evento.target as Node)) setAbierto(false);
    }

    document.addEventListener('keydown', alPresionarTecla);
    document.addEventListener('mousedown', alHacerClic);
    return () => {
      document.removeEventListener('keydown', alPresionarTecla);
      document.removeEventListener('mousedown', alHacerClic);
    };
  }, [abierto]);

  return (
    <div className="notificaciones" ref={contenedor}>
      <button
        ref={boton}
        type="button"
        className="notificaciones__campana"
        aria-label={etiquetaDelIcono(noLeidas)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        title="Notificaciones"
        onClick={() => setAbierto((anterior) => !anterior)}
      >
        <IconoNotificaciones />
        {indicador && (
          <span className="notificaciones__indicador" aria-hidden="true">
            {indicador}
          </span>
        )}
      </button>
      {abierto && <PanelNotificaciones alCerrar={() => setAbierto(false)} />}
    </div>
  );
}
