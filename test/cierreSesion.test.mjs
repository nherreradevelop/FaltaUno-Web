import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { registerHooks } from 'node:module';
import { crearNavegador } from './soporteAlmacenamiento.mjs';

registerHooks({
  resolve(specifier, contexto, siguiente) {
    try {
      return siguiente(specifier, contexto);
    } catch (error) {
      if (specifier.startsWith('.') && error.code === 'ERR_MODULE_NOT_FOUND') return siguiente(specifier + '.ts', contexto);
      throw error;
    }
  },
});
const navegador = crearNavegador();
const { huellaDeSesion, guardarMarcaDeCierre, leerMarcaDeCierre } = await import('../src/sesion/marcaDeCierre.ts');
let contador = 0;
async function almacenNuevo() {
  const { almacenSesion } = await import('../src/sesion/almacenSesion.ts?instancia=' + ++contador);
  return almacenSesion;
}
const usuario = { id: 'u1', nombre: 'Ana', email: 'ana@test.invalid', fotoUrl: null };
const a = { token: 'token-prueba-A', usuario };
const b = { token: 'token-prueba-B', usuario };
const clave = 'faltauno.sesion';
beforeEach(() => navegador.limpiar());
afterEach(() => navegador.limpiar());

describe('CU37 H03 cierre persistente', () => {
  it('FP: marca antes de invalidar, retira autorización y limpia después de confirmar', async () => {
    const almacen = await almacenNuevo();
    await almacen.abrir(a);
    const cierre = almacen.prepararCierre();
    assert.equal(cierre.sesion.token, a.token);
    assert.equal(leerMarcaDeCierre(cierre.huella).encontrada, true);
    assert.equal(almacen.token(), null);
    almacen.cerrarPorElUsuario(true, cierre);
    assert.equal(navegador.local.get(clave), undefined);
    assert.equal(leerMarcaDeCierre(cierre.huella).encontrada, false);
    assert.equal(await (await almacenNuevo()).cargar(), null);
  });
  it('H03: desconexión y borrado fallido no restauran la sesión al recargar; el reintento completa el cierre', async () => {
    const almacen = await almacenNuevo();
    await almacen.abrir(a);
    navegador.fallas.borrarSesion = true;
    const cierre = almacen.prepararCierre();
    almacen.cerrarPorElUsuario(false, cierre);
    assert.equal(JSON.parse(navegador.local.get(clave)).token, a.token);
    const recargado = await almacenNuevo();
    assert.equal(await recargado.cargar(), null);
    assert.equal(recargado.token(), null);
    assert.equal(recargado.motivoDeCierre(), 'limpiezaIncompleta');
    const reintento = recargado.prepararCierre();
    assert.equal(reintento.sesion.token, a.token);
    navegador.fallas.borrarSesion = false;
    recargado.cerrarPorElUsuario(true, reintento);
    assert.equal(recargado.hayCierrePendiente(), false);
    assert.equal(navegador.local.get(clave), undefined);
    assert.equal(leerMarcaDeCierre(cierre.huella).encontrada, false);
  });
  it('usa la cookie si falla la marca local, incluso al reabrir sin sessionStorage', async () => {
    const almacen = await almacenNuevo();
    await almacen.abrir(a);
    navegador.fallas.escribirMarcaLocal = true;
    navegador.fallas.borrarSesion = true;
    almacen.cerrarPorElUsuario(false);
    navegador.pestaña.clear();
    assert.ok(navegador.cookies.size > 0);
    assert.equal(await (await almacenNuevo()).cargar(), null);
  });
  it('sessionStorage mantiene el bloqueo de la pestaña si también están bloqueadas las cookies', async () => {
    const almacen = await almacenNuevo();
    await almacen.abrir(a);
    navegador.fallas.escribirMarcaLocal = true;
    navegador.fallas.escribirCookie = true;
    navegador.fallas.borrarSesion = true;
    almacen.cerrarPorElUsuario(false);
    assert.equal(navegador.cookies.size, 0);
    assert.ok(navegador.pestaña.size > 0);
    assert.equal(await (await almacenNuevo()).cargar(), null);
  });
  it('una lectura de marcas inaccesible impide restaurar, pero permite un nuevo login explícito', async () => {
    const almacen = await almacenNuevo();
    await almacen.abrir(a);
    navegador.fallas.leerCookie = true;
    const recargado = await almacenNuevo();
    assert.equal(await recargado.cargar(), null);
    await recargado.abrir(b);
    assert.equal(recargado.token(), b.token);
  });
  it('no promete persistencia si ningún medio acepta la marca', async () => {
    navegador.fallas.escribirLocal = true;
    navegador.fallas.escribirPestana = true;
    navegador.fallas.escribirCookie = true;
    assert.equal(guardarMarcaDeCierre(await huellaDeSesion(a.token), false), false);
  });
  it('una sesión nueva sigue activa cuando termina tarde el cierre anterior', async () => {
    const almacen = await almacenNuevo();
    await almacen.abrir(a);
    const cierre = almacen.prepararCierre();
    await almacen.abrir(b);
    almacen.cerrarPorElUsuario(true, cierre);
    assert.equal(almacen.token(), b.token);
    assert.equal(JSON.parse(navegador.local.get(clave)).token, b.token);
  });
  it('otra pestaña que ya tenía A deja de usarla y no vuelve a persistir sus filtros', async () => {
    const primera = await almacenNuevo();
    await primera.abrir(a);
    const segunda = await almacenNuevo();
    await segunda.cargar();
    const cierre = primera.prepararCierre();
    assert.equal(segunda.token(), null);
    primera.cerrarPorElUsuario(false, cierre);
    segunda.actualizarUsuario(a.token, { ...usuario, nombre: 'Respuesta tardía' });
    assert.equal(segunda.actual(), null);
    assert.equal(navegador.local.get(clave), undefined);
  });
  it('no bloquea B al cargarla mientras A tiene un cierre pendiente', async () => {
    const almacen = await almacenNuevo();
    await almacen.abrir(a);
    navegador.fallas.borrarSesion = true;
    almacen.cerrarPorElUsuario(false);
    await almacen.abrir(b);
    const recargado = await almacenNuevo();
    assert.equal((await recargado.cargar()).token, b.token);
  });
  it('procesa el evento de cierre aunque la marca ya haya sido retirada por otra pestaña', async () => {
    const almacen = await almacenNuevo();
    await almacen.abrir(a);
    const huella = await huellaDeSesion(a.token);
    almacen.sincronizarCierre({ key: 'faltauno.cierre.' + huella, newValue: 'pendiente' });
    assert.equal(almacen.actual(), null);
  });
  it('un cierre tardío no borra B si el almacenamiento no permite comprobar qué token contiene', async () => {
    const almacen = await almacenNuevo();
    await almacen.abrir(a);
    const cierre = almacen.prepararCierre();
    await almacen.abrir(b);
    navegador.fallas.leerLocal = true;
    almacen.cerrarPorElUsuario(true, cierre);
    assert.equal(JSON.parse(navegador.local.get(clave)).token, b.token);
    assert.equal(almacen.token(), b.token);
  });
  it('un perfil o guardado tardío no puede reabrir A después de cerrar', async () => {
    const almacen = await almacenNuevo();
    await almacen.abrir(a);
    almacen.cerrarPorElUsuario(false);
    almacen.actualizarUsuario(a.token, usuario);
    almacen.guardarFiltrosDeBusqueda(a.token, {
      deportes: [],
      departamentos: [],
      niveles: [],
      franjas: [],
      desde: '',
      hasta: '',
      cupoMaximo: null,
    });
    assert.equal(almacen.actual(), null);
    assert.equal(navegador.local.get(clave), undefined);
  });
  it('conserva la marca no confirmada aunque el token local se haya borrado', async () => {
    const almacen = await almacenNuevo();
    await almacen.abrir(a);
    const copia = navegador.local.get(clave);
    const cierre = almacen.prepararCierre();
    almacen.cerrarPorElUsuario(false, cierre);
    navegador.local.set(clave, copia);
    assert.equal(await (await almacenNuevo()).cargar(), null);
  });
  it('la marca no guarda el token y los reintentos son idempotentes', async () => {
    const almacen = await almacenNuevo();
    await almacen.abrir(a);
    const cierre = almacen.prepararCierre();
    const marcas = [...navegador.local, ...navegador.pestaña, ...navegador.cookies].filter(([k]) => k !== clave);
    assert.ok(marcas.length > 0);
    assert.ok(marcas.every(([k, v]) => !k.includes(a.token) && !v.includes(a.token)));
    almacen.cerrarPorElUsuario(true, cierre);
    almacen.cerrarPorElUsuario(true, cierre);
    assert.equal(almacen.actual(), null);
  });
});
