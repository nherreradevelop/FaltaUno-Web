import { conservarFiltrosDeSesion, sonFiltrosValidos } from '../comun/filtrosDeSesion';
import type { FiltrosDeBusqueda, UsuarioSesion } from '../api/tipos';
import { Observable } from '../comun/observable';
import { esMarcaDeSesion, guardarMarcaDeCierre, huellaDeSesion, leerMarcaDeCierre, quitarMarcaDeCierre } from './marcaDeCierre';

export interface Sesion {
  token: string;
  usuario: UsuarioSesion;
  filtrosBusqueda?: FiltrosDeBusqueda;
}
export interface CierreDeSesion {
  sesion: Sesion;
  huella: string;
  version: number;
}
export type MotivoDeCierre = 'vencida' | 'sinConfirmarEnServidor' | 'limpiezaIncompleta';
const CLAVE_ALMACENAMIENTO = 'faltauno.sesion';

function leerSesionGuardada(): Sesion | null {
  try {
    const texto = localStorage.getItem(CLAVE_ALMACENAMIENTO);
    const valor = texto ? (JSON.parse(texto) as Partial<Sesion>) : null;
    return typeof valor?.token === 'string' && typeof valor.usuario?.id === 'string' ? (valor as Sesion) : null;
  } catch {
    return null;
  }
}
function guardarSesion(sesion: Sesion): void {
  try {
    localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(sesion));
  } catch {
    /* Una autenticación explícita puede vivir solo en memoria. */
  }
}
function borrarSesionGuardada(token: string): boolean {
  try {
    const texto = localStorage.getItem(CLAVE_ALMACENAMIENTO);
    const guardada = texto ? (JSON.parse(texto) as Partial<Sesion>) : null;
    if (texto && typeof guardada?.token !== 'string') return false;
    if (guardada && guardada.token !== token) return true;
    localStorage.removeItem(CLAVE_ALMACENAMIENTO);
    return localStorage.getItem(CLAVE_ALMACENAMIENTO) === null;
  } catch {
    return false;
  }
}

/** Fuente única de la sesión; Observer sincroniza el cliente HTTP y las rutas. */
class AlmacenSesion {
  private sesion: Sesion | null = null;
  private huella: string | null = null;
  private motivo: MotivoDeCierre | null = null;
  private cierre: CierreDeSesion | null = null;
  private cierreEnCurso = false;
  private cierreConfirmado = false;
  private cerroElUsuario = false;
  private version = 0;
  readonly cambios = new Observable<Sesion | null>((error) => console.error('Falló un observador de la sesión', error));

  /** CU01 RN4 / CU37 H03: consulta las marcas antes de exponer cualquier token persistido. */
  async cargar(): Promise<Sesion | null> {
    const version = ++this.version;
    const guardada = leerSesionGuardada();
    if (!guardada) return null;
    const huella = await huellaDeSesion(guardada.token);
    if (version !== this.version) return this.actual();
    const marca = leerMarcaDeCierre(huella);
    if (marca.bloqueada) {
      this.cierre = { sesion: guardada, huella, version };
      this.cierreConfirmado = marca.confirmado;
      this.cerroElUsuario = true;
      this.motivo = 'limpiezaIncompleta';
      return null;
    }
    this.sesion = guardada;
    this.huella = huella;
    return guardada;
  }
  actual(): Sesion | null {
    return this.cierreEnCurso ? null : this.sesion;
  }
  token(): string | null {
    this.sincronizarCierre();
    return this.actual()?.token ?? null;
  }

  /** Solo autenticación explícita. Las marcas de sesiones anteriores se conservan si siguen pendientes. */
  async abrir(sesion: Sesion): Promise<void> {
    const version = ++this.version;
    const huella = await huellaDeSesion(sesion.token);
    if (version !== this.version) return;
    if (leerMarcaDeCierre(huella).encontrada) throw new Error('No pudimos guardar la nueva sesión. Reintentá iniciar sesión.');
    this.sesion = conservarFiltrosDeSesion(this.sesion, sesion);
    this.huella = huella;
    this.cierre = null;
    this.cierreEnCurso = false;
    this.cierreConfirmado = false;
    this.cerroElUsuario = false;
    this.motivo = null;
    guardarSesion(this.sesion);
    this.cambios.notificar(this.sesion);
  }
  /** Una respuesta del perfil que llega tarde no puede reabrir la sesión. */
  actualizarUsuario(token: string, usuario: UsuarioSesion): void {
    this.sincronizarCierre();
    if (this.cierreEnCurso || this.sesion?.token !== token) return;
    this.sesion = { ...this.sesion, usuario };
    this.persistirSiSigueVigente();
    this.cambios.notificar(this.sesion);
  }
  filtrosDeBusqueda(): FiltrosDeBusqueda | null {
    const filtros = this.actual()?.filtrosBusqueda;
    return sonFiltrosValidos(filtros) ? filtros : null;
  }
  guardarFiltrosDeBusqueda(token: string, filtros: FiltrosDeBusqueda): void {
    this.sincronizarCierre();
    if (this.cierreEnCurso || this.sesion?.token !== token || !sonFiltrosValidos(filtros)) return;
    this.sesion = { ...this.sesion, filtrosBusqueda: filtros };
    this.persistirSiSigueVigente();
  }
  private persistirSiSigueVigente(): void {
    if (!this.sesion) return;
    try {
      const texto = localStorage.getItem(CLAVE_ALMACENAMIENTO);
      const guardada = texto ? (JSON.parse(texto) as Partial<Sesion>) : null;
      if (guardada && guardada.token !== this.sesion.token) return;
      guardarSesion(this.sesion);
    } catch {
      // Si no se puede comprobar qué sesión está guardada, no se pisa una autenticación más reciente.
    }
  }

  /** CU37: guarda la intención antes de la petición remota y deja de autorizar otras solicitudes. */
  prepararCierre(): CierreDeSesion | null {
    if (!this.cierre && this.sesion && this.huella) {
      this.cierre = { sesion: this.sesion, huella: this.huella, version: ++this.version };
    }
    if (!this.cierre) return null;
    guardarMarcaDeCierre(this.cierre.huella, this.cierreConfirmado);
    this.cierreEnCurso = true;
    this.cerroElUsuario = true;
    return this.cierre;
  }
  cerrarPorElUsuario(confirmado: boolean, cierre = this.prepararCierre()): void {
    if (!cierre) return;
    if (confirmado) guardarMarcaDeCierre(cierre.huella, true);
    const seBorro = borrarSesionGuardada(cierre.sesion.token);
    if (confirmado && seBorro) quitarMarcaDeCierre(cierre.huella);
    if (cierre !== this.cierre || cierre.version !== this.version) return;
    this.cierreConfirmado = this.cierreConfirmado || confirmado;
    this.sesion = null;
    this.huella = null;
    this.cierreEnCurso = false;
    this.motivo = seBorro ? (this.cierreConfirmado ? null : 'sinConfirmarEnServidor') : 'limpiezaIncompleta';
    if (seBorro && this.cierreConfirmado) this.cierre = null;
    this.cambios.notificar(null);
  }
  cerrarPorVencimiento(): void {
    const cierre = this.prepararCierre();
    if (!cierre) return;
    this.cerrarPorElUsuario(true, cierre);
    this.motivo = 'vencida';
    this.cerroElUsuario = false;
  }
  hayCierrePendiente(): boolean {
    return this.cierre !== null;
  }
  sesionCerradaPorElUsuario(): boolean {
    return this.cerroElUsuario;
  }
  motivoDeCierre(): MotivoDeCierre | null {
    return this.motivo;
  }

  /** Un cierre iniciado en otra pestaña también bloquea el mismo token en esta. */
  sincronizarCierre(evento?: { key: string | null; newValue: string | null }): void {
    if (this.cierreEnCurso || !this.sesion || !this.huella) return;
    const marca =
      evento && evento.newValue !== null && esMarcaDeSesion(evento.key, this.huella)
        ? { encontrada: true, confirmado: evento.newValue === 'confirmado' }
        : leerMarcaDeCierre(this.huella);
    if (!marca.encontrada) return;
    this.cierre = { sesion: this.sesion, huella: this.huella, version: ++this.version };
    this.cierreConfirmado = marca.confirmado;
    this.sesion = null;
    this.huella = null;
    this.cerroElUsuario = true;
    this.motivo = 'limpiezaIncompleta';
    this.cambios.notificar(null);
  }
}
export const almacenSesion = new AlmacenSesion();
