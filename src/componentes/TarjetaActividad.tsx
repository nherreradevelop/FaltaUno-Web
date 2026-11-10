import type { ActividadEncontrada } from '../api/tipos';
import { formatearCuposLibres, formatearFechaHora, formatearValoracionDelOrganizador } from '../comun/formato';
import { ETIQUETA_NIVEL } from '../paginas/mensajesExplorar';

/**
 * CU08: una actividad de la búsqueda (mockup W02).
 * Muestra nombre, deporte, fecha y hora, departamento, organizador con su valoración, nivel y cupos libres;
 * si el usuario la organiza, lo indica.
 */
export function TarjetaActividad({ actividad }: { actividad: ActividadEncontrada }) {
  return (
    <article className="tarjeta tarjeta-actividad">
      <div className="tarjeta-actividad__etiquetas">
        <span className="etiqueta">{actividad.deporte.nombre}</span>
        {actividad.esOrganizador && <span className="etiqueta etiqueta--organizador">Organizada por ti</span>}
      </div>
      <h2 className="tarjeta-actividad__nombre">{actividad.nombre}</h2>
      <p className="texto-suave">
        {formatearFechaHora(actividad.fechaHoraInicio)} · {actividad.departamento}
      </p>
      {actividad.organizador && (
        <p className="tarjeta-actividad__organizador">
          Organiza <strong>{actividad.organizador.nombre}</strong>
          <span className="tarjeta-actividad__valoracion">
            {formatearValoracionDelOrganizador(actividad.organizador.valoracionPromedio)}
          </span>
        </p>
      )}
      <div className="tarjeta-actividad__pie">
        <span className="dato">{ETIQUETA_NIVEL[actividad.nivel]}</span>
        <span className="dato">{formatearCuposLibres(actividad.cuposLibres)}</span>
        {/* Pendiente: CU09 – Detalle de actividad */}
        <button type="button" className="boton-secundario tarjeta-actividad__detalle" disabled>
          Ver detalle
        </button>
      </div>
    </article>
  );
}
