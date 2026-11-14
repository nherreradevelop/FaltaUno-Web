/**
 * Acceso desde TypeScript a la paleta de estilos.css, para el código que necesita el valor real de un color
 * (por ejemplo, los pines de Google Maps, que no entienden var(--...)).
 */
export function colorDelTema(variable: `--color-${string}`): string {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}
