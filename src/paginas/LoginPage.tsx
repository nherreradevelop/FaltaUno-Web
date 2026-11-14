import { useState, type FormEvent } from 'react';
import { iniciarSesion, iniciarSesionConGoogle } from '../api/auth';
import { ErrorApi } from '../api/cliente';
import { Boton } from '../componentes/Boton';
import { BotonGoogle, googleEstaConfigurado } from '../componentes/BotonGoogle';
import { Campo } from '../componentes/Campo';
import { almacenSesion, type MotivoDeCierre } from '../sesion/almacenSesion';
import { useSesion } from '../sesion/SesionContexto';
import {
  MENSAJE_CIERRE_SIN_CONFIRMAR,
  MENSAJE_FALLA_GOOGLE,
  MENSAJE_LIMPIEZA_INCOMPLETA,
  MENSAJE_SESION_VENCIDA,
  mensajeDeErrorDeGoogle,
  mensajeDeErrorDeLogin,
} from './mensajesLogin';

interface ErroresDeCampos {
  email?: string;
  password?: string;
}

/** Validación solo de forma, para no llamar a la API con campos vacíos. La regla real la valida la API. */
function validarCamposVacios(email: string, password: string): ErroresDeCampos {
  const errores: ErroresDeCampos = {};
  if (!email.trim()) errores.email = 'Ingresá tu correo electrónico.';
  if (!password) errores.password = 'Ingresá tu contraseña.';
  return errores;
}

/** Aviso a mostrar al llegar al login según cómo se cerró la sesión anterior (CU08 ER3, CU37 ER1). */
function avisoDeCierre(motivo: MotivoDeCierre | null): string | null {
  if (motivo === 'vencida') return MENSAJE_SESION_VENCIDA;
  if (motivo === 'sinConfirmarEnServidor') return MENSAJE_CIERRE_SIN_CONFIRMAR;
  return null;
}

/**
 * W01 – CU01 Inicio de sesión.
 * Al abrir la sesión no se navega a mano: RutaSoloSinSesion detecta la sesión nueva y lleva a la pantalla principal.
 */
export function LoginPage() {
  const { abrirSesion } = useSesion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erroresDeCampos, setErroresDeCampos] = useState<ErroresDeCampos>({});
  // CU08 ER3 y CU37 ER1: si se llegó acá porque la sesión venció o no se pudo confirmar su cierre, se avisa
  const [mensajeError, setMensajeError] = useState<string | null>(() => avisoDeCierre(almacenSesion.motivoDeCierre()));
  // CU37 ER2: la sesión anterior no se pudo borrar del navegador
  const [limpiezaIncompleta, setLimpiezaIncompleta] = useState(() => almacenSesion.motivoDeCierre() === 'limpiezaIncompleta');
  const [enviando, setEnviando] = useState(false);

  /** CU37 ER2: reintento manual de la limpieza (RNF-10). */
  function reintentarLimpieza() {
    const seBorro = almacenSesion.reintentarLimpieza();
    setLimpiezaIncompleta(!seBorro);
    if (seBorro) {
      setMensajeError(avisoDeCierre(almacenSesion.motivoDeCierre()));
    }
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensajeError(null);

    const erroresLocales = validarCamposVacios(email, password);
    setErroresDeCampos(erroresLocales);
    if (Object.keys(erroresLocales).length > 0) {
      return;
    }

    setEnviando(true);
    try {
      abrirSesion(await iniciarSesion(email, password));
    } catch (error) {
      if (error instanceof ErrorApi && error.campos) {
        setErroresDeCampos(error.campos);
      }
      // CU01 E3: se conserva el correo y se pide reintentar
      setPassword('');
      setMensajeError(mensajeDeErrorDeLogin(error));
      // Pendiente: CU02 – en E1 (CUENTA_NO_VERIFICADA), ofrecer reenviar el correo de verificación
    } finally {
      setEnviando(false);
    }
  }

  async function alObtenerTokenDeGoogle(idToken: string) {
    setMensajeError(null);
    setEnviando(true);
    try {
      abrirSesion(await iniciarSesionConGoogle(idToken));
    } catch (error) {
      // Pendiente: CU02 A3 – en E2 (CUENTA_NO_ENCONTRADA), ofrecer registrarse con la misma cuenta de Google
      setMensajeError(mensajeDeErrorDeGoogle(error));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="login">
      <section className="login__portada">
        <svg className="login__ola" aria-hidden="true" viewBox="0 0 720 300" preserveAspectRatio="none">
          <path d="M0 150 C 140 80, 280 230, 430 150 S 640 70, 720 120 L 720 300 L 0 300 Z" fill="#1D6FB8" />
          <path d="M0 220 C 160 170, 320 280, 480 210 S 660 170, 720 190 L 720 300 L 0 300 Z" fill="#5AA4DC" opacity="0.5" />
          <path d="M470 205 C 540 175, 610 185, 670 240" stroke="#EF7D22" strokeWidth="8" fill="none" strokeLinecap="round" />
        </svg>
        <div className="login__marca">
          <span className="login__logo">
            <img src="/logo-faltauno.png" alt="Logo de FaltaUno" />
          </span>
          FaltaUno
        </div>
        <div className="login__lema">
          <h1>
            Siempre falta uno.
            <br />
            Encontralo acá.
          </h1>
          <p>
            Organizá salidas de surf, ciclismo, senderismo y deportes al aire libre: sumá compañeros, coordiná el traslado, dividí
            los gastos y mirá el pronóstico, todo en un mismo lugar.
          </p>
        </div>
        <ul className="login__etiquetas">
          <li>Chat por actividad</li>
          <li>Gastos compartidos</li>
          <li>Pronóstico interpretado por IA</li>
        </ul>
      </section>

      <section className="login__panel">
        <form className="login__formulario" onSubmit={alEnviar} noValidate>
          <div className="login__encabezado">
            <h2>Iniciar sesión</h2>
            <p>
              {/* Pendiente: CU02 – Registro de usuario */}
              ¿No tenés cuenta? <span className="enlace-pendiente">Registrate gratis</span>
            </p>
          </div>

          {googleEstaConfigurado() && (
            <>
              <BotonGoogle alObtenerToken={alObtenerTokenDeGoogle} alFallar={() => setMensajeError(MENSAJE_FALLA_GOOGLE)} />
              {/* Pendiente: CU01 A1 con Apple (fuera del alcance de este sprint) */}
              <div className="separador">o con tu correo</div>
            </>
          )}

          <Campo
            id="email"
            etiqueta="Correo electrónico"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            error={erroresDeCampos.email}
          />
          <Campo
            id="password"
            etiqueta="Contraseña"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(evento) => setPassword(evento.target.value)}
            error={erroresDeCampos.password}
            // Pendiente: CU03 – Recuperar contraseña
            accesorio={<span className="enlace-pendiente">¿Olvidaste tu contraseña?</span>}
          />

          {limpiezaIncompleta && (
            <div className="aviso-error login__aviso-con-accion" role="alert">
              <span>{MENSAJE_LIMPIEZA_INCOMPLETA}</span>
              <button type="button" className="boton-secundario boton-secundario--peligro" onClick={reintentarLimpieza}>
                Reintentar
              </button>
            </div>
          )}

          {mensajeError && (
            <p className="aviso-error" role="alert">
              {mensajeError}
            </p>
          )}

          <Boton type="submit" cargando={enviando} textoCargando="Ingresando…">
            Iniciar sesión
          </Boton>

          <p className="login__legal">
            Al continuar aceptás los Términos y condiciones y la Política de privacidad (Ley N.º 18.331).
          </p>
        </form>
      </section>
    </main>
  );
}
