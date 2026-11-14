import { useEffect, useRef } from 'react';

interface PropsDialogo {
  abierto: boolean;
  titulo: string;
  textoConfirmar: string;
  textoCancelar?: string;
  alConfirmar: () => void;
  alCancelar: () => void;
}

/**
 * Pide confirmar una acción en un <dialog> modal: el navegador maneja el foco y la tecla Escape.
 * Escape o "Cancelar" llaman a alCancelar.
 */
export function DialogoDeConfirmacion({
  abierto,
  titulo,
  textoConfirmar,
  textoCancelar = 'Cancelar',
  alConfirmar,
  alCancelar,
}: PropsDialogo) {
  const referencia = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) {
      return;
    }
    if (abierto && !dialogo.open) {
      dialogo.showModal();
    }
    if (!abierto && dialogo.open) {
      dialogo.close();
    }
  }, [abierto]);

  return (
    <dialog ref={referencia} className="dialogo" aria-labelledby="dialogo-titulo" onCancel={alCancelar}>
      <p id="dialogo-titulo" className="dialogo__titulo">
        {titulo}
      </p>
      <div className="dialogo__acciones">
        <button type="button" className="boton-secundario" onClick={alCancelar}>
          {textoCancelar}
        </button>
        <button type="button" className="boton-secundario boton-secundario--peligro" onClick={alConfirmar}>
          {textoConfirmar}
        </button>
      </div>
    </dialog>
  );
}
