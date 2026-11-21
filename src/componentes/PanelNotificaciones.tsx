import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  listarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLasNotificacionesLeidas,
  type Notificacion,
} from '../api/notificaciones';
import {
  agregarAlPrincipio,
  haceCuanto,
  marcarLeidaEnLaLista,
  MENSAJES_NOTIFICACIONES,
  rutaDeDestino,
} from '../notificaciones/notificaciones';
import { useNotificaciones } from '../notificaciones/ProveedorNotificaciones';

type Carga = 'inicial' | 'mas' | null;

/**
 * CU40 FP pasos 3 a 7: lista de notificaciones en un panel desplegable debajo de la campana.
 * Ver la lista no marca nada como leído (RN5, A4).
 */
export function PanelNotificaciones({ alCerrar }: { alCerrar: () => void }) {
  const navegar = useNavigate();
  const { noLeidas, actualizarNoLeidas, nuevas, refrescarNoLeidas } = useNotificaciones();
  const [lista, setLista] = useState<Notificacion[]>([]);
  const [hayMas, setHayMas] = useState(false);
  const [carga, setCarga] = useState<Carga>('inicial');
  const [error, setError] = useState<string | null>(null);
  const [marcandoTodas, setMarcandoTodas] = useState(false);
  const [intento, setIntento] = useState(0);
  // A5: id de la notificación que se está marcando como leída sin abrirla
  const [marcandoUna, setMarcandoUna] = useState<string | null>(null);

  // FP paso 3: primera página. "intento" la vuelve a pedir con "Reintentar" (ER1).
  useEffect(() => {
    let vigente = true;
    listarNotificaciones(null)
      .then((pagina) => {
        if (!vigente) return;
        setLista(pagina.notificaciones);
        setHayMas(pagina.hayMas);
        setError(null);
      })
      .catch(() => {
        if (vigente) setError(MENSAJES_NOTIFICACIONES.errorAlCargar);
      })
      .finally(() => {
        if (vigente) setCarga(null);
      });
    return () => {
      vigente = false;
    };
  }, [intento]);

  // Al abrir el panel se actualiza también el indicador, por si cambió mientras estaba cerrado
  useEffect(() => {
    refrescarNoLeidas();
    // Solo al abrir: refrescarNoLeidas cambia en cada render del proveedor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A3: con el panel abierto, las nuevas se agregan arriba sin mover lo que el usuario está mirando
  useEffect(() => {
    const desuscribir = nuevas.suscribir((notificacion) => setLista((anterior) => agregarAlPrincipio(anterior, notificacion)));
    return desuscribir;
  }, [nuevas]);

  function reintentar() {
    setCarga('inicial');
    setError(null);
    setIntento((anterior) => anterior + 1);
  }

  /** A2: pide las 20 anteriores a la última que se muestra. */
  async function verMas() {
    const ultima = lista[lista.length - 1];
    if (!ultima || carga) return;
    setCarga('mas');
    setError(null);
    try {
      const pagina = await listarNotificaciones(ultima.id);
      setLista((anterior) => [...anterior, ...pagina.notificaciones]);
      setHayMas(pagina.hayMas);
    } catch {
      setError(MENSAJES_NOTIFICACIONES.errorAlCargar); // ER1: se conserva lo que ya se mostraba
    } finally {
      setCarga(null);
    }
  }

  /** FP pasos 5 a 7. */
  async function abrir(notificacion: Notificacion) {
    if (!notificacion.leida) {
      try {
        actualizarNoLeidas(await marcarNotificacionLeida(notificacion.id));
        setLista((anterior) => marcarLeidaEnLaLista(anterior, notificacion.id));
      } catch {
        // ER2: igual se lleva al usuario a la pantalla; el indicador queda con lo que confirmó la API
      }
    }
    const ruta = rutaDeDestino(notificacion.destino);
    if (ruta) {
      alCerrar();
      navegar(ruta); // E2: la pantalla de destino muestra el estado actual (por ejemplo, actividad cancelada)
    }
  }

  /** A5: marca una como leída sin abrirla; el usuario se queda en el panel. */
  async function marcarComoLeida(notificacion: Notificacion) {
    if (marcandoUna) return;
    setMarcandoUna(notificacion.id);
    setError(null);
    try {
      actualizarNoLeidas(await marcarNotificacionLeida(notificacion.id));
      setLista((anterior) => marcarLeidaEnLaLista(anterior, notificacion.id));
    } catch {
      setError(MENSAJES_NOTIFICACIONES.errorAlMarcarUna); // ER2: queda sin leer
    } finally {
      setMarcandoUna(null);
    }
  }

  /** A1: marca las recibidas hasta este momento. */
  async function marcarTodas() {
    const hasta = new Date();
    setMarcandoTodas(true);
    try {
      actualizarNoLeidas(await marcarTodasLasNotificacionesLeidas(hasta));
      setLista((anterior) => anterior.map((n) => (new Date(n.creadaEn) <= hasta ? { ...n, leida: true } : n)));
    } catch {
      setError(MENSAJES_NOTIFICACIONES.errorAlMarcarTodas); // ER2
    } finally {
      setMarcandoTodas(false);
    }
  }

  const sinNotificaciones = carga === null && !error && lista.length === 0;

  return (
    <section className="notificaciones__panel" role="dialog" aria-labelledby="notificaciones-titulo">
      <div className="notificaciones__encabezado">
        <h2 id="notificaciones-titulo">Notificaciones</h2>
        {noLeidas > 0 && (
          <button
            type="button"
            className="boton-enlace"
            onClick={() => void marcarTodas()}
            disabled={marcandoTodas}
            aria-busy={marcandoTodas}
          >
            {marcandoTodas ? 'Marcando…' : 'Marcar todas como leídas'}
          </button>
        )}
      </div>

      {carga === 'inicial' && (
        <div className="esqueleto notificaciones__esqueleto" role="status" aria-label="Cargando notificaciones">
          <div className="esqueleto__bloque notificaciones__esqueleto-item" />
          <div className="esqueleto__bloque notificaciones__esqueleto-item" />
          <div className="esqueleto__bloque notificaciones__esqueleto-item" />
        </div>
      )}

      {sinNotificaciones && <p className="notificaciones__vacio">{MENSAJES_NOTIFICACIONES.vacio}</p>}

      {lista.length > 0 && (
        <ul className="notificaciones__lista">
          {lista.map((notificacion) => (
            <li key={notificacion.id} className={`notificacion-fila${notificacion.leida ? '' : ' notificacion-fila--no-leida'}`}>
              <button type="button" className="notificacion" onClick={() => void abrir(notificacion)}>
                <span className="notificacion__punto" aria-hidden="true" />
                <span className="notificacion__texto">
                  {!notificacion.leida && <span className="sr-only">Sin leer: </span>}
                  {notificacion.texto}
                </span>
                <time className="notificacion__tiempo" dateTime={notificacion.creadaEn}>
                  {haceCuanto(notificacion.creadaEn)}
                </time>
              </button>
              {notificacion.leida ? (
                // Mantiene el ancho de la columna para que los textos queden alineados
                <span className="notificacion__espacio-accion" aria-hidden="true" />
              ) : (
                <button
                  type="button"
                  className="notificacion__marcar-leida"
                  aria-label={`Marcar como leída: ${notificacion.texto}`}
                  title="Marcar como leída"
                  onClick={() => void marcarComoLeida(notificacion)}
                  disabled={marcandoUna !== null}
                  aria-busy={marcandoUna === notificacion.id}
                >
                  <span aria-hidden="true">✓</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <div className="aviso-error notificaciones__error" role="alert">
          <span>{error}</span>
          {lista.length === 0 && (
            <button type="button" className="boton-secundario" onClick={reintentar}>
              Reintentar
            </button>
          )}
        </div>
      )}

      {hayMas && !error && (
        <button
          type="button"
          className="boton-secundario notificaciones__ver-mas"
          onClick={() => void verMas()}
          disabled={carga === 'mas'}
          aria-busy={carga === 'mas'}
        >
          {carga === 'mas' ? 'Cargando…' : 'Ver más'}
        </button>
      )}
    </section>
  );
}
