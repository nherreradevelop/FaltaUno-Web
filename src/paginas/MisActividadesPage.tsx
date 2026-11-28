import { Link } from 'react-router';
import { MENSAJE_SIN_INICIADAS } from '../comun/actividadesIniciadas';
import { esHoyEnUruguay, formatearFechaHoraCorta } from '../comun/formato';
import { useActividadesIniciadas } from '../comun/useActividadesIniciadas';
import { EsqueletoDeActividades } from '../componentes/EsqueletoDeActividades';

/** CU42: pantalla de actividades propias iniciadas. El detalle conserva las acciones de CU09. */
export function MisActividadesPage() {
  const lista = useActividadesIniciadas();
  return (
    <main className="mis-actividades">
      <div className="mis-actividades__encabezado">
        <div>
          <h1>Mis actividades</h1>
          <p className="texto-suave">Actividades iniciadas en las que participás.</p>
        </div>
        <button
          type="button"
          className="boton-secundario"
          disabled={lista.cargando}
          aria-busy={lista.cargando}
          onClick={lista.actualizar}
        >
          Actualizar
        </button>
      </div>
      <section aria-labelledby="titulo-iniciadas" aria-busy={lista.cargando}>
        <h2 id="titulo-iniciadas">Actividades iniciadas</h2>
        {!lista.cargando && !lista.error && lista.actividades.length === 0 && (
          <div className="tarjeta mis-actividades__vacio">
            <p>{MENSAJE_SIN_INICIADAS}</p>
            <Link to="/" className="boton enlace-boton">
              Explorar actividades
            </Link>
          </div>
        )}
        <ul className="mis-actividades__lista">
          {lista.actividades.map((actividad) => (
            <li key={actividad.id} className="tarjeta mis-actividades__tarjeta">
              <div className="mis-actividades__etiquetas">
                <span className="etiqueta etiqueta--iniciada">Iniciada</span>
                {esHoyEnUruguay(actividad.fechaHoraInicio) && <span className="etiqueta etiqueta--hoy">es hoy!</span>}
                {actividad.esOrganizador && <span className="etiqueta">Organizada por vos</span>}
              </div>
              <h3>{actividad.nombre}</h3>
              <p className="texto-suave">
                {actividad.deporte.nombre} · {actividad.departamento}
              </p>
              <p>Inicio: {formatearFechaHoraCorta(actividad.fechaHoraInicio)}</p>
              <p>Fecha límite para gastos y pagos: {formatearFechaHoraCorta(actividad.fechaLimiteGastos)}</p>
              <Link
                to={`/actividades/${actividad.id}`}
                className="boton-secundario enlace-boton"
                aria-label={`Ver detalle de ${actividad.nombre}`}
              >
                Ver detalle
              </Link>
            </li>
          ))}
        </ul>
        {lista.cargando && <EsqueletoDeActividades />}
        {lista.error && (
          <div className="aviso-error mis-actividades__error" role="alert">
            <p>{lista.error}</p>
            <button type="button" className="boton-secundario" onClick={lista.reintentar}>
              Reintentar
            </button>
          </div>
        )}
        {lista.hayMas && !lista.cargando && !lista.error && (
          <button type="button" className="boton-secundario" onClick={lista.verMas}>
            Ver más
          </button>
        )}
      </section>
      {/* Pendiente: CU14 (programadas, historial, canceladas e invitaciones). */}
    </main>
  );
}
