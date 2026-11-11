/** Íconos de trazo usados en el detalle de actividad. Decorativos: el botón que los contiene lleva el texto o el aria-label. */

const PROPS_SVG = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function IconoCompartir() {
  return (
    <svg {...PROPS_SVG}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

export function IconoSilenciar() {
  return (
    <svg {...PROPS_SVG}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export function IconoMasOpciones() {
  return (
    <svg {...PROPS_SVG} fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

export function IconoTilde() {
  return (
    <svg {...PROPS_SVG} width={14} height={14} strokeWidth={3}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
