/** Carga con la forma de las tarjetas de actividad, en lugar de un texto suelto (lineamientos: Respuesta a cada acción). */
export function EsqueletoDeActividades({ cantidad = 2 }: { cantidad?: number }) {
  return (
    <div className="esqueleto" role="status" aria-label="Cargando actividades">
      {Array.from({ length: cantidad }, (_, indice) => (
        <div key={indice} className="esqueleto__bloque esqueleto__bloque--grande" />
      ))}
    </div>
  );
}
