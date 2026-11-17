import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { describe, it } from 'node:test';
import { URL } from 'node:url';
import ts from 'typescript';
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
crearNavegador();
const sesionUrl = new URL('../src/sesion/almacenSesion.ts', import.meta.url);
const { almacenSesion } = await import(sesionUrl.href);
const fuente = readFileSync(new URL('../src/api/cliente.ts', import.meta.url), 'utf8')
  .replace('import.meta.env.VITE_URL_API', JSON.stringify('http://127.0.0.1:3101'))
  .replace("'../sesion/almacenSesion'", JSON.stringify(sesionUrl.href));
const codigo = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { pedir } = await import('data:text/javascript,' + encodeURIComponent(codigo));
const usuario = { id: 'u', nombre: 'Ana', email: 'ana@test.invalid', fotoUrl: null };
describe('CU37 aislamiento de solicitudes tardías', () => {
  it('envía el token capturado y un 401 viejo no cierra una autenticación nueva', async () => {
    await almacenSesion.abrir({ token: 'token-A', usuario });
    const cierre = almacenSesion.prepararCierre();
    await almacenSesion.abrir({ token: 'token-B', usuario });
    let autorizacion;
    globalThis.fetch = async (_url, opciones) => {
      autorizacion = opciones.headers.Authorization;
      return new globalThis.Response(JSON.stringify({ error: { codigo: 'SESION_INVALIDA', mensaje: 'Sesión inválida' } }), {
        status: 401,
      });
    };
    await assert.rejects(pedir('/api/auth/cerrar-sesion', { metodo: 'POST', tokenDeSesion: cierre.sesion.token }));
    assert.equal(autorizacion, 'Bearer token-A');
    assert.equal(almacenSesion.token(), 'token-B');
  });
  it('un 401 de la sesión actual sí elimina su acceso', async () => {
    await assert.rejects(pedir('/api/usuarios/yo'));
    assert.equal(almacenSesion.token(), null);
  });
});
