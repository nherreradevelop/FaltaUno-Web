import type { InputHTMLAttributes, ReactNode } from 'react';

interface PropsCampo extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  etiqueta: string;
  error?: string;
  /** Contenido a la derecha de la etiqueta (por ejemplo, "¿Olvidaste tu contraseña?"). */
  accesorio?: ReactNode;
}

/** Campo de formulario con etiqueta y mensaje de error accesible. */
export function Campo({ id, etiqueta, error, accesorio, ...propsInput }: PropsCampo) {
  const idError = `${id}-error`;
  return (
    <div className="campo">
      <div className="campo__etiquetas">
        <label htmlFor={id}>{etiqueta}</label>
        {accesorio}
      </div>
      <input id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? idError : undefined} {...propsInput} />
      {error && (
        <p id={idError} className="campo__error">
          {error}
        </p>
      )}
    </div>
  );
}
