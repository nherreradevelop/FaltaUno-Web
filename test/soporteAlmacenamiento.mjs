/** Dobles de los tres medios de persistencia, con fallas independientes. */
export function crearNavegador() {
  const local = new Map();
  const pestaña = new Map();
  const cookies = new Map();
  const fallas = {};
  function almacen(datos, nombre) {
    return {
      getItem(k) {
        if (fallas['leer' + nombre]) throw new Error('Lectura bloqueada');
        return datos.get(k) ?? null;
      },
      setItem(k, v) {
        if (fallas['escribir' + nombre] || (nombre === 'Local' && k.startsWith('faltauno.cierre.') && fallas.escribirMarcaLocal))
          throw new Error('Escritura bloqueada');
        datos.set(k, v);
      },
      removeItem(k) {
        if (fallas['borrar' + nombre] || (k === 'faltauno.sesion' && fallas.borrarSesion)) throw new Error('Borrado bloqueado');
        datos.delete(k);
      },
    };
  }
  globalThis.localStorage = almacen(local, 'Local');
  globalThis.sessionStorage = almacen(pestaña, 'Pestana');
  globalThis.document = {
    get cookie() {
      if (fallas.leerCookie) throw new Error('Cookie inaccesible');
      return [...cookies].map(([k, v]) => k + '=' + v).join('; ');
    },
    set cookie(texto) {
      if (fallas.escribirCookie) return;
      const [valor] = texto.split(';');
      const indice = valor.indexOf('=');
      const k = valor.slice(0, indice);
      if (texto.includes('Max-Age=0')) cookies.delete(k);
      else cookies.set(k, valor.slice(indice + 1));
    },
  };
  function limpiar() {
    local.clear();
    pestaña.clear();
    cookies.clear();
    for (const k of Object.keys(fallas)) delete fallas[k];
  }
  return { local, pestaña, cookies, fallas, limpiar };
}
