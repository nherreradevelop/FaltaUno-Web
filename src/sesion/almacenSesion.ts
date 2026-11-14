import type { UsuarioSesion } from '../api/tipos';
import { Observable } from '../comun/observable';

export interface Sesion {
  token: string;
  usuario: UsuarioSesion;
}

const CLAVE_ALMACENAMIENTO = 'faltauno.sesion';

/**
 * Por qué se cerró la última sesión, para avisarlo en el login:
 * - vencida: la API rechazó el token (CU08 ER3).
 * - sinConfirmarEnServidor: el usuario cerró sesión pero la API no lo confirmó (CU37 ER1).
 * - limpiezaIncompleta: no se pudo borrar la sesión guardada en el navegador (CU37 ER2).
 */
export type MotivoDeCierre = 'vencida' | 'sinConfirmarEnServidor' | 'limpiezaIncompleta';

function leerSesionGuardada(): Sesion | null {
  try {
    const texto = localStorage.getItem(CLAVE_ALMACENAMIENTO);
    return texto ? (JSON.parse(texto) as Sesion) : null;
  } catch {
    return null; // almacenamiento bloqueado o dato corrupto: se arranca sin sesión
  }
}

/** CU37 ER2: devuelve false si el navegador no permitió borrar la sesión guardada. */
function borrarSesionGuardada(): boolean {
  try {
    localStorage.removeItem(CLAVE_ALMACENAMIENTO);
    return localStorage.getItem(CLAVE_ALMACENAMIENTO) === null;
  } catch {
    return false;
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
  private motivo: MotivoDeCierre | null = null;
  /** CU37: se recuerda para el aviso que corresponde después de reintentar la limpieza (ER2 → ER1). */
  private cierreConfirmadoEnServidor = true;

  readonly cambios = new Observable<Sesion | null>((error) => console.error('Falló un observador de la sesión', error));

  actual(): Sesion | null {
    return this.sesion;
  }

  token(): string | null {
    return this.sesion?.token ?? null;
  }

  abrir(sesion: Sesion): void {
    this.motivo = null;
    this.reemplazar(sesion);
  }

  /** La API respondió 401 con un token guardado: la sesión venció o se cerró desde otro lado. */
  cerrarPorVencimiento(): void {
    if (this.sesion !== null) {
      this.motivo = 'vencida';
      this.reemplazar(null);
    }
  }

  /** Por qué se cerró la última sesión, o null si se cerró sin nada que avisar. */
  motivoDeCierre(): MotivoDeCierre | null {
    return this.motivo;
  }

  /**
   * CU37 FP pasos 7 y 8: borra la sesión del navegador y avisa a los observadores, que llevan al login.
   * Aunque no se pueda borrar del almacenamiento, la sesión deja de usarse en esta pestaña (ER2: sin acceso a pantallas privadas).
   */
  cerrarPorElUsuario(confirmadoEnServidor: boolean): void {
    this.cierreConfirmadoEnServidor = confirmadoEnServidor;
    const seBorro = borrarSesionGuardada();
    this.motivo = this.motivoDespuesDeLimpiar(seBorro);
    this.sesion = null;
    this.cambios.notificar(null);
  }

  /** CU37 ER2: vuelve a intentar borrar la sesión guardada. Devuelve true si ahora se pudo. */
  reintentarLimpieza(): boolean {
    const seBorro = borrarSesionGuardada();
    this.motivo = this.motivoDespuesDeLimpiar(seBorro);
    return seBorro;
  }

  private motivoDespuesDeLimpiar(seBorro: boolean): MotivoDeCierre | null {
    if (!seBorro) {
      return 'limpiezaIncompleta';
    }
    if (!this.cierreConfirmadoEnServidor) {
      return 'sinConfirmarEnServidor';
    }
    return null;
  }

  private reemplazar(sesion: Sesion | null): void {
    this.sesion = sesion;
    guardarSesion(sesion);
    this.cambios.notificar(sesion);
  }
}

export const almacenSesion = new AlmacenSesion();
