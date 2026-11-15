const PREFIJO = 'faltauno.cierre.';

/** Permite procesar un evento aunque otra pestaña ya haya terminado de retirar la marca. */
export function esMarcaDeSesion(clave: string | null, huella: string): boolean {
  return clave === PREFIJO + huella;
}
/** Huella sin guardar otra copia de la credencial en las marcas. */
export async function huellaDeSesion(token: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
const almacenes = [
  {
    leer: (k: string) => localStorage.getItem(k),
    escribir: (k: string, v: string) => localStorage.setItem(k, v),
    borrar: (k: string) => localStorage.removeItem(k),
  },
  {
    leer: (k: string) => sessionStorage.getItem(k),
    escribir: (k: string, v: string) => sessionStorage.setItem(k, v),
    borrar: (k: string) => sessionStorage.removeItem(k),
  },
  {
    leer: (k: string) =>
      document.cookie
        .split(';')
        .map((v) => v.trim())
        .find((v) => v.startsWith(k + '='))
        ?.slice(k.length + 1) ?? null,
    escribir: (k: string, v: string) => {
      document.cookie = k + '=' + v + '; Path=/; SameSite=Strict; Max-Age=31536000';
    },
    borrar: (k: string) => {
      document.cookie = k + '=; Path=/; SameSite=Strict; Max-Age=0';
    },
  },
];
/** CU37 H03: verifica la escritura e intenta medios independientes. La cookie solo lleva la huella, nunca el token. */
export function guardarMarcaDeCierre(huella: string, confirmado: boolean): boolean {
  let guardada = false;
  for (const almacen of almacenes) {
    try {
      const clave = PREFIJO + huella;
      const valor = confirmado || almacen.leer(clave) === 'confirmado' ? 'confirmado' : 'pendiente';
      almacen.escribir(clave, valor);
      if (almacen.leer(clave) === valor) guardada = true;
    } catch {
      /* Se intentan los medios restantes. */
    }
  }
  return guardada;
}
/** Un error de lectura bloquea la restauración, pero no equivale a encontrar una marca en un login nuevo. */
export function leerMarcaDeCierre(huella: string): { bloqueada: boolean; encontrada: boolean; confirmado: boolean } {
  let bloqueada = false;
  let encontrada = false;
  let confirmado = false;
  for (const almacen of almacenes) {
    try {
      const valor = almacen.leer(PREFIJO + huella);
      if (valor !== null) {
        bloqueada = true;
        encontrada = true;
      }
      if (valor === 'confirmado') confirmado = true;
    } catch {
      bloqueada = true;
    }
  }
  return { bloqueada, encontrada, confirmado };
}
/** Solo después de confirmar revocación y comprobar limpieza local. */
export function quitarMarcaDeCierre(huella: string): void {
  for (const almacen of almacenes) {
    try {
      almacen.borrar(PREFIJO + huella);
    } catch {
      /* Una marca restante conserva el bloqueo de esa sesión. */
    }
  }
}
