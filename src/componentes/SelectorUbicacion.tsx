import { useEffect, useState } from 'react';
import { ErrorApi } from '../api/cliente';
import { buscarUbicaciones, type Coordenadas, type LugarActividad } from '../api/actividades';
import { Campo } from './Campo';
import { MapaUbicacion } from './MapaUbicacion';
import { nuevaClave } from '../comun/formularioActividad';

interface Props {
  id: string;
  centroInicial: Coordenadas;
  etiqueta: string;
  valor: LugarActividad | null;
  alCambiar: (valor: LugarActividad | null) => void;
  deshabilitado?: boolean;
  alNoDisponible?: () => void;
  error?: string;
}

/** CU10 E4: selección explícita, debounce y descarte de respuestas de búsquedas anteriores. */
export function SelectorUbicacion({
  id,
  centroInicial,
  etiqueta,
  valor,
  alCambiar,
  deshabilitado,
  alNoDisponible,
  error: errorValidacion,
}: Props) {
  const [mapaAbierto, setMapaAbierto] = useState(false);
  const [texto, setTexto] = useState(valor?.descripcion ?? '');
  const [sesion] = useState(nuevaClave);
  const [sugerencias, setSugerencias] = useState<LugarActividad[]>([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  useEffect(() => {
    if (valor || texto.trim().length < 3 || deshabilitado || mapaAbierto) return;
    let vigente = true;
    const temporizador = setTimeout(() => {
      setCargando(true);
      setError('');
      buscarUbicaciones(texto, sesion)
        .then((lugares) => {
          if (vigente) {
            setSugerencias(lugares);
            if (lugares.length === 0) setError('No encontramos lugares. Probá con otra dirección.');
          }
        })
        .catch((fallo: unknown) => {
          if (vigente && fallo instanceof ErrorApi && fallo.estado === 503 && fallo.codigo.startsWith('MAPAS_'))
            alNoDisponible?.();
          if (vigente) setError(fallo instanceof Error ? fallo.message : 'No pudimos buscar ubicaciones.');
        })
        .finally(() => {
          if (vigente) setCargando(false);
        });
    }, 500);
    return () => {
      vigente = false;
      clearTimeout(temporizador);
    };
  }, [texto, sesion, valor, deshabilitado, alNoDisponible, mapaAbierto]);
  if (valor?.provisional)
    return (
      <div className="ubicacion">
        <Campo id={id} etiqueta={etiqueta} value={`${valor.lat}, ${valor.lng}`} readOnly />
        <small>Ubicación por defecto · pendiente de editar</small>
        <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${valor.lat},${valor.lng}`}>
          Ver ubicación por defecto
        </a>
      </div>
    );
  return (
    <div className="ubicacion">
      <Campo
        id={id}
        etiqueta={etiqueta}
        value={texto}
        autoComplete="off"
        disabled={deshabilitado}
        error={errorValidacion || error}
        onChange={(evento) => {
          setTexto(evento.target.value);
          setSugerencias([]);
          setError('');
          setCargando(false);
          alCambiar(null);
        }}
      />
      {!mapaAbierto && (
        <button
          type="button"
          className="ubicacion__abrir-mapa"
          disabled={deshabilitado}
          onClick={() => {
            setSugerencias([]);
            setMapaAbierto(true);
          }}
        >
          Marcar en mapa
        </button>
      )}
      {mapaAbierto && (
        <MapaUbicacion
          centroInicial={centroInicial}
          valor={valor}
          deshabilitado={deshabilitado}
          alCancelar={() => setMapaAbierto(false)}
          alConfirmar={(lugar) => {
            setMapaAbierto(false);
            setTexto(lugar.descripcion);
            alCambiar(lugar);
          }}
        />
      )}
      {cargando && !mapaAbierto && <p role="status">Buscando lugares…</p>}
      {sugerencias.length > 0 && !valor && !mapaAbierto && (
        <ul className="ubicacion__lista" aria-label={`Sugerencias de ${etiqueta}`}>
          {sugerencias.map((lugar) => (
            <li key={lugar.placeId}>
              <button
                type="button"
                onClick={() => {
                  setTexto(lugar.descripcion);
                  setSugerencias([]);
                  alCambiar(lugar);
                }}
              >
                {lugar.descripcion}
              </button>
            </li>
          ))}
        </ul>
      )}
      <small className="google-maps" translate="no">
        Google Maps
      </small>
      {valor && (
        <a
          target="_blank"
          rel="noreferrer"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(valor.tipo === 'pin' ? `${valor.lat},${valor.lng}` : valor.descripcion)}${valor.placeId ? `&query_place_id=${encodeURIComponent(valor.placeId)}` : ''}`}
        >
          {valor.tipo === 'pin' ? 'Ver pin en Google Maps' : 'Ver ubicación en Google Maps'}
        </a>
      )}
    </div>
  );
}
