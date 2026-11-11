import { obtenerUbicacionActual } from '../src/infra/geolocalizacion.ts';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { datosDelFormulario, ErrorFormulario, formularioInicial, resultadoIncierto } from '../src/comun/formularioActividad.ts';

const ahora = new Date('2026-11-10T12:00:00Z');
function formularioValido(cambios = {}) {
  return {
    ...formularioInicial(),
    nombre: 'Surf en La Paloma',
    descripcion: 'Una mañana para compartir el deporte.',
    deporteId: '1',
    fecha: '2026-11-20',
    hora: '07:30',
    cupoMaximo: '5',
    origen: { placeId: 'origen', descripcion: 'Montevideo' },
    destino: { placeId: 'destino', descripcion: 'La Paloma' },
    ...cambios,
  };
}
function camposInvalidos(formulario, maximo = 20) {
  try {
    datosDelFormulario(formulario, maximo, ahora);
  } catch (error) {
    assert.ok(error instanceof ErrorFormulario);
    return error.campos;
  }
  assert.fail('El formulario inválido no puede generar un pedido de alta.');
}

describe('CU10 validación de formularios independiente de Maps', () => {
  it('E1/E4: informa todos los obligatorios aunque no haya ubicaciones seleccionadas', () => {
    const campos = camposInvalidos(formularioInicial());
    for (const campo of ['nombre', 'descripcion', 'deporteId', 'fecha', 'hora', 'destinoPlaceId']) {
      assert.ok(campos[campo], `Falta el error de ${campo}`);
    }
  });
  it('E2/E3/E4: conserva errores de fecha, cupo y dinero junto a los de ubicaciones', () => {
    const formulario = formularioValido({ fecha: '2020-01-01', cupoMaximo: '21', costo: '-1', origen: null, destino: null });
    const antes = JSON.parse(JSON.stringify(formulario));
    const campos = camposInvalidos(formulario);
    for (const campo of ['fechaHoraInicio', 'cupoMaximo', 'costoEstimadoCentavos', 'destinoPlaceId']) assert.ok(campos[campo]);
    assert.deepEqual(formulario, antes, 'La validación debe conservar lo escrito.');
  });
  it('E4: sigue impidiendo crear si solo falta el destino válido', () => {
    assert.deepEqual(Object.keys(camposInvalidos(formularioValido({ origen: null, destino: null }))).sort(), ['destinoPlaceId']);
  });
  it('FP: admite crear sin origen y lo envía como null', () => {
    const datos = datosDelFormulario(formularioValido({ origen: null }), 20, ahora);
    assert.equal(datos.origenPlaceId, null);
    assert.equal(datos.destinoPlaceId, 'destino');
  });
  it('E4: el destino provisional usa el identificador del servidor sin enviar coordenadas arbitrarias', () => {
    const datos = datosDelFormulario(
      formularioValido({
        origen: null,
        destino: {
          placeId: 'faltauno:destino-provisional',
          descripcion: 'Ubicación por defecto',
          provisional: true,
          lat: -34.91635775362398,
          lng: -56.11543161770436,
        },
      }),
      20,
      ahora,
    );
    assert.equal(datos.destinoPlaceId, 'faltauno:destino-provisional');
    assert.equal(datos.origenPlaceId, null);
    assert.ok(!('lat' in datos));
  });
  it('FP: genera el mismo contrato de alta con datos válidos', () => {
    const datos = datosDelFormulario(formularioValido({ costo: '1200,50', invitados: [' Ana '] }), 20, ahora);
    assert.equal(datos.costoEstimadoCentavos, 120050);
    assert.equal(datos.fechaHoraInicio, '2026-11-20T10:30:00.000Z');
    assert.deepEqual(datos.invitados, ['Ana']);
    assert.equal(datos.origenPlaceId, 'origen');
    assert.equal(datos.lugaresVehiculo, null);
  });
  it('E3: toma el máximo recibido del servidor sin fijarlo en el cliente', () => {
    assert.ok(camposInvalidos(formularioValido({ cupoMaximo: '21' })).cupoMaximo);
    assert.equal(datosDelFormulario(formularioValido({ cupoMaximo: '21' }), 30, ahora).cupoMaximo, 21);
    assert.ok(camposInvalidos(formularioValido({ cupoMaximo: '1' })).cupoMaximo);
    assert.ok(camposInvalidos(formularioValido({ cupoMaximo: '2.5' })).cupoMaximo);
  });
  it('E2: rechaza un instante igual al actual y una fecha imposible', () => {
    assert.ok(camposInvalidos(formularioValido({ fecha: '2026-11-10', hora: '09:00' })).fechaHoraInicio);
    assert.ok(camposInvalidos(formularioValido({ fecha: '2026-02-30' })).fechaHoraInicio);
    assert.ok(camposInvalidos(formularioValido({ hora: '25:00' })).fechaHoraInicio);
  });
  it('E1: valida los nombres de invitados y el cupo ocupado', () => {
    const campos = camposInvalidos(formularioValido({ cupoMaximo: '2', invitados: ['', 'Ana'] }));
    assert.ok(campos.invitados);
    assert.ok(campos['invitados.0']);
  });
  it('E4: exige un origen seleccionado cuando se tiene vehículo propio', () => {
    const formulario = formularioValido({ tieneVehiculo: true, lugaresVehiculo: '3', origen: null });
    assert.equal(camposInvalidos(formulario).origenPlaceId, 'Si tenés vehículo propio, seleccioná tu punto de origen.');
    const conOrigen = { ...formulario, origen: { placeId: 'origen', descripcion: 'Montevideo' } };
    assert.equal(datosDelFormulario(conOrigen, 20, ahora).origenPlaceId, 'origen');
  });
  it('E4: al desmarcar vehículo permite continuar sin origen', () => {
    const formulario = formularioValido({ tieneVehiculo: true, lugaresVehiculo: '3', origen: null });
    const datos = datosDelFormulario({ ...formulario, tieneVehiculo: false }, 20, ahora);
    assert.equal(datos.origenPlaceId, null);
    assert.equal(datos.lugaresVehiculo, null);
  });
  it('E1: exige lugares solo cuando se tiene vehículo propio', () => {
    assert.ok(camposInvalidos(formularioValido({ tieneVehiculo: true, lugaresVehiculo: '' })).lugaresVehiculo);
    assert.equal(
      datosDelFormulario(formularioValido({ tieneVehiculo: true, lugaresVehiculo: '0' }), 20, ahora).lugaresVehiculo,
      0,
    );
    assert.equal(
      datosDelFormulario(formularioValido({ tieneVehiculo: false, lugaresVehiculo: '3' }), 20, ahora).lugaresVehiculo,
      null,
    );
  });
});

describe('CU10 selección de ubicaciones con pin', () => {
  it('FP: conserva las coordenadas del pin en el contrato y permite al conductor usarlo como origen', () => {
    const origen = { placeId: null, tipo: 'pin', descripcion: 'Punto de salida', lat: -34.9055, lng: -56.1913 };
    const destino = {
      placeId: null,
      tipo: 'pin',
      descripcion: 'Punto de encuentro',
      lat: -34.91635775362398,
      lng: -56.11543161770436,
    };
    const datos = datosDelFormulario(formularioValido({ origen, destino, tieneVehiculo: true, lugaresVehiculo: '2' }), 20, ahora);
    assert.equal(datos.origenPlaceId, null);
    assert.equal(datos.destinoPlaceId, null);
    assert.deepEqual(datos.origenCoordenadas, { lat: origen.lat, lng: origen.lng });
    assert.deepEqual(datos.destinoCoordenadas, { lat: destino.lat, lng: destino.lng });
    assert.ok(!('descripcion' in datos.destinoCoordenadas));
  });
  it('E4: rechaza pines incompletos o fuera de rango antes de enviar', () => {
    for (const destino of [
      { placeId: null, tipo: 'pin', descripcion: 'Pin', lat: 91, lng: -56 },
      { placeId: null, tipo: 'pin', descripcion: 'Pin', lat: -34, lng: -181 },
      { placeId: null, tipo: 'pin', descripcion: 'Pin', lat: NaN, lng: -56 },
      { placeId: null, tipo: 'pin', descripcion: 'Pin', lat: -34 },
    ])
      assert.ok(camposInvalidos(formularioValido({ destino })).destinoPlaceId);
  });
  it('FP: mantiene el contrato anterior cuando se busca por lugar', () => {
    const datos = datosDelFormulario(formularioValido(), 20, ahora);
    assert.equal(datos.destinoPlaceId, 'destino');
    assert.ok(!('destinoCoordenadas' in datos));
    assert.ok(!('origenCoordenadas' in datos));
  });
});

it('ER2: un fallo al validar el pin permite corregir el formulario porque no comenzó la persistencia', () => {
  assert.equal(resultadoIncierto({ estado: 503, codigo: 'PUNTOS_NO_DISPONIBLES' }), false);
  assert.equal(resultadoIncierto({ estado: 500, codigo: 'ERROR_INTERNO' }), true);
});

describe('CU10 usar la ubicación del dispositivo en el mapa', () => {
  const posicion = { coords: { latitude: -34.9, longitude: -56.2, accuracy: 24.5 } };
  it('FP: devuelve el punto y su precisión mediante una única solicitud explícita', async () => {
    let solicitudes = 0;
    const geo = {
      getCurrentPosition(exito, _fallo, opciones) {
        solicitudes++;
        assert.equal(opciones.enableHighAccuracy, true);
        assert.equal(opciones.maximumAge, 0);
        assert.ok(opciones.timeout > 0 && Number.isFinite(opciones.timeout));
        exito(posicion);
      },
    };
    assert.equal(solicitudes, 0);
    assert.deepEqual(await obtenerUbicacionActual(geo), { lat: -34.9, lng: -56.2, precisionMetros: 24.5 });
    assert.equal(solicitudes, 1);
  });
  for (const [codigo, esperado] of [
    [1, /No permitiste/],
    [2, /No pudimos determinar/],
    [3, /agotó el tiempo/],
  ]) {
    it('ER2: informa el error de geolocalización ' + codigo + ' sin inventar un punto', async () => {
      await assert.rejects(
        obtenerUbicacionActual({
          getCurrentPosition(_exito, fallo) {
            fallo({ code: codigo });
          },
        }),
        esperado,
      );
    });
  }
  it('ER2: permite volver al mapa cuando el navegador no soporta geolocalización', async () => {
    await assert.rejects(obtenerUbicacionActual(), /Tu navegador no permite/);
  });
  it('ER2: cancelar impide procesar una ubicación que llega después de salir o elegir otro pin', async () => {
    const controlador = new globalThis.AbortController();
    let responder;
    const solicitud = obtenerUbicacionActual(
      {
        getCurrentPosition(exito) {
          responder = exito;
        },
      },
      controlador.signal,
    );
    controlador.abort();
    await assert.rejects(solicitud, { name: 'AbortError' });
    let procesada = false;
    responder({
      get coords() {
        procesada = true;
        return posicion.coords;
      },
    });
    assert.equal(procesada, false);
  });
  it('ER2: no solicita permisos si la operación ya estaba cancelada', async () => {
    const controlador = new globalThis.AbortController();
    controlador.abort();
    let solicitudes = 0;
    await assert.rejects(
      obtenerUbicacionActual(
        {
          getCurrentPosition() {
            solicitudes++;
          },
        },
        controlador.signal,
      ),
      { name: 'AbortError' },
    );
    assert.equal(solicitudes, 0);
  });
  it('ER2: maneja bloqueos del navegador sin propagar sus detalles internos', async () => {
    await assert.rejects(
      obtenerUbicacionActual({
        getCurrentPosition() {
          throw new Error('política interna');
        },
      }),
      /No pudimos acceder/,
    );
  });
  it('ER2: rechaza coordenadas inválidas antes de centrar el mapa', async () => {
    await assert.rejects(
      obtenerUbicacionActual({
        getCurrentPosition(exito) {
          exito({ coords: { latitude: 91, longitude: -56, accuracy: 10 } });
        },
      }),
      /ubicación válida/,
    );
  });
});
