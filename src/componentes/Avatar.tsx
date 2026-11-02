import { iniciales, urlDeFotoAlTamano } from '../comun/formato';

interface PropsAvatar {
  nombre: string;
  fotoUrl: string | null;
  /** Lado en píxeles. */
  tamano: number;
}

/** Foto de perfil redonda; sin foto, muestra las iniciales (como en los mockups). */
export function Avatar({ nombre, fotoUrl, tamano }: PropsAvatar) {
  const estiloTamano = { width: tamano, height: tamano, fontSize: Math.round(tamano * 0.4) };

  if (fotoUrl) {
    return <img className="avatar" src={urlDeFotoAlTamano(fotoUrl, tamano)} alt={`Foto de ${nombre}`} style={estiloTamano} />;
  }
  return (
    <span className="avatar avatar--iniciales" role="img" aria-label={nombre} style={estiloTamano}>
      {iniciales(nombre)}
    </span>
  );
}
