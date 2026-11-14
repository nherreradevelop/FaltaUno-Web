import { useEffect, useRef, useState } from 'react';
import type { Ubicacion } from '../api/tipos';
import { esElMismoLugar, urlDeMapaEmbebido, urlDeRecorridoEnGoogleMaps } from '../comun/formato';
import { cargarGoogleMaps, hayClaveDeGoogleMaps, ID_DE_MAPA, type MarcadorDeGoogle } from '../comun/googleMaps';

// Mismos colores que las marcas de la lista de salida y destino (estilos.css: .recorrido__marca)
const COLOR_ORIGEN = '#1d6fb8';
const COLOR_DESTINO = '#ef7d22';
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
}

/** CU09 A2: "Cómo llegar": salida y destino juntos con un mapa de Google Maps. Sin salida, solo el destino. */
export function MapaDelRecorrido({ origen: origenIndicado, destino }: PropsMapaDelRecorrido) {
  // Sin punto de partida, el recorrido es un solo lugar: el destino
  const origen = origenIndicado ?? destino;
  const unSoloLugar = esElMismoLugar(origen, destino);
  const descripcionDelMapa = unSoloLugar
    ? `Mapa de ${destino.direccion}`
    : `Recorrido de ${origen.direccion} a ${destino.direccion}`;
  return (
    <section className="tarjeta mapa" aria-labelledby="titulo-mapa">
      <h2 id="titulo-mapa">Cómo llegar</h2>
      {unSoloLugar ? (
        <PuntoDelRecorrido tipo="destino" titulo="Lugar" direccion={destino.direccion} enLista={false} />
      ) : (
        <ol className="recorrido">
          <PuntoDelRecorrido tipo="origen" titulo="Salida" direccion={origen.direccion} enLista />
          <PuntoDelRecorrido tipo="destino" titulo="Destino" direccion={destino.direccion} enLista />
        </ol>
      )}
      {/* Sin key de Google Maps se usa el mapa embebido, que funciona sin configurar nada */}
      {hayClaveDeGoogleMaps() ? (
        <MapaInteractivo origen={origen} destino={destino} descripcion={descripcionDelMapa} />
      ) : (
        <MapaEmbebido origen={origen} destino={destino} descripcion={descripcionDelMapa} />
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

/** Mapa de la Maps JavaScript API con un marcador en la salida y otro en el destino. */
function MapaInteractivo({ origen, destino, descripcion }: PropsDibujo) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    const elemento = contenedor.current;
    if (!elemento) {
      return;
    }
    let vigente = true;
    const marcadores: MarcadorDeGoogle[] = [];
    // Key inválida o API sin habilitar: Google avisa con esta función global y se vuelve al mapa embebido
    window.gm_authFailure = () => {
      if (vigente) setFallo(true);
    };

    dibujarRecorrido(elemento, origen, destino, () => vigente)
      .then((creados) => marcadores.push(...creados))
      .catch((error: unknown) => {
        console.error('No se pudo mostrar el mapa interactivo; se usa el embebido', error);
        if (vigente) setFallo(true);
      });

    return () => {
      vigente = false;
      for (const marcador of marcadores) {
        marcador.map = null;
      }
      window.gm_authFailure = undefined;
    };
  }, [origen, destino]);

  if (fallo) {
    return <MapaEmbebido origen={origen} destino={destino} descripcion={descripcion} />;
  }
  return <div ref={contenedor} className="mapa__marco" role="region" aria-label={descripcion} />;
}

/**
 * Crea el mapa y los marcadores. Con un solo lugar, un marcador centrado; con dos, el mapa se encuadra para que
 * entren los dos. Devuelve los marcadores para poder sacarlos al desmontar.
 */
async function dibujarRecorrido(
  elemento: HTMLElement,
  origen: Ubicacion,
  destino: Ubicacion,
  sigueVigente: () => boolean,
): Promise<MarcadorDeGoogle[]> {
  const google = await cargarGoogleMaps();
  const [{ Map, LatLngBounds }, { AdvancedMarkerElement, PinElement }] = await Promise.all([
    google.maps.importLibrary('maps'),
    google.maps.importLibrary('marker'),
  ]);
  if (!sigueVigente()) {
    return [];
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

  const pinDeDestino = new PinElement({ background: COLOR_DESTINO, borderColor: COLOR_DESTINO, glyphColor: '#fff' });
  const marcadores = [
    new AdvancedMarkerElement({ map: mapa, position: puntoDeDestino, title: destino.direccion, content: pinDeDestino.element }),
  ];

  if (!esElMismoLugar(origen, destino)) {
    const puntoDeOrigen = { lat: origen.lat, lng: origen.lng };
    const pinDeOrigen = new PinElement({ background: '#fff', borderColor: COLOR_ORIGEN, glyphColor: COLOR_ORIGEN });
    marcadores.push(
      new AdvancedMarkerElement({ map: mapa, position: puntoDeOrigen, title: origen.direccion, content: pinDeOrigen.element }),
    );
    const limites = new LatLngBounds();
    limites.extend(puntoDeOrigen);
    limites.extend(puntoDeDestino);
    mapa.fitBounds(limites, RELLENO_ALREDEDOR_DE_LOS_PUNTOS);
  }
  return marcadores;
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
