import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import type { Perfil } from '../api/tipos';
import { obtenerMiPerfil, obtenerPerfilDeUsuario } from '../api/usuarios';
import { formatearCantidadActividades, formatearCantidadValoraciones, formatearValoracion } from '../comun/formato';
import { Avatar } from '../componentes/Avatar';
import { BotonCerrarSesion } from '../componentes/BotonCerrarSesion';
import { HistorialDeActividades } from '../componentes/HistorialDeActividades';
import { useSesion } from '../sesion/SesionContexto';
import { clasificarErrorDePerfil, type ResultadoDeError } from './mensajesPerfil';

type EstadoPantalla = { tipo: 'cargando' } | { tipo: 'listo'; perfil: Perfil } | ResultadoDeError;

/**
 * W – CU04 Visualizar perfil de usuario.
 * /perfil muestra el perfil propio (FP); /usuarios/:id, el perfil público de otro usuario (A1).
 */
export function PerfilPage() {
  const { id } = useParams();
  const { sesion } = useSesion();

  // El propio perfil tiene una sola dirección, para no tener dos pantallas distintas para lo mismo
  if (id && id === sesion?.usuario.id) {
    return <Navigate to="/perfil" replace />;
  }
  // key: al pasar de un perfil a otro, la pantalla arranca de cero
  return <PantallaPerfil key={id ?? 'propio'} usuarioId={id} />;
}

function PantallaPerfil({ usuarioId }: { usuarioId?: string }) {
  const [estado, setEstado] = useState<EstadoPantalla>({ tipo: 'cargando' });
  /** Se incrementa al tocar "Reintentar" (CU04 ER1, RNF-10). */
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    setEstado({ tipo: 'cargando' });

    const pedido = usuarioId ? obtenerPerfilDeUsuario(usuarioId) : obtenerMiPerfil();
    pedido
      .then((perfil) => {
        if (vigente) setEstado({ tipo: 'listo', perfil });
      })
      .catch((error: unknown) => {
        if (vigente) setEstado(clasificarErrorDePerfil(error));
      });

    return () => {
      vigente = false;
    };
  }, [usuarioId, intento]);

  return (
    <main className="perfil">
      {estado.tipo === 'cargando' && <p className="texto-suave">Cargando perfil…</p>}

      {estado.tipo === 'noDisponible' && (
        <p className="tarjeta texto-suave" role="alert">
          {estado.mensaje}
        </p>
      )}

      {estado.tipo === 'falla' && (
        <div className="aviso-error perfil__error" role="alert">
          <span>{estado.mensaje}</span>
          <button type="button" className="boton-secundario" onClick={() => setIntento((anterior) => anterior + 1)}>
            Reintentar
          </button>
        </div>
      )}

      {estado.tipo === 'listo' && <DatosDelPerfil perfil={estado.perfil} />}
      {estado.tipo === 'listo' && estado.perfil.esPropio && <HistorialDeActividades />}
    </main>
  );
}

function DatosDelPerfil({ perfil }: { perfil: Perfil }) {
  return (
    <section className="tarjeta perfil__datos">
      <Avatar nombre={perfil.nombre} fotoUrl={perfil.fotoUrl} tamano={96} />

      <div className="perfil__texto">
        <h1>{perfil.nombre}</h1>
        {perfil.esPropio && <p className="texto-suave">{perfil.email}</p>}
        <p className="perfil__resumen">
          <Valoracion valoracionPromedio={perfil.valoracionPromedio} />
          {/* CU04 FP: en el perfil propio se indica cuántas valoraciones recibió */}
          {perfil.esPropio && perfil.cantidadValoraciones > 0 && (
            <span className="texto-suave"> · {formatearCantidadValoraciones(perfil.cantidadValoraciones)}</span>
          )}
          {/* CU04 A1: en el perfil de otro usuario se muestra cuántas actividades tiene, no cuáles */}
          {!perfil.esPropio && <span className="texto-suave"> · {formatearCantidadActividades(perfil.cantidadActividades)}</span>}
        </p>
        {perfil.biografia && <p className="perfil__biografia">{perfil.biografia}</p>}

        {perfil.deportes.length > 0 && (
          <ul className="perfil__deportes" aria-label="Deportes que practica">
            {perfil.deportes.map((deporte) => (
              <li key={deporte.id} className="etiqueta">
                {deporte.nombre}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* CU04 RN2: "Editar perfil" y "Cerrar sesión" solo en el perfil propio */}
      {perfil.esPropio && (
        <div className="perfil__acciones perfil__acciones--columna">
          {/* Pendiente: CU05 – Editar perfil de usuario (A2) */}
          <button type="button" className="boton-secundario perfil__editar" disabled>
            Editar perfil
          </button>
          <BotonCerrarSesion />
        </div>
      )}

      {/* Opciones desde el perfil de otro usuario. Pendiente: CU06 – Gestionar lista de amigos y CU07 – Mensajería entre dos usuarios */}
      {!perfil.esPropio && (
        <div className="perfil__acciones">
          <button type="button" className="boton-secundario" disabled>
            Agregar amigo
          </button>
          <button type="button" className="boton-secundario" disabled>
            Enviar mensaje
          </button>
        </div>
      )}
    </section>
  );
}

/** CU04 RN3: promedio con 2 decimales, o "Sin valoraciones". */
function Valoracion({ valoracionPromedio }: { valoracionPromedio: number | null }) {
  if (valoracionPromedio === null) {
    return <span className="texto-suave">Sin valoraciones</span>;
  }
  return (
    <span className="perfil__valoracion" aria-label={`Valoración promedio ${formatearValoracion(valoracionPromedio)} de 5`}>
      ★ {formatearValoracion(valoracionPromedio)}
    </span>
  );
}
