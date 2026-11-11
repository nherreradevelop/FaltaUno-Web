import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { obtenerParticipantes } from '../api/actividades';
import type { ParticipanteDeActividad } from '../api/tipos';
import { filasDeParticipantes, MENSAJE_FALLA_PARTICIPANTES } from '../paginas/mensajesActividad';
import { useSesion } from '../sesion/SesionContexto';
import { Avatar } from './Avatar';
import { EstrellasDeValoracion } from './EstrellasDeValoracion';

export interface EstadoParticipantes {
  participantes: ParticipanteDeActividad[];
  hayMas: boolean;
  cargando: boolean;
  hayFalla: boolean;
  verMas: () => void;
  reintentar: () => void;
}

/**
 * CU09 A1: participantes de la actividad, de a 20; "Ver más" agrega la página siguiente.
 * Se pide una sola vez por pantalla, desde el detalle, y la pestaña Participantes muestra el resultado.
 */
export function useParticipantes(actividadId: string, habilitado: boolean): EstadoParticipantes {
  const [participantes, setParticipantes] = useState<ParticipanteDeActividad[]>([]);
  const [paginaCargada, setPaginaCargada] = useState(0);
  const [paginaPedida, setPaginaPedida] = useState(1);
  /** Se incrementa al tocar "Reintentar" para volver a pedir la misma página. */
  const [intento, setIntento] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [hayFalla, setHayFalla] = useState(false);

  useEffect(() => {
    if (!habilitado) {
      return;
    }
    // Si el usuario sale de la pantalla antes de que llegue la respuesta, se descarta
    let vigente = true;
    setCargando(true);
    setHayFalla(false);

    obtenerParticipantes(actividadId, paginaPedida)
      .then((pagina) => {
        if (!vigente) return;
        // La página 1 reemplaza la lista: si el efecto corre de nuevo (recarga en desarrollo) no se duplican filas
        setParticipantes((anteriores) => (pagina.pagina === 1 ? pagina.participantes : [...anteriores, ...pagina.participantes]));
        setPaginaCargada(pagina.pagina);
        setHayMas(pagina.hayMas);
      })
      .catch(() => {
        if (vigente) setHayFalla(true); // CU09 ER1
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [actividadId, habilitado, paginaPedida, intento]);

  return {
    participantes,
    hayMas,
    cargando,
    hayFalla,
    verMas: () => setPaginaPedida(paginaCargada + 1),
    // RNF-10: vuelve a pedir la página que falló; las ya cargadas no se piden de nuevo ni se duplican
    reintentar: () => setIntento((anterior) => anterior + 1),
  };
}

interface PropsParticipantes {
  lista: EstadoParticipantes;
  /** A1 paso 3 y RN2: lo decide la API en las opciones del detalle (removerParticipantes). */
  puedeRemover: boolean;
  /** RN5 / CU21: la API ofrece valorar (actividad iniciada o archivada y el usuario forma parte). */
  puedeValorar: boolean;
}

/** CU09 A1: lista de participantes (usuarios registrados e invitados externos), en la pestaña "Participantes". */
export function ParticipantesDeActividad({ lista, puedeRemover, puedeValorar }: PropsParticipantes) {
  const { sesion } = useSesion();
  const usuarioActualId = sesion?.usuario.id ?? null;
  const { participantes, hayMas, cargando, hayFalla } = lista;

  return (
    <div className="participantes">
      {participantes.length > 0 && (
        <ul className="participantes__lista">
          {filasDeParticipantes(participantes).map((fila) => (
            <li key={fila.clave} className="participantes__item">
              {fila.tipo === 'usuario' ? (
                <FilaDeParticipante
                  participante={fila.participante}
                  puedeRemover={puedeRemover}
                  puedeValorar={puedeValorar}
                  usuarioActualId={usuarioActualId}
                />
              ) : (
                <FilaDeInvitado nombre={fila.nombre} invitadoPor={fila.invitadoPor} />
              )}
            </li>
          ))}
        </ul>
      )}

      {cargando && <p className="texto-suave">Cargando participantes…</p>}

      {hayFalla && (
        <div className="aviso-error actividad__error" role="alert">
          <span>{MENSAJE_FALLA_PARTICIPANTES}</span>
          <button type="button" className="boton-secundario" onClick={lista.reintentar}>
            Reintentar
          </button>
        </div>
      )}

      {hayMas && !cargando && !hayFalla && (
        <button type="button" className="boton-secundario" onClick={lista.verMas}>
          Ver más
        </button>
      )}
    </div>
  );
}

interface PropsFila {
  participante: ParticipanteDeActividad;
  puedeRemover: boolean;
  puedeValorar: boolean;
  usuarioActualId: string | null;
}

function FilaDeParticipante({ participante, puedeRemover, puedeValorar, usuarioActualId }: PropsFila) {
  const { usuario } = participante;
  const esElUsuarioActual = usuario !== null && usuario.id === usuarioActualId;
  // CU21: se valora a los demás participantes registrados, no a uno mismo ni a una cuenta cerrada
  const mostrarEstrellas = puedeValorar && usuario !== null && !esElUsuarioActual;
  return (
    <div className="participantes__persona">
      {usuario ? (
        <Link to={`/usuarios/${usuario.id}`} className="participantes__usuario">
          <Avatar nombre={usuario.nombre} fotoUrl={usuario.fotoUrl} tamano={40} />
          <span className="participantes__texto">
            <span className="participantes__nombre">
              {usuario.nombre}
              {esElUsuarioActual && <span className="participantes__vos"> (vos)</span>}
            </span>
            {participante.esOrganizador && <span className="participantes__rol">Organizador</span>}
          </span>
        </Link>
      ) : (
        <span className="participantes__usuario texto-suave">Usuario eliminado</span>
      )}
      {mostrarEstrellas && <EstrellasDeValoracion nombre={usuario.nombre} />}
      {/* CU09 A1 paso 3. Pendiente: CU31 – Remover a un participante */}
      {puedeRemover && !participante.esOrganizador && (
        <button type="button" className="boton-secundario participantes__remover" disabled title="Disponible con el CU31">
          Remover
        </button>
      )}
    </div>
  );
}

/** CU09 A1: un invitado externo, con quién lo trae. No tiene perfil ni se valora (no es un usuario registrado). */
function FilaDeInvitado({ nombre, invitadoPor }: { nombre: string; invitadoPor: string | null }) {
  return (
    <div className="participantes__persona">
      <span className="participantes__usuario">
        <span className="avatar participantes__avatar-invitado" aria-hidden="true">
          +
        </span>
        <span className="participantes__texto">
          <span className="participantes__nombre">{nombre}</span>
          <span className="participantes__rol participantes__rol--invitado">
            {invitadoPor ? `Invitado por ${invitadoPor}` : 'Invitado externo'}
          </span>
        </span>
      </span>
    </div>
  );
}
