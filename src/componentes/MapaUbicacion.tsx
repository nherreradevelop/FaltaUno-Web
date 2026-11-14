import { useEffect, useRef, useState } from 'react';
import { detalleUbicacion, resolverPunto, type Coordenadas, type LugarActividad } from '../api/actividades';
import { cargarGoogleMaps } from '../infra/google-maps';
import { obtenerUbicacionActual } from '../infra/geolocalizacion';
import { crearMarcadorPin, type MarcadorPin } from '../infra/marcador-pin';

interface Props {
  centroInicial: Coordenadas;
  valor: LugarActividad | null;
  deshabilitado?: boolean;
  alConfirmar: (lugar: LugarActividad) => void;
  alCancelar: () => void;
}

/** Selección explícita de un pin: moverlo no consulta al proveedor; confirmar valida una vez en la API. */
export function MapaUbicacion({ centroInicial, valor, deshabilitado, alConfirmar, alCancelar }: Props) {
  const { lat: centroLat, lng: centroLng } = centroInicial;
  const puntoActual = useRef<Coordenadas | null>(null);
  const ubicacionEnCurso = useRef<AbortController | null>(null);
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<google.maps.Map | null>(null);
  const marcar = useRef<((punto: Coordenadas) => void) | null>(null);
  const montado = useRef(false);
  const [punto, setPunto] = useState<Coordenadas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [validando, setValidando] = useState(false);
  const [localizando, setLocalizando] = useState(false);
  const [precisionMetros, setPrecisionMetros] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    montado.current = true;
    let vigente = true;
    let marcador: MarcadorPin | null = null;
    const listeners: google.maps.MapsEventListener[] = [];
    const elemento = contenedor.current;
    async function iniciar() {
      try {
        const ubicacionInicial = valor?.placeId && !valor.provisional ? detalleUbicacion(valor.placeId) : Promise.resolve(valor);
        const [{ Map, OverlayView }, ubicacion] = await Promise.all([cargarGoogleMaps(), ubicacionInicial]);
        if (!vigente || !elemento) return;
        const centro =
          ubicacion?.lat !== undefined && ubicacion.lng !== undefined ? ubicacion : { lat: centroLat, lng: centroLng };
        const instancia = new Map(elemento, {
          center: { lat: centro.lat!, lng: centro.lng! },
          zoom: 14,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: 'cooperative',
        });
        mapa.current = instancia;
        marcar.current = (nuevo) => {
          if (!vigente) return;
          ubicacionEnCurso.current?.abort();
          setPrecisionMetros(null);
          puntoActual.current = nuevo;
          setPunto(nuevo);
          setError('');
          if (!marcador) {
            marcador = crearMarcadorPin(OverlayView, instancia, nuevo, (coordenadas) => {
              if (!vigente) return;
              ubicacionEnCurso.current?.abort();
              setPrecisionMetros(null);
              puntoActual.current = coordenadas;
              setPunto(coordenadas);
              setError('');
            });
          } else marcador.mover(nuevo);
        };
        listeners.push(
          instancia.addListener('click', (evento: google.maps.MapMouseEvent) => {
            if (evento.latLng) marcar.current?.(evento.latLng.toJSON());
          }),
        );
        if (valor?.tipo === 'pin' && valor.lat !== undefined && valor.lng !== undefined) marcar.current(valor as Coordenadas);
        setCargando(false);
      } catch {
        if (vigente) {
          setError('No pudimos abrir el mapa. Podés volver a buscar un lugar por nombre.');
          setCargando(false);
        }
      }
    }
    void iniciar();
    return () => {
      vigente = false;
      montado.current = false;
      ubicacionEnCurso.current?.abort();
      ubicacionEnCurso.current = null;
      listeners.forEach((listener) => listener.remove());
      marcador?.quitar();
      marcar.current = null;
      mapa.current = null;
      elemento?.replaceChildren();
    };
  }, [centroLat, centroLng, valor]);

  async function usarMiUbicacion() {
    if (ubicacionEnCurso.current || validando || deshabilitado || !mapa.current || !marcar.current) return;
    const controlador = new AbortController();
    ubicacionEnCurso.current = controlador;
    setLocalizando(true);
    setError('');
    try {
      const ubicacion = await obtenerUbicacionActual(undefined, controlador.signal);
      if (!montado.current || controlador.signal.aborted) return;
      ubicacionEnCurso.current = null;
      const coordenadas = { lat: ubicacion.lat, lng: ubicacion.lng };
      marcar.current?.(coordenadas);
      mapa.current?.panTo(coordenadas);
      setPrecisionMetros(ubicacion.precisionMetros);
    } catch (fallo) {
      if (montado.current && !controlador.signal.aborted) {
        setError(fallo instanceof Error ? fallo.message : 'No pudimos obtener tu ubicación. Podés marcar el punto manualmente.');
      }
    } finally {
      if (ubicacionEnCurso.current === controlador) ubicacionEnCurso.current = null;
      if (montado.current) setLocalizando(false);
    }
  }

  async function confirmar() {
    if (!punto || validando || localizando || deshabilitado) return;
    setValidando(true);
    setError('');
    try {
      const ubicacion = await resolverPunto(punto);
      if (montado.current && (puntoActual.current?.lat !== punto.lat || puntoActual.current?.lng !== punto.lng)) {
        setError('El punto cambió mientras se validaba. Confirmá el nuevo punto.');
        return;
      }
      if (montado.current)
        alConfirmar({ placeId: null, tipo: 'pin', descripcion: ubicacion.direccion, lat: punto.lat, lng: punto.lng });
    } catch (fallo) {
      if (montado.current) setError(fallo instanceof Error ? fallo.message : 'No pudimos validar el punto.');
    } finally {
      if (montado.current) setValidando(false);
    }
  }

  return (
    <section className="mapa-ubicacion" aria-label="Marcar un punto en el mapa" aria-busy={cargando || validando || localizando}>
      <p>Tocá el mapa para colocar el pin. Podés arrastrarlo antes de confirmar.</p>
      {cargando && <p role="status">Cargando mapa…</p>}
      <div className="mapa-ubicacion__contenedor">
        <div className="mapa-ubicacion__lienzo" ref={contenedor} />
        <button
          type="button"
          className="mapa-ubicacion__mi-ubicacion"
          disabled={cargando || validando || localizando || deshabilitado || !mapa.current}
          onClick={() => void usarMiUbicacion()}
        >
          {localizando ? 'Obteniendo ubicación…' : 'Usar mi ubicación'}
        </button>
      </div>
      {localizando && <p role="status">Esperando tu ubicación. El navegador puede pedirte permiso.</p>}
      {precisionMetros !== null && (
        <p role="status">Ubicación aproximada (±{Math.ceil(precisionMetros)} m). Podés ajustar el pin antes de confirmar.</p>
      )}
      {punto && (
        <p className="mapa-ubicacion__coordenadas">
          Punto seleccionado: {punto.lat.toFixed(6)}, {punto.lng.toFixed(6)}
        </p>
      )}
      {error && (
        <p className="campo__error" role="alert">
          {error}
        </p>
      )}
      <div className="mapa-ubicacion__acciones">
        <button
          type="button"
          disabled={cargando || validando || deshabilitado || !mapa.current}
          onClick={() => {
            const centro = mapa.current?.getCenter();
            if (centro) marcar.current?.(centro.toJSON());
          }}
        >
          Marcar el centro del mapa
        </button>
        <button type="button" disabled={!punto || validando || localizando || deshabilitado} onClick={() => void confirmar()}>
          {validando ? 'Validando punto…' : 'Usar este punto'}
        </button>
        <button type="button" disabled={validando || deshabilitado} onClick={alCancelar}>
          Volver a buscar lugar
        </button>
      </div>
      <small>Se conserva el punto del pin; la dirección identificada puede ser una referencia cercana.</small>
    </section>
  );
}
