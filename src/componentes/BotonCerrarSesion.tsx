import { useState } from 'react';
import { useSesion } from '../sesion/SesionContexto';
import { DialogoDeConfirmacion } from './DialogoDeConfirmacion';

/**
 * CU37 – Cierre de sesión, desde el perfil propio (FP pasos 1 a 3).
 * Al cerrar no se navega a mano: RutaPrivada detecta que no hay sesión y lleva al login con replace (FP paso 8, RN4).
 */
export function BotonCerrarSesion() {
  const { cerrarSesion } = useSesion();
  const [confirmando, setConfirmando] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  async function alConfirmar() {
    setConfirmando(false);
    setCerrando(true);
    await cerrarSesion(); // no lanza: ER1 y ER2 se avisan en el login
  }

  return (
    <>
      <button
        type="button"
        className="boton-secundario boton-secundario--peligro"
        onClick={() => setConfirmando(true)}
        disabled={cerrando}
        aria-busy={cerrando}
      >
        {cerrando ? 'Cerrando sesión…' : 'Cerrar sesión'}
      </button>

      {/* CU37 A2: al cancelar se cierra el diálogo y la sesión sigue activa */}
      <DialogoDeConfirmacion
        abierto={confirmando}
        titulo="¿Seguro que querés cerrar sesión?"
        textoConfirmar="Cerrar sesión"
        alConfirmar={alConfirmar}
        alCancelar={() => setConfirmando(false)}
      />
    </>
  );
}
