import type { Coordenadas } from '../api/actividades';

export interface MarcadorPin {
  mover(punto: Coordenadas): void;
  quitar(): void;
}

/** Pin sobre OverlayView: no requiere Map ID y admite mouse, táctil y flechas del teclado. */
export function crearMarcadorPin(
  OverlayView: typeof google.maps.OverlayView,
  mapa: google.maps.Map,
  inicial: Coordenadas,
  alMover: (punto: Coordenadas) => void,
): MarcadorPin {
  class Pin extends OverlayView {
    private punto = inicial;
    private elemento: HTMLButtonElement | null = null;
    private eventos: AbortController | null = null;
    private arrastre: { id: number; x: number; y: number; pixel: google.maps.Point; inicio: Coordenadas } | null = null;

    override onAdd(): void {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'mapa-ubicacion__pin';
      boton.setAttribute('aria-label', 'Punto seleccionado. Arrastrá o usá las flechas para moverlo.');
      boton.title = 'Arrastrá el pin o usá las flechas para ajustar el punto';
      boton.innerHTML =
        '<svg viewBox="0 0 32 44" aria-hidden="true"><path d="M16 1C7.7 1 1 7.7 1 16c0 11 15 27 15 27s15-16 15-27C31 7.7 24.3 1 16 1Z" fill="currentColor" stroke="white" stroke-width="2"/><circle cx="16" cy="16" r="6" fill="white"/></svg>';
      this.elemento = boton;
      this.eventos = new AbortController();
      const opciones = { signal: this.eventos.signal };
      OverlayView.preventMapHitsAndGesturesFrom(boton);
      boton.addEventListener(
        'pointerdown',
        (evento) => {
          if (evento.button !== 0) return;
          const pixel = this.getProjection().fromLatLngToDivPixel(new google.maps.LatLng(this.punto));
          if (!pixel) return;
          evento.preventDefault();
          boton.focus();
          this.arrastre = { id: evento.pointerId, x: evento.clientX, y: evento.clientY, pixel, inicio: this.punto };
          boton.setPointerCapture(evento.pointerId);
        },
        opciones,
      );
      boton.addEventListener(
        'pointermove',
        (evento) => {
          const arrastre = this.arrastre;
          if (!arrastre || arrastre.id !== evento.pointerId) return;
          evento.preventDefault();
          this.moverPixel(arrastre.pixel.x + evento.clientX - arrastre.x, arrastre.pixel.y + evento.clientY - arrastre.y);
        },
        opciones,
      );
      const terminar = (evento: PointerEvent) => {
        if (this.arrastre?.id !== evento.pointerId) return;
        evento.preventDefault();
        if (evento.type === 'pointercancel') this.actualizar(this.arrastre.inicio);
        this.arrastre = null;
        if (boton.hasPointerCapture(evento.pointerId)) boton.releasePointerCapture(evento.pointerId);
      };
      boton.addEventListener('pointerup', terminar, opciones);
      boton.addEventListener('pointercancel', terminar, opciones);
      boton.addEventListener(
        'keydown',
        (evento) => {
          const direccion = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[evento.key];
          if (!direccion) return;
          evento.preventDefault();
          evento.stopPropagation();
          const pixel = this.getProjection().fromLatLngToDivPixel(new google.maps.LatLng(this.punto));
          if (pixel) {
            const paso = evento.shiftKey ? 10 : 1;
            this.moverPixel(pixel.x + direccion[0] * paso, pixel.y + direccion[1] * paso);
          }
        },
        opciones,
      );
      this.getPanes()?.overlayMouseTarget.appendChild(boton);
    }

    override draw(): void {
      const pixel = this.getProjection().fromLatLngToDivPixel(new google.maps.LatLng(this.punto));
      if (pixel && this.elemento) {
        this.elemento.style.left = `${pixel.x}px`;
        this.elemento.style.top = `${pixel.y}px`;
      }
    }

    override onRemove(): void {
      this.eventos?.abort();
      this.arrastre = null;
      this.elemento?.remove();
      this.elemento = null;
    }

    mover(punto: Coordenadas): void {
      this.punto = punto;
      if (this.elemento) this.draw();
    }

    private moverPixel(x: number, y: number): void {
      const posicion = this.getProjection().fromDivPixelToLatLng(new google.maps.Point(x, y));
      if (posicion) this.actualizar(posicion.toJSON());
    }

    private actualizar(punto: Coordenadas): void {
      this.mover(punto);
      alMover(punto);
    }
  }
  const pin = new Pin();
  pin.setMap(mapa);
  return { mover: (punto) => pin.mover(punto), quitar: () => pin.setMap(null) };
}
