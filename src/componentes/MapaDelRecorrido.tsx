import { useCallback, useEffect, useRef, useState } from 'react';
import type { Ubicacion } from '../api/tipos';
import { esElMismoLugar, urlDeMapaEmbebido, urlDeRecorridoEnGoogleMaps } from '../comun/formato';
import { colorDeAvatar } from '../comun/formato';
import {
  cargarGoogleMaps,
  hayClaveDeGoogleMaps,
  ID_DE_MAPA,
  type BibliotecaCentral,
  type BibliotecaDeMarcadores,
  type MapaDeGoogle,
  type MarcadorDeGoogle,
} from '../comun/googleMaps';
import {
  inicialDelParticipante,
  LEYENDA_DEL_MAPA,
  tituloDelPuntoDePartida,
  type PuntoDePartidaEnMapa,
} from '../comun/puntosDePartida';
import { colorDelTema } from '../comun/tema';

const ZOOM_DE_UN_LUGAR = 15;
const RELLENO_ALREDEDOR_DE_LOS_PUNTOS = 48;

interface PropsMapa {
  origen: Ubicacion;
  destino: Ubicacion;
}

interface PropsMapaDelRecorrido {
  /** null si la actividad no tiene punto de partida (CU10: el origen es opcional). */
  origen: Ubicacion | null;
  destino: Ubicacion;
  /** CU11 paso 5: puntos de partida de los participantes. Vacío si no hay o si quien mira no forma parte. */
  puntosDePartida: PuntoDePartidaEnMapa[];
}

/**
 * CU09 A2: "Cómo llegar": salida y destino juntos con un mapa de Google Maps. Sin salida, solo el destino.
 * En el mapa interactivo también se marcan los puntos de partida de los participantes, con otro tipo de marcador.
 */
export function MapaDelRecorrido({ origen: origenIndicado, destino, puntosDePartida }: PropsMapaDelRecorrido) {
  // Si el interactivo falla (key inválida), se vuelve al embebido, que no admite marcadores propios
  const [interactivoFallo, setInteractivoFallo] = useState(false);
  // Estable: es dependencia del efecto que crea el mapa
  const alFallarInteractivo = useCallback(() => setInteractivoFallo(true), []);
  // Sin punto de partida, el recorrido es un solo lugar: el destino
  const origen = origenIndicado ?? destino;
  const unSoloLugar = esElMismoLugar(origen, destino);
  const descripcionDelMapa = unSoloLugar
    ? `Mapa de ${destino.direccion}`
    : `Recorrido de ${origen.direccion} a ${destino.direccion}`;
  const usaMapaInteractivo = hayClaveDeGoogleMaps() && !interactivoFallo;
  const mostrarPuntosDePartida = usaMapaInteractivo && puntosDePartida.length > 0;
  return (
    <section className="tarjeta mapa" aria-labelledby="titulo-mapa">
      <h2 id="titulo-mapa">Cómo llegar</h2>
      {unSoloLugar ? (
        <PuntoDelRecorrido tipo="destino" titulo="Lugar" direccion={destino.direccion} enLista={false} />
      ) : (
        <ol className="recorrido">
          <PuntoDelRecorrido tipo="origen" titulo={LEYENDA_DEL_MAPA.salida} direccion={origen.direccion} enLista />
          <PuntoDelRecorrido tipo="destino" titulo={LEYENDA_DEL_MAPA.destino} direccion={destino.direccion} enLista />
        </ol>
      )}
      {/* Sin key de Google Maps se usa el mapa embebido, que funciona sin configurar nada */}
      {usaMapaInteractivo ? (
        <MapaInteractivo
          origen={origen}
          destino={destino}
          puntosDePartida={puntosDePartida}
          descripcion={descripcionDelMapa}
          alFallar={alFallarInteractivo}
        />
      ) : (
        <MapaEmbebido origen={origen} destino={destino} descripcion={descripcionDelMapa} />
      )}
      {mostrarPuntosDePartida && (
        <p className="recorrido__leyenda">
          <span className="recorrido__marca recorrido__marca--participante" aria-hidden="true" />
          {LEYENDA_DEL_MAPA.participantes} ({puntosDePartida.length})
        </p>
      )}
      <a href={urlDeRecorridoEnGoogleMaps(origen, destino)} target="_blank" rel="noopener noreferrer" className="mapa__enlace">
        Abrir en Google Maps
      </a>
    </section>
  );
}

interface PropsDibujo extends PropsMapa {
  descripcion: string;
}

interface PropsMapaInteractivo extends PropsDibujo {
  puntosDePartida: PuntoDePartidaEnMapa[];
  alFallar: () => void;
}

/** El mapa ya dibujado, con lo necesario para agregarle marcadores después. */
interface MapaDibujado {
  mapa: MapaDeGoogle;
  LatLngBounds: BibliotecaCentral['LatLngBounds'];
  AdvancedMarkerElement: BibliotecaDeMarcadores['AdvancedMarkerElement'];
}

/**
 * Mapa de la Maps JavaScript API con un marcador en la salida, otro en el destino y uno por cada punto de partida.
 * Son dos efectos: el mapa se crea una vez por recorrido, y los puntos de partida (que llegan después, con la lista
 * de participantes) se agregan sin volver a crear el mapa.
 */
function MapaInteractivo({ origen, destino, puntosDePartida, descripcion, alFallar }: PropsMapaInteractivo) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [dibujado, setDibujado] = useState<MapaDibujado | null>(null);

  useEffect(() => {
    const elemento = contenedor.current;
    if (!elemento) {
      return;
    }
    let vigente = true;
    const marcadores: MarcadorDeGoogle[] = [];
    // Key inválida o API sin habilitar: Google avisa con esta función global y se vuelve al mapa embebido
    window.gm_authFailure = () => {
      if (vigente) alFallar();
    };

    dibujarRecorrido(elemento, origen, destino, () => vigente)
      .then((resultado) => {
        if (resultado === null) return;
        marcadores.push(...resultado.marcadores);
        setDibujado(resultado.dibujado);
      })
      .catch((error: unknown) => {
        console.error('No se pudo mostrar el mapa interactivo; se usa el embebido', error);
        if (vigente) alFallar();
      });

    return () => {
      vigente = false;
      for (const marcador of marcadores) {
        marcador.map = null;
      }
      setDibujado(null);
      window.gm_authFailure = undefined;
    };
  }, [origen, destino, alFallar]);

  useEffect(() => {
    if (dibujado === null || puntosDePartida.length === 0) {
      return;
    }
    const marcadores = marcarPuntosDePartida(dibujado, puntosDePartida);
    encuadrar(dibujado, [origen, destino, ...puntosDePartida]);
    return () => {
      for (const marcador of marcadores) {
        marcador.map = null;
      }
    };
  }, [dibujado, origen, destino, puntosDePartida]);

  return <div ref={contenedor} className="mapa__marco" role="region" aria-label={descripcion} />;
}

/** CU11 paso 5: un marcador circular con la inicial y el color de avatar de cada participante. */
function marcarPuntosDePartida(dibujado: MapaDibujado, puntos: PuntoDePartidaEnMapa[]): MarcadorDeGoogle[] {
  return puntos.map((punto) => {
    const contenido = document.createElement('span');
    contenido.className = 'mapa__pin-participante';
    contenido.textContent = inicialDelParticipante(punto.nombre);
    contenido.style.background = colorDeAvatar(punto.nombre);
    return new dibujado.AdvancedMarkerElement({
      map: dibujado.mapa,
      position: { lat: punto.lat, lng: punto.lng },
      title: tituloDelPuntoDePartida(punto),
      content: contenido,
    });
  });
}

/** Ajusta el mapa para que entren todos los puntos. */
function encuadrar(dibujado: MapaDibujado, puntos: { lat: number; lng: number }[]): void {
  const limites = new dibujado.LatLngBounds();
  for (const punto of puntos) {
    limites.extend({ lat: punto.lat, lng: punto.lng });
  }
  dibujado.mapa.fitBounds(limites, RELLENO_ALREDEDOR_DE_LOS_PUNTOS);
}

/**
 * Crea el mapa y los marcadores de salida y destino. Con un solo lugar, un marcador centrado; con dos, el mapa se
 * encuadra para que entren los dos. Devuelve los marcadores (para sacarlos al desmontar) y lo necesario para
 * agregar los puntos de partida. null si el componente se desmontó mientras cargaba.
 */
async function dibujarRecorrido(
  elemento: HTMLElement,
  origen: Ubicacion,
  destino: Ubicacion,
  sigueVigente: () => boolean,
): Promise<{ marcadores: MarcadorDeGoogle[]; dibujado: MapaDibujado } | null> {
  const google = await cargarGoogleMaps();
  const [{ Map }, { LatLngBounds }, { AdvancedMarkerElement, PinElement }] = await Promise.all([
    google.maps.importLibrary('maps'),
    google.maps.importLibrary('core'),
    google.maps.importLibrary('marker'),
  ]);
  if (!sigueVigente()) {
    return null;
  }

  const puntoDeDestino = { lat: destino.lat, lng: destino.lng };
  const mapa = new Map(elemento, {
    center: puntoDeDestino,
    zoom: ZOOM_DE_UN_LUGAR,
    mapId: ID_DE_MAPA,
    streetViewControl: false,
    mapTypeControl: false,
    // Con un dedo se scrollea la página; para mover el mapa se usan dos (o Ctrl + rueda en la compu)
    gestureHandling: 'cooperative',
  });

  // Mismos colores que las marcas de la lista de salida y destino (estilos.css: .recorrido__marca)
  const colorOrigen = colorDelTema('--color-primario');
  const colorDestino = colorDelTema('--color-acento');
  const colorSuperficie = colorDelTema('--color-superficie');
  const pinDeDestino = new PinElement({ background: colorDestino, borderColor: colorDestino, glyphColor: colorSuperficie });
  const marcadores = [
    new AdvancedMarkerElement({ map: mapa, position: puntoDeDestino, title: destino.direccion, content: pinDeDestino }),
  ];

  if (!esElMismoLugar(origen, destino)) {
    const puntoDeOrigen = { lat: origen.lat, lng: origen.lng };
    const pinDeOrigen = new PinElement({ background: colorSuperficie, borderColor: colorOrigen, glyphColor: colorOrigen });
    marcadores.push(
      new AdvancedMarkerElement({ map: mapa, position: puntoDeOrigen, title: origen.direccion, content: pinDeOrigen }),
    );
    const limites = new LatLngBounds();
    limites.extend(puntoDeOrigen);
    limites.extend(puntoDeDestino);
    mapa.fitBounds(limites, RELLENO_ALREDEDOR_DE_LOS_PUNTOS);
  }
  return { marcadores, dibujado: { mapa, LatLngBounds, AdvancedMarkerElement } };
}

/** Mapa embebido de Google Maps: no necesita key. Se usa sin key configurada o si el interactivo falla. */
function MapaEmbebido({ origen, destino, descripcion }: PropsDibujo) {
  return (
    <iframe
      className="mapa__marco"
      title={descripcion}
      src={urlDeMapaEmbebido(origen, destino)}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}

interface PropsPunto {
  tipo: 'origen' | 'destino';
  titulo: string;
  direccion: string;
  /** Con dos lugares cada punto es un elemento de la lista ordenada (salida → destino); con uno solo, un párrafo. */
  enLista: boolean;
}

function PuntoDelRecorrido({ tipo, titulo, direccion, enLista }: PropsPunto) {
  const contenido = (
    <>
      <span className={`recorrido__marca recorrido__marca--${tipo}`} aria-hidden="true" />
      <span>
        <span className="recorrido__titulo">{titulo}</span>
        <span className="recorrido__direccion">{direccion}</span>
      </span>
    </>
  );
  return enLista ? <li className="recorrido__punto">{contenido}</li> : <p className="recorrido__punto">{contenido}</p>;
}
