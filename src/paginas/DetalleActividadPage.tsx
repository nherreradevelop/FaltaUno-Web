import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { obtenerDetalleDeActividad } from '../api/actividades';
import type { DetalleActividad } from '../api/tipos';
import {
  formatearDia,
  formatearFechaHora,
  formatearHora,
  formatearLugaresLibres,
  formatearMonto,
  hayLugaresLibres,
  proporcionOcupada,
} from '../comun/formato';
import { Avatar } from '../componentes/Avatar';
import { FormularioUnirse, type ResultadoAlUnirse } from '../componentes/FormularioUnirse';
import { LimiteDeError } from '../componentes/LimiteDeError';
import { IconoCompartir, IconoMasOpciones, IconoSilenciar, IconoTilde } from '../componentes/Iconos';
import { MapaDelRecorrido } from '../componentes/MapaDelRecorrido';
import { puntosDePartidaEnMapa } from '../comun/puntosDePartida';
import { ParticipantesDeActividad, useParticipantes, type EstadoParticipantes } from '../componentes/ParticipantesDeActividad';
import { useMisValoraciones, type EstadoMisValoraciones } from '../componentes/ValoracionesDeActividad';
import {
  ACCIONES_DEL_MENU,
  ACCIONES_RAPIDAS,
  accionesOfrecidas,
  accionPrincipal,
  clasificarErrorDeActividad,
  ETIQUETA_NIVEL,
  ETIQUETA_ROL,
  pestanasDisponibles,
  type DefinicionDePestana,
  type ErrorDeActividad,
  type OpcionPendiente,
  type PestanaDeActividad,
} from './mensajesActividad';
import { ETIQUETA_ESTADO } from './mensajesPerfil';

/** Estado de navegación con el que CU10 abre esta pantalla al terminar el alta. */
export interface EstadoDeActividadCreada {
  actividadCreada: { destinoProvisional: boolean };
}

type EstadoPantalla = { tipo: 'cargando' } | { tipo: 'listo'; actividad: DetalleActividad } | ErrorDeActividad;

/** CU11 FP paso 10, E1, E2 y E3: resultado de intentar unirse, que se muestra arriba del detalle. */
type AvisoDeIncorporacion = { tipo: 'exito' | 'error'; mensaje: string } | null;

/**
 * W – CU09 Detalle de actividad (/actividades/:id).
 * Sin sesión, RutaPrivada lleva al login y después vuelve acá (A3).
 */
export function DetalleActividadPage() {
  const { id = '' } = useParams();
  // key: al pasar de una actividad a otra, la pantalla arranca de cero
  return (
    <LimiteDeError
      key={id}
      alternativa={(reintentar) => (
        <main className="actividad">
          <BotonVolver />
          <div className="aviso-error actividad__error" role="alert">
            <span>No fue posible cargar el detalle de la actividad. Probá de nuevo más tarde.</span>
            <button type="button" className="boton-secundario" onClick={reintentar}>
              Reintentar
            </button>
          </div>
        </main>
      )}
    >
      <PantallaDetalle actividadId={id} />
    </LimiteDeError>
  );
}

function PantallaDetalle({ actividadId }: { actividadId: string }) {
  const [estado, setEstado] = useState<EstadoPantalla>({ tipo: 'cargando' });
  /** Se incrementa al tocar "Reintentar" (CU09 ER1, RNF-10). */
  const [intento, setIntento] = useState(0);
  const [aviso, setAviso] = useState<AvisoDeIncorporacion>(null);
  /** Cambia al recargar después de unirse: vuelve a montar el detalle para que pida de nuevo los participantes. */
  const [version, setVersion] = useState(0);

  useEffect(() => {
    // Si el usuario sale de la pantalla antes de que llegue la respuesta, se descarta
    let vigente = true;
    setEstado({ tipo: 'cargando' });

    obtenerDetalleDeActividad(actividadId)
      .then((actividad) => {
        if (vigente) setEstado({ tipo: 'listo', actividad });
      })
      .catch((error: unknown) => {
        if (vigente) setEstado(clasificarErrorDeActividad(error));
      });

    return () => {
      vigente = false;
    };
  }, [actividadId, intento]);

  /**
   * CU11 FP paso 10 (y E1/E2/E3): avisa el resultado y recarga el detalle sin mostrar el esqueleto,
   * así se ve "Ya estás anotado" y los cupos actualizados (FP paso 8).
   */
  const alTerminarIncorporacion = useCallback(
    (resultado: ResultadoAlUnirse) => {
      setAviso({ tipo: resultado.tipo === 'unido' ? 'exito' : 'error', mensaje: resultado.mensaje });
      obtenerDetalleDeActividad(actividadId)
        .then((actividad) => {
          setEstado({ tipo: 'listo', actividad });
          setVersion((anterior) => anterior + 1);
        })
        .catch((error: unknown) => setEstado(clasificarErrorDeActividad(error)));
    },
    [actividadId],
  );

  // CU09 E2: se informa que la actividad no está disponible y se vuelve al inicio
  if (estado.tipo === 'noDisponible') {
    return <Navigate to="/" replace state={{ aviso: estado.mensaje }} />;
  }

  return (
    <main className="actividad">
      <BotonVolver />
      <AvisoDeActividadCreada />
      {aviso && (
        <p className={aviso.tipo === 'exito' ? 'aviso-info' : 'aviso-error'} role={aviso.tipo === 'exito' ? 'status' : 'alert'}>
          {aviso.mensaje}
        </p>
      )}
      {estado.tipo === 'cargando' && <EsqueletoDeCarga />}

      {estado.tipo === 'falla' && (
        <div className="aviso-error actividad__error" role="alert">
          <span>{estado.mensaje}</span>
          <button type="button" className="boton-secundario" onClick={() => setIntento((anterior) => anterior + 1)}>
            Reintentar
          </button>
        </div>
      )}

      {estado.tipo === 'listo' && (
        <DetalleDeLaActividad key={version} actividad={estado.actividad} alTerminarIncorporacion={alTerminarIncorporacion} />
      )}
    </main>
  );
}

/** CU10 FP paso 11: confirma el alta cuando se llega desde la creación de la actividad. */
function AvisoDeActividadCreada() {
  const location = useLocation();
  const actividadCreada = (location.state as EstadoDeActividadCreada | null)?.actividadCreada;
  if (!actividadCreada) return null;
  return (
    <>
      <p className="aviso-info" role="status">
        ¡Actividad creada! Ya estás registrado como organizador y participante.
      </p>
      {actividadCreada.destinoProvisional && (
        <p className="aviso-error" role="status">
          Usamos una ubicación por defecto como destino. Como organizador, tenés que editarla más adelante.
        </p>
      )}
    </>
  );
}

/** Vuelve a la pantalla anterior (búsqueda, historial…); si se entró directo por un enlace, al inicio. */
function BotonVolver() {
  const navegar = useNavigate();
  // React Router guarda en history.state.idx cuántas pantallas propias hay detrás de esta
  const hayPantallaAnterior = ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0;
  return (
    <button type="button" className="actividad__volver" onClick={() => (hayPantallaAnterior ? navegar(-1) : navegar('/'))}>
      ‹ Volver
    </button>
  );
}

/** Mientras carga se muestra la forma de la pantalla, para que no salte el contenido al llegar (CU09 FP paso 2). */
function EsqueletoDeCarga() {
  return (
    <div className="esqueleto" role="status" aria-label="Cargando actividad">
      <div className="esqueleto__bloque esqueleto__bloque--etiquetas" />
      <div className="esqueleto__bloque esqueleto__bloque--titulo" />
      <div className="esqueleto__fila">
        <div className="esqueleto__bloque esqueleto__bloque--tarjeta" />
        <div className="esqueleto__bloque esqueleto__bloque--tarjeta" />
        <div className="esqueleto__bloque esqueleto__bloque--tarjeta" />
      </div>
      <div className="esqueleto__bloque esqueleto__bloque--grande" />
    </div>
  );
}

/**
 * Disposición: a la izquierda lo que el usuario lee para decidir (qué, cuándo, si hay lugar, quién va, pronóstico,
 * cómo llegar); a la derecha lo que puede hacer y las pestañas. En pantallas angostas las dos columnas se apilan.
 */
interface PropsDetalle {
  actividad: DetalleActividad;
  alTerminarIncorporacion: (resultado: ResultadoAlUnirse) => void;
}

function DetalleDeLaActividad({ actividad, alTerminarIncorporacion }: PropsDetalle) {
  const participantes = useParticipantes(actividad.id, actividad.opciones.includes('verParticipantes'));
  // CU21: solo si la API ofrece valorar (actividad Iniciada o Archivada y el usuario forma parte, RN5)
  const puedeValorar = actividad.opciones.includes('valorar');
  const valoraciones = useMisValoraciones(actividad.id, puedeValorar);
  const [pestanaActiva, setPestanaActiva] = useState<PestanaDeActividad>('participantes');
  // Memo: el mapa vuelve a marcar los puntos solo cuando cambia la lista, no en cada render
  const puntosDePartida = useMemo(() => puntosDePartidaEnMapa(participantes.participantes), [participantes.participantes]);
  /** CU11 FP paso 3: el formulario para unirse se abre desde la acción principal. */
  const [formularioAbierto, setFormularioAbierto] = useState(false);

  return (
    <div className="actividad__columnas">
      <div className="actividad__principal">
        <Cabecera actividad={actividad} />
        <Resumen actividad={actividad} />
        {actividad.descripcion && (
          <section className="tarjeta actividad__bloque-descripcion">
            <p className="actividad__descripcion">{actividad.descripcion}</p>
          </section>
        )}
        <Pronostico actividad={actividad} />
        {/* CU09 A2: salida, destino y mapa juntos */}
        {actividad.opciones.includes('verMapa') && (
          <MapaDelRecorrido origen={actividad.origen} destino={actividad.destino} puntosDePartida={puntosDePartida} />
        )}
      </div>

      <aside className="actividad__lateral">
        <Acciones actividad={actividad} alUnirse={() => setFormularioAbierto(true)} />
        <Pestanas
          actividad={actividad}
          participantes={participantes}
          valoraciones={puedeValorar ? valoraciones : null}
          pestanaActiva={pestanaActiva}
          alElegirPestana={setPestanaActiva}
        />
      </aside>

      {actividad.opciones.includes('unirse') && (
        <FormularioUnirse
          actividad={actividad}
          abierto={formularioAbierto}
          alCancelar={() => setFormularioAbierto(false)} // CU11 A1: sigue fuera de la actividad
          alTerminar={(resultado) => {
            setFormularioAbierto(false);
            alTerminarIncorporacion(resultado);
          }}
        />
      )}
    </div>
  );
}

function Cabecera({ actividad }: { actividad: DetalleActividad }) {
  const etiquetaRol = ETIQUETA_ROL[actividad.miRol];
  return (
    <section className="actividad__cabecera">
      <ul className="actividad__etiquetas" aria-label="Deporte, estado y nivel">
        <li className="etiqueta">{actividad.deporte.nombre}</li>
        {/* CU09 RN4: estado de la actividad */}
        <li className={`etiqueta etiqueta--${actividad.estado}`}>{ETIQUETA_ESTADO[actividad.estado]}</li>
        <li className="etiqueta etiqueta--neutra">{ETIQUETA_NIVEL[actividad.nivel]}</li>
        {/* CU09 FP paso 3: relación del usuario con la actividad */}
        {etiquetaRol && (
          <li className="etiqueta etiqueta--rol">
            <IconoTilde />
            {etiquetaRol}
          </li>
        )}
      </ul>
      <h1>{actividad.nombre}</h1>
      {/* Si el organizador es el propio usuario, ya lo dice la etiqueta "Sos el organizador" */}
      {actividad.miRol !== 'organizador' && <Organizador organizador={actividad.organizador} />}
      <AvisoDeEstado actividad={actividad} />
    </section>
  );
}

/** Lo que decide si me uno: cuándo, si hay lugar y cuánto sale el traslado. */
function Resumen({ actividad }: { actividad: DetalleActividad }) {
  const ocupado = proporcionOcupada(actividad.cuposOcupados, actividad.cupoMaximo);
  return (
    <section className="actividad__resumen" aria-label="Resumen de la actividad">
      <div className="tarjeta actividad__dato">
        <p className="actividad__dato-titulo">Cuándo</p>
        {/* Día y hora en una línea si entran; si la tarjeta es angosta, en dos (sin el separador) */}
        <p className="actividad__dato-valor actividad__cuando">
          <span className="actividad__dato-linea">{formatearDia(actividad.fechaHoraInicio)}</span>
          <span className="actividad__cuando-separador" aria-hidden="true">
            {' · '}
          </span>
          <span className="actividad__dato-linea">{formatearHora(actividad.fechaHoraInicio)}</span>
        </p>
      </div>
      {/* Glosario: solo una actividad Programada admite incorporaciones; después importa cuántos fueron, no cuántos lugares quedan */}
      {actividad.estado === 'programada' ? (
        <div className="tarjeta actividad__dato">
          <p className="actividad__dato-titulo">Lugares</p>
          <p className="actividad__dato-valor">
            {formatearLugaresLibres(actividad.cuposOcupados, actividad.cupoMaximo)}
            {/* Sin lugares el texto ya es "2 de 2": no se repite el total */}
            {hayLugaresLibres(actividad.cuposOcupados, actividad.cupoMaximo) && (
              <span className="texto-suave actividad__dato-extra"> de {actividad.cupoMaximo}</span>
            )}
          </p>
          <div
            className="cupo"
            role="progressbar"
            aria-label="Lugares ocupados"
            aria-valuemin={0}
            aria-valuemax={actividad.cupoMaximo}
            aria-valuenow={actividad.cuposOcupados}
          >
            <div className="cupo__relleno" style={{ width: `${ocupado * 100}%` }} />
          </div>
        </div>
      ) : (
        <div className="tarjeta actividad__dato">
          <p className="actividad__dato-titulo">Participantes</p>
          <p className="actividad__dato-valor">
            {actividad.cuposOcupados}
            <span className="texto-suave actividad__dato-extra"> de {actividad.cupoMaximo}</span>
          </p>
          <div
            className="cupo"
            role="progressbar"
            aria-label="Lugares ocupados"
            aria-valuemin={0}
            aria-valuemax={actividad.cupoMaximo}
            aria-valuenow={actividad.cuposOcupados}
          >
            <div className="cupo__relleno" style={{ width: `${ocupado * 100}%` }} />
          </div>
        </div>
      )}
      {actividad.costoEstimadoCentesimos !== null && (
        <div className="tarjeta actividad__dato">
          <p className="actividad__dato-titulo">Traslado estimado</p>
          <p className="actividad__dato-valor">{formatearMonto(actividad.costoEstimadoCentesimos)}</p>
        </div>
      )}
    </section>
  );
}

function Organizador({ organizador }: { organizador: DetalleActividad['organizador'] }) {
  if (organizador === null) {
    return <p className="texto-suave">Organiza: usuario eliminado</p>;
  }
  return (
    <Link to={`/usuarios/${organizador.id}`} className="actividad__organizador">
      <Avatar nombre={organizador.nombre} fotoUrl={organizador.fotoUrl} tamano={40} />
      <span>Organiza {organizador.nombre}</span>
    </Link>
  );
}

/** CU09 E1 (cancelada), RN4 (iniciada: fecha límite de gastos) y RN5 (archivada: solo lectura). */
function AvisoDeEstado({ actividad }: { actividad: DetalleActividad }) {
  if (actividad.estado === 'cancelada') {
    return (
      <p className="aviso-error" role="status">
        Esta actividad fue cancelada.
      </p>
    );
  }
  if (actividad.estado === 'iniciada' && actividad.fechaLimiteGastos) {
    return (
      <p className="aviso-info" role="status">
        La actividad ya comenzó. Se pueden registrar gastos y pagos hasta el {formatearFechaHora(actividad.fechaLimiteGastos)}.
      </p>
    );
  }
  if (actividad.estado === 'archivada') {
    return (
      <p className="aviso-info" role="status">
        Esta actividad está archivada: se puede consultar en modo solo lectura.
      </p>
    );
  }
  return null;
}

/**
 * CU09 FP paso 2: información ambiental disponible. Sin información queda en una línea, para no ocupar lugar con un
 * aviso vacío. Pendiente: CU15 – mostrar los datos ambientales detallados.
 */
function Pronostico({ actividad }: { actividad: DetalleActividad }) {
  const { pronostico } = actividad;
  if (pronostico === null) {
    return (
      <section className="tarjeta actividad__pronostico actividad__pronostico--vacio" aria-label="Pronóstico para la actividad">
        <p>
          <strong>Pronóstico:</strong> no disponible.
        </p>
      </section>
    );
  }
  return (
    <section className="tarjeta actividad__pronostico" aria-labelledby="titulo-pronostico">
      <h2 id="titulo-pronostico">Pronóstico para la actividad</h2>
      {pronostico.nivelRecomendado && (
        <p className="actividad__nivel-recomendado">
          Apto para nivel {ETIQUETA_NIVEL[pronostico.nivelRecomendado].toLowerCase()}.
        </p>
      )}
      <p>{pronostico.resumen}</p>
      <p className="texto-suave actividad__pie-pronostico">Actualizado {formatearFechaHora(pronostico.fechaGeneracion)}</p>
    </section>
  );
}

/**
 * CU09 FP paso 4 y RN2: la acción principal grande, las de un toque como botones con ícono y el resto en
 * "Más opciones". Solo las que la API habilitó; unirse (CU11) ya funciona, el resto queda deshabilitado
 * hasta que exista su caso de uso.
 */
function Acciones({ actividad, alUnirse }: { actividad: DetalleActividad; alUnirse: () => void }) {
  const principal = accionPrincipal(actividad.opciones);
  const rapidas = accionesOfrecidas(ACCIONES_RAPIDAS, actividad.opciones);
  const delMenu = accionesOfrecidas(ACCIONES_DEL_MENU, actividad.opciones);
  if (principal === null && rapidas.length === 0 && delMenu.length === 0) {
    return null;
  }

  return (
    <section className="tarjeta actividad__acciones" aria-label="Acciones">
      {principal && (
        <button type="button" className="boton actividad__accion-principal" onClick={alUnirse}>
          {principal.etiqueta}
        </button>
      )}
      <div className="actividad__acciones-secundarias">
        {rapidas.map((accion) => (
          <button
            key={accion.opcion}
            type="button"
            className="boton-secundario boton-con-icono"
            disabled
            title={pendiente(accion)}
          >
            {accion.opcion === 'compartir' ? <IconoCompartir /> : <IconoSilenciar />}
            {accion.etiqueta}
          </button>
        ))}
        {delMenu.length > 0 && <MenuDeOpciones acciones={delMenu} />}
      </div>
      {/* Que un botón apagado no parezca roto: se avisa a la vista, no solo al pasar el mouse */}
      {(rapidas.length > 0 || delMenu.length > 0) && (
        <p className="actividad__proximamente">Estas opciones van a estar disponibles próximamente.</p>
      )}
    </section>
  );
}

/** "Más opciones" (⋯): acciones menos frecuentes; las que sacan al usuario o terminan la actividad, al final y en rojo. */
function MenuDeOpciones({ acciones }: { acciones: OpcionPendiente[] }) {
  return (
    <details className="menu-opciones">
      <summary className="boton-secundario boton-icono" aria-label="Más opciones" title="Más opciones">
        <IconoMasOpciones />
      </summary>
      <div className="menu-opciones__lista" role="menu">
        {acciones.map((accion) => (
          <button
            key={accion.opcion}
            type="button"
            role="menuitem"
            className={accion.esPeligrosa ? 'menu-opciones__item menu-opciones__item--peligro' : 'menu-opciones__item'}
            disabled
            title={pendiente(accion)}
          >
            {accion.etiqueta}
          </button>
        ))}
      </div>
    </details>
  );
}

function pendiente(accion: OpcionPendiente): string {
  return `Disponible con el ${accion.casoDeUso}`;
}

interface PropsPestanas {
  actividad: DetalleActividad;
  participantes: EstadoParticipantes;
  valoraciones: EstadoMisValoraciones | null;
  pestanaActiva: PestanaDeActividad;
  alElegirPestana: (pestana: PestanaDeActividad) => void;
}

/** Participantes (A1), Chat y Gastos en la misma pantalla, como pestañas. */
function Pestanas({ actividad, participantes, valoraciones, pestanaActiva, alElegirPestana }: PropsPestanas) {
  const pestanas = pestanasDisponibles(actividad.opciones);
  const definicionActiva = pestanas.find(({ pestana }) => pestana === pestanaActiva) ?? pestanas[0];

  if (definicionActiva === undefined) {
    return null;
  }

  // Una sola pestaña no se muestra como pestaña: queda como título de la sección
  if (pestanas.length === 1) {
    return (
      <section className="tarjeta actividad__pestanas" aria-labelledby="titulo-unica-seccion">
        <h2 id="titulo-unica-seccion" className="actividad__titulo-seccion">
          {tituloDePestana(definicionActiva, actividad)}
        </h2>
        <ContenidoDePestana
          definicion={definicionActiva}
          actividad={actividad}
          participantes={participantes}
          valoraciones={valoraciones}
        />
      </section>
    );
  }

  return (
    <section className="tarjeta actividad__pestanas">
      <div className="pestanas" role="tablist" aria-label="Secciones de la actividad">
        {pestanas.map(({ pestana, etiqueta }) => (
          <button
            key={pestana}
            type="button"
            role="tab"
            id={`pestana-${pestana}`}
            aria-selected={pestana === definicionActiva.pestana}
            aria-controls={`panel-${pestana}`}
            className="pestanas__pestana"
            onClick={() => alElegirPestana(pestana)}
          >
            {tituloDePestana({ pestana, etiqueta }, actividad)}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${definicionActiva.pestana}`} aria-labelledby={`pestana-${definicionActiva.pestana}`}>
        <ContenidoDePestana
          definicion={definicionActiva}
          actividad={actividad}
          participantes={participantes}
          valoraciones={valoraciones}
        />
      </div>
    </section>
  );
}

/** Participantes muestra cuántos lugares están ocupados (incluye invitados externos, que tienen fila propia). */
function tituloDePestana(
  { pestana, etiqueta }: Pick<DefinicionDePestana, 'pestana' | 'etiqueta'>,
  actividad: DetalleActividad,
): string {
  return pestana === 'participantes' ? `${etiqueta} (${actividad.cuposOcupados})` : etiqueta;
}

interface PropsContenido {
  definicion: DefinicionDePestana;
  actividad: DetalleActividad;
  participantes: EstadoParticipantes;
  valoraciones: EstadoMisValoraciones | null;
}

function ContenidoDePestana({ definicion, actividad, participantes, valoraciones }: PropsContenido) {
  // Pendiente: CU16 (chat grupal) y CU34 (gastos y balances)
  if (definicion.casoDeUsoPendiente !== null) {
    return <p className="texto-suave">Disponible con el {definicion.casoDeUsoPendiente}.</p>;
  }
  // CU09 A1: con la opción de remover si es el organizador (pendiente CU31) y las valoraciones (CU21)
  return (
    <ParticipantesDeActividad
      actividadId={actividad.id}
      lista={participantes}
      puedeRemover={actividad.opciones.includes('removerParticipantes')}
      valoraciones={valoraciones}
    />
  );
}
