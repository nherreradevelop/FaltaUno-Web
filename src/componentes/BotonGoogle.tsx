import { GoogleLogin } from '@react-oauth/google';

const GOOGLE_CONFIGURADO = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

interface PropsBotonGoogle {
  /** Recibe el ID token que entrega Google. */
  alObtenerToken: (idToken: string) => void;
  /** CU01 ER2: Google falló o el usuario canceló. */
  alFallar: () => void;
}

/**
 * Botón oficial de Google Identity Services (CU01 A1 pasos 1 a 4).
 * Usarlo solo si googleEstaConfigurado(): necesita el GoogleOAuthProvider de main.tsx.
 */
export function BotonGoogle({ alObtenerToken, alFallar }: PropsBotonGoogle) {
  return (
    <div className="login__google">
      <GoogleLogin
        onSuccess={(respuesta) => (respuesta.credential ? alObtenerToken(respuesta.credential) : alFallar())}
        onError={alFallar}
        text="continue_with"
        shape="pill"
        size="large"
        width="400"
      />
    </div>
  );
}

export function googleEstaConfigurado(): boolean {
  return GOOGLE_CONFIGURADO;
}
