import type { ButtonHTMLAttributes } from 'react';

interface PropsBoton extends ButtonHTMLAttributes<HTMLButtonElement> {
  cargando?: boolean;
  textoCargando?: string;
}

/** Botón principal. Mientras carga queda deshabilitado para no enviar dos veces (RNF-10). */
export function Boton({ cargando = false, textoCargando, children, disabled, ...props }: PropsBoton) {
  return (
    <button className="boton" disabled={disabled || cargando} aria-busy={cargando} {...props}>
      {cargando && textoCargando ? textoCargando : children}
    </button>
  );
}
