import { useCallback, useEffect, useState } from 'react';
import { obtenerMisValoraciones, type MiValoracion } from '../api/valoraciones';
import { MENSAJES_VALORACION, textoDePendientes } from '../comun/valoraciones';

export interface EstadoMisValoraciones {
  /** Valoración que el usuario le dio a cada participante (por id de usuario); null si está pendiente. */
  porUsuario: Map<string, MiValoracion | null>;
  pendientes: number;
  cargando: boolean;
  hayFalla: boolean;
  reintentar: () => void;
  /** FP paso 10: refleja en la lista la valoración que se acaba de guardar, sin volver a pedirla. */
  registrar: (usuarioId: string, valoracion: MiValoracion) => void;
}

/**
 * CU21 FP pasos 1 y 2: las valoraciones que el usuario ya dio en la actividad. Se pide una sola vez por pantalla,
 * desde el detalle, y solo si la API ofrece valorar (actividad Iniciada o Archivada y el usuario forma parte).
 */
export function useMisValoraciones(actividadId: string, habilitado: boolean): EstadoMisValoraciones {
  const [porUsuario, setPorUsuario] = useState<Map<string, MiValoracion | null>>(new Map());
  const [cargando, setCargando] = useState(false);
  const [hayFalla, setHayFalla] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!habilitado) return;
    let vigente = true;
    setCargando(true);
    setHayFalla(false);
    obtenerMisValoraciones(actividadId)
      .then((participantes) => {
        if (!vigente) return;
        setPorUsuario(new Map(participantes.map((participante) => [participante.usuario.id, participante.miValoracion])));
      })
      .catch(() => {
        if (vigente) setHayFalla(true);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [actividadId, habilitado, intento]);

  const registrar = useCallback((usuarioId: string, valoracion: MiValoracion) => {
    setPorUsuario((anterior) => new Map(anterior).set(usuarioId, valoracion));
  }, []);

  const pendientes = [...porUsuario.values()].filter((valoracion) => valoracion === null).length;
  return {
    porUsuario,
    pendientes,
    cargando,
    hayFalla,
    reintentar: () => setIntento((anterior) => anterior + 1),
    registrar,
  };
}

/** CU21 FP paso 2 y A1: cuántos participantes faltan valorar, o el error al cargar las valoraciones con "Reintentar". */
export function ResumenDeValoraciones({ valoraciones, aviso }: { valoraciones: EstadoMisValoraciones; aviso: string | null }) {
  if (valoraciones.hayFalla) {
    return (
      <div className="aviso-error actividad__error" role="alert">
        <span>{MENSAJES_VALORACION.errorAlCargar}</span>
        <button type="button" className="boton-secundario" onClick={valoraciones.reintentar}>
          Reintentar
        </button>
      </div>
    );
  }
  if (valoraciones.cargando) {
    return null;
  }
  return (
    <div className="valoraciones__resumen">
      {/* FP paso 10: aviso de que la valoración quedó registrada */}
      {aviso && (
        <p className="aviso-info" role="status">
          {aviso}
        </p>
      )}
      <p className="texto-suave">{textoDePendientes(valoraciones.pendientes)}</p>
    </div>
  );
}
