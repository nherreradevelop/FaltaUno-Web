import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useBlocker, useNavigate } from 'react-router';
import {
  crearActividad,
  opcionesActividad,
  type ActividadCreada,
  type DatosCrearActividad,
  type OpcionesActividad,
} from '../api/actividades';
import { ErrorApi } from '../api/cliente';
import { Campo } from '../componentes/Campo';
import { Boton } from '../componentes/Boton';
import { SelectorUbicacion } from '../componentes/SelectorUbicacion';
import { aCentavos, mostrarImporte, nuevaClave, resultadoIncierto } from '../comun/formularioActividad';
import { useSesion } from '../sesion/SesionContexto';
import { useFormularioActividad } from '../hooks/useFormularioActividad';

/** CU10: alta con cancelación confirmada, corrección de campos y reintento de la misma intención. */
export function CrearActividadPage() {
  const navegar = useNavigate();
  const { sesion } = useSesion();
  const [opciones, setOpciones] = useState<OpcionesActividad | null>(null);
  const [error, setError] = useState('');
  const { formulario, campos, cambiar, visitar, validar, registrarErrores } = useFormularioActividad(
    opciones?.maximoParticipantes,
    opciones?.mapasDisponibles === false ? opciones.destinoPorDefecto : undefined,
  );
  const [enviando, setEnviando] = useState(false);
  const [pendiente, setPendiente] = useState(false);
  const [creada, setCreada] = useState<ActividadCreada | null>(null);
  const intento = useRef<{ datos: DatosCrearActividad; clave: string } | null>(null);
  const envioEnCurso = useRef(false);
  const resumenErrores = useRef<HTMLDivElement>(null);
  const [recarga, setRecarga] = useState(0);
  const sinMapas = useCallback(() => setOpciones((actual) => (actual ? { ...actual, mapasDisponibles: false } : actual)), []);
  const bloqueador = useBlocker(
    ({ currentLocation, nextLocation }) => !creada && sesion !== null && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (bloqueador.state !== 'blocked') return;
    if (enviando || pendiente) {
      window.alert('Reintentá para conocer el resultado del alta antes de salir.');
      bloqueador.reset();
    } else if (window.confirm('¿Querés descartar los datos y cancelar la creación?')) bloqueador.proceed();
    else bloqueador.reset();
  }, [bloqueador, enviando, pendiente]);
  useEffect(() => {
    let vigente = true;
    opcionesActividad()
      .then((datos) => {
        if (vigente) {
          setOpciones(datos);
          setError('');
        }
      })
      .catch((fallo: unknown) => {
        if (vigente) setError(fallo instanceof Error ? fallo.message : 'No pudimos cargar el formulario.');
      });
    return () => {
      vigente = false;
    };
  }, [recarga]);
  useEffect(() => {
    if (creada || !sesion) return;
    const avisar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
    };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [creada, sesion]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (envioEnCurso.current || !opciones) return;
    setError('');
    try {
      if (!pendiente) intento.current = { datos: validar(), clave: nuevaClave() };
      if (!intento.current) return;
      envioEnCurso.current = true;
      setEnviando(true);
      const resultado = await crearActividad(intento.current.datos, intento.current.clave);
      setCreada(resultado);
      setPendiente(false);
      intento.current = null;
    } catch (fallo) {
      const incierto = fallo instanceof ErrorApi && resultadoIncierto(fallo);
      setPendiente(incierto);
      if (!incierto) intento.current = null;
      if (fallo instanceof ErrorApi) {
        registrarErrores(fallo.campos ?? {});
        if (fallo.estado === 503 && fallo.codigo.startsWith('MAPAS_')) sinMapas();
      }
      requestAnimationFrame(() => resumenErrores.current?.focus());
      setError(
        incierto
          ? 'No pudimos confirmar el alta. Reintentá para recuperar el resultado sin crear otra actividad.'
          : fallo instanceof Error
            ? fallo.message
            : 'No pudimos crear la actividad.',
      );
    } finally {
      envioEnCurso.current = false;
      setEnviando(false);
    }
  }
  function cancelar() {
    if (!enviando && !pendiente) navegar('/');
  }
  let total: number | null = null;
  try {
    total = aCentavos(formulario.costo);
  } catch {
    /* El error se explica al confirmar el formulario. */
  }
  const cantidad = 1 + formulario.invitados.length;
  if (creada)
    return (
      <main className="crear-actividad">
        <section className="actividad-confirmada" role="status">
          <span className="actividad-etiqueta">Programada</span>
          <h1>¡Actividad creada!</h1>
          <h2>{creada.nombre}</h2>
          {creada.destinoProvisional && (
            <p className="aviso-error" role="status">
              Usamos una ubicación por defecto como destino. Como organizador, tenés que editarla más adelante.
            </p>
          )}
          <p>Ya estás registrado como organizador y participante.</p>
          <p>
            {creada.cantidadParticipantes} participantes · {creada.cuposDisponibles} lugares disponibles
          </p>
          {creada.costoPorPersonaCentavos !== null && (
            <p>
              Costo total: {mostrarImporte(creada.costoEstimadoCentavos!)} · Aproximado por participante actual:{' '}
              {mostrarImporte(creada.costoPorPersonaCentavos)}
            </p>
          )}
          <p className="actividad-id">Identificador: {creada.id}</p>
          <Link to="/">Volver al inicio</Link>
        </section>
      </main>
    );
  return (
    <main className="crear-actividad">
      <header className="crear-actividad__encabezado">
        <button type="button" onClick={cancelar} disabled={enviando || pendiente} aria-label="Cancelar creación">
          ×
        </button>
        <div>
          <p>Salí a compartir</p>
          <h1>Nueva actividad</h1>
        </div>
      </header>
      {error && (
        <div className="aviso-error" role="alert" tabIndex={-1} ref={resumenErrores}>
          <p>{error}</p>
          {Object.values(campos).length > 0 && (
            <ul>
              {Object.entries(campos).map(([campo, mensaje]) => (
                <li key={campo}>{mensaje}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {!opciones ? (
        <section>
          <p>{error ? 'El formulario no está disponible.' : 'Cargando opciones…'}</p>
          {error && <button onClick={() => setRecarga((actual) => actual + 1)}>Reintentar</button>}
        </section>
      ) : (
        <form onSubmit={enviar} noValidate>
          <fieldset disabled={enviando || pendiente}>
            <legend className="sr-only">Datos de la actividad</legend>
            <Campo
              id="nombre"
              etiqueta="Nombre de la actividad"
              value={formulario.nombre}
              maxLength={100}
              required
              error={campos.nombre}
              onBlur={() => visitar('nombre')}
              onChange={(e) => cambiar('nombre', e.target.value)}
            />
            <div className="actividad-grilla">
              <div className="campo">
                <label htmlFor="deporte">Deporte</label>
                <select
                  id="deporte"
                  required
                  value={formulario.deporteId}
                  aria-invalid={Boolean(campos.deporteId)}
                  aria-describedby={campos.deporteId ? 'deporte-error' : undefined}
                  onBlur={() => visitar('deporteId')}
                  onChange={(e) => cambiar('deporteId', e.target.value)}
                >
                  <option value="">Seleccioná un deporte</option>
                  {opciones.deportes.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
                {campos.deporteId && (
                  <p className="campo__error" id="deporte-error">
                    {campos.deporteId}
                  </p>
                )}
              </div>
              <Campo
                id="cupo"
                etiqueta={`Cupo máximo (2 a ${opciones.maximoParticipantes})`}
                type="number"
                min={2}
                max={opciones.maximoParticipantes}
                value={formulario.cupoMaximo}
                error={campos.cupoMaximo}
                onBlur={() => visitar('cupoMaximo')}
                onChange={(e) => cambiar('cupoMaximo', e.target.value)}
              />
            </div>
            <div className="actividad-grilla">
              <Campo
                id="fecha"
                etiqueta="Fecha"
                type="date"
                value={formulario.fecha}
                error={campos.fecha || campos.fechaHoraInicio}
                onBlur={() => visitar('fecha')}
                onChange={(e) => cambiar('fecha', e.target.value)}
              />
              <Campo
                id="hora"
                etiqueta="Hora (Uruguay)"
                type="time"
                value={formulario.hora}
                error={campos.hora}
                onBlur={() => visitar('hora')}
                onChange={(e) => cambiar('hora', e.target.value)}
              />
            </div>
            <div className="campo">
              <span>Nivel de dificultad</span>
              <div className="actividad-niveles">
                {opciones.niveles.map((nivel) => (
                  <button
                    type="button"
                    key={nivel}
                    aria-pressed={formulario.nivel === nivel}
                    onClick={() => cambiar('nivel', nivel)}
                  >
                    {nivel}
                  </button>
                ))}
              </div>
            </div>
            <div className="campo">
              <label htmlFor="descripcion">Descripción</label>
              <textarea
                id="descripcion"
                aria-invalid={Boolean(campos.descripcion)}
                aria-describedby={campos.descripcion ? 'descripcion-error' : undefined}
                required
                maxLength={1000}
                rows={4}
                value={formulario.descripcion}
                onBlur={() => visitar('descripcion')}
                onChange={(e) => cambiar('descripcion', e.target.value)}
              />
              {campos.descripcion && (
                <p id="descripcion-error" className="campo__error">
                  {campos.descripcion}
                </p>
              )}
            </div>
            <section className="actividad-seccion">
              <h2>Traslado</h2>
              <label className="actividad-check">
                <input
                  type="checkbox"
                  checked={formulario.tieneVehiculo}
                  onChange={(e) => cambiar('tieneVehiculo', e.target.checked)}
                />
                Tengo vehículo propio
              </label>
              {formulario.tieneVehiculo && (
                <Campo
                  id="lugares"
                  etiqueta="Personas que puedo llevar al destino (incluyéndome a mí mismo)"
                  type="number"
                  min={0}
                  value={formulario.lugaresVehiculo}
                  error={campos.lugaresVehiculo}
                  onBlur={() => visitar('lugaresVehiculo')}
                  onChange={(e) => cambiar('lugaresVehiculo', e.target.value)}
                />
              )}
              <label className="actividad-check">
                <input
                  type="checkbox"
                  checked={formulario.requiereVehiculo}
                  onChange={(e) => cambiar('requiereVehiculo', e.target.checked)}
                />
                Buscando traslado
              </label>
              <Campo
                id="costo"
                etiqueta="Costo total estimado del traslado (opcional)"
                inputMode="decimal"
                placeholder="0,00"
                value={formulario.costo}
                error={campos.costoEstimadoCentavos}
                onBlur={() => visitar('costo')}
                onChange={(e) => cambiar('costo', e.target.value)}
              />
              {total !== null && (
                <p>
                  El total se divide entre los participantes. Con {cantidad} {cantidad === 1 ? 'persona' : 'personas'}:
                  aproximadamente {mostrarImporte(Math.round(total / cantidad))} por persona. El importe cambia si se suman
                  participantes.
                </p>
              )}
            </section>
            <section className="actividad-seccion">
              <h2>Recorrido</h2>
              {!opciones.mapasDisponibles && (
                <p className="aviso-error" role="alert">
                  La búsqueda de ubicaciones no está disponible por el momento. Vamos a usar una ubicación por defecto como
                  destino. Como organizador, tenés que editar esa ubicación más adelante. El origen es opcional si no tenés
                  vehículo propio.
                </p>
              )}
              {!opciones.mapasDisponibles && (
                <button
                  type="button"
                  disabled={enviando || pendiente}
                  onClick={() => setOpciones((actual) => (actual ? { ...actual, mapasDisponibles: true } : actual))}
                >
                  Reintentar Google Maps
                </button>
              )}
              <SelectorUbicacion
                key={'origen:' + (formulario.origen?.placeId ?? JSON.stringify(formulario.origen))}
                centroInicial={opciones.destinoPorDefecto}
                id="origen"
                etiqueta={
                  formulario.tieneVehiculo
                    ? 'Punto de encuentro / origen (obligatorio)'
                    : 'Punto de encuentro / origen (opcional)'
                }
                valor={formulario.origen}
                error={campos.origenPlaceId}
                alNoDisponible={sinMapas}
                alCambiar={(valor) => cambiar('origen', valor)}
                deshabilitado={!opciones.mapasDisponibles || enviando || pendiente}
              />
              {formulario.origen && (
                <button type="button" disabled={enviando || pendiente} onClick={() => cambiar('origen', null)}>
                  Quitar origen
                </button>
              )}
              <SelectorUbicacion
                key={'destino:' + (formulario.destino?.placeId ?? JSON.stringify(formulario.destino))}
                centroInicial={opciones.destinoPorDefecto}
                id="destino"
                etiqueta="Destino"
                valor={formulario.destino}
                alNoDisponible={sinMapas}
                alCambiar={(valor) => cambiar('destino', valor)}
                deshabilitado={!opciones.mapasDisponibles || enviando || pendiente}
              />
              {campos.destinoPlaceId && <p className="campo__error">{campos.destinoPlaceId}</p>}
              <aside className="actividad-pronostico">
                <strong>Pronóstico para la actividad</strong>
                <p>{opciones.pronostico.mensaje}</p>
              </aside>
            </section>
            <section className="actividad-seccion">
              <h2>Participantes externos</h2>
              <p>
                Vos también ocupás un lugar. Ocupados: {cantidad} de {formulario.cupoMaximo || '—'}.
              </p>
              {formulario.invitados.map((nombre, indice) => (
                <div className="actividad-invitado" key={indice}>
                  <Campo
                    id={`invitado-${indice}`}
                    etiqueta={`Nombre del participante externo ${indice + 1}`}
                    onBlur={() => visitar(`invitados.${indice}`)}
                    maxLength={100}
                    error={campos[`invitados.${indice}`]}
                    value={nombre}
                    onChange={(e) =>
                      cambiar(
                        'invitados',
                        formulario.invitados.map((actual, i) => (i === indice ? e.target.value : actual)),
                      )
                    }
                  />
                  <button
                    type="button"
                    aria-label={`Quitar participante externo ${indice + 1}`}
                    onClick={() =>
                      cambiar(
                        'invitados',
                        formulario.invitados.filter((_, i) => i !== indice),
                      )
                    }
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={cantidad >= Number(formulario.cupoMaximo)}
                onClick={() => cambiar('invitados', [...formulario.invitados, ''])}
              >
                Agregar participante externo
              </button>
              {campos.invitados && <p className="campo__error">{campos.invitados}</p>}
            </section>
          </fieldset>
          <footer className="actividad-acciones">
            <Boton type="submit" cargando={enviando} textoCargando="Confirmando…">
              {pendiente ? 'Reintentar confirmación' : 'Crear actividad'}
            </Boton>
            <button type="button" onClick={cancelar} disabled={enviando || pendiente}>
              Cancelar
            </button>
          </footer>
        </form>
      )}
    </main>
  );
}
