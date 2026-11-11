const PUNTAJES = [1, 2, 3, 4, 5];

/**
 * CU09 FP paso 4: valorar a un participante con 1 a 5 estrellas (puntaje de la tabla valoracion).
 * Pendiente: CU21 – Sistema de valoración de usuarios. Por ahora se muestran pero no se pueden seleccionar.
 */
export function EstrellasDeValoracion({ nombre }: { nombre: string }) {
  return (
    <span className="estrellas" role="group" aria-label={`Valorar a ${nombre} (disponible con el CU21)`}>
      {PUNTAJES.map((puntaje) => (
        <button
          key={puntaje}
          type="button"
          className="estrellas__estrella"
          disabled
          aria-label={`${puntaje} de 5`}
          title="Disponible con el CU21"
        >
          ☆
        </button>
      ))}
    </span>
  );
}
