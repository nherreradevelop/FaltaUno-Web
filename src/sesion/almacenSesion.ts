import type { UsuarioSesion } from '../api/tipos';
import { Observable } from '../comun/observable';

export interface Sesion {
  token: string;
  usuario: UsuarioSesion;
}

const CLAVE_ALMACENAMIENTO = 'faltauno.sesion';

function leerSesionGuardada(): Sesion | null {
  try {
    const texto = localStorage.getItem(CLAVE_ALMACENAMIENTO);
    return texto ? (JSON.parse(texto) as Sesion) : null;
  } catch {
    return null; // almacenamiento bloqueado o dato corrupto: se arranca sin sesión
  }
}

function guardarSesion(sesion: Sesion | null): void {
  try {
    if (sesion) {
      localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(sesion));
    } else {
      localStorage.removeItem(CLAVE_ALMACENAMIENTO);
    }
  } catch {
    // Sin almacenamiento la sesión dura lo que dure la pestaña
  }
}

/**
 * Única fuente de la sesión en la web. El cliente HTTP lee el token de acá y, ante un 401, la cierra.
 * Quien necesite enterarse de los cambios (el contexto de React) se suscribe a `cambios`.
 */
class AlmacenSesion {
  private sesion: Sesion | null = leerSesionGuardada();
  /** CU08 ER3 (y cualquier pantalla con sesión): la API rechazó el token, para avisar en el login que la sesión expiró. */
  private vencida = false;

  readonly cambios = new Observable<Sesion | null>((error) => console.error('Falló un observador de la sesión', error));

  actual(): Sesion | null {
    return this.sesion;
  }

  token(): string | null {
    return this.sesion?.token ?? null;
  }

  abrir(sesion: Sesion): void {
    this.vencida = false;
    this.reemplazar(sesion);
  }

  /** La API respondió 401 con un token guardado: la sesión venció o se cerró desde otro lado. */
  cerrarPorVencimiento(): void {
    if (this.sesion !== null) {
      this.vencida = true;
      this.reemplazar(null);
    }
  }

  /** true si la última sesión se cerró porque venció (no porque el usuario salió). */
  sesionVencio(): boolean {
    return this.vencida;
  }

  cerrar(): void {
    if (this.sesion !== null) {
      this.reemplazar(null);
    }
  }

  private reemplazar(sesion: Sesion | null): void {
    this.sesion = sesion;
    guardarSesion(sesion);
    this.cambios.notificar(sesion);
  }
}

export const almacenSesion = new AlmacenSesion();
