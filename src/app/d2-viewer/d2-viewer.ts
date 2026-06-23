import { Component, Input, OnChanges, SimpleChanges, signal, inject, Output, EventEmitter, ElementRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { D2 } from '@terrastruct/d2';

@Component({
  selector: 'app-d2-viewer',
  standalone: true,
  template: `
    <div class="d2-canvas-container">
      @if (isLoading()) {
        <div class="loading-state">
          <span class="spinner">⚙️</span> Generating graph...
        </div>
      }
      
      <div class="svg-wrapper" [innerHTML]="svgHtml()" (click)="handleSvgClick($event)"></div>
    </div>
  `,
  styles: [`
    /* 1. LAYER PRINCIPALE DEL CANVAS */
    .d2-canvas-container {
      width: 100%;
      padding: 24px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px dashed #dbe0e6;
      min-height: 300px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    /* 2. WRAPPER SCORREVOLE PER L'SVG */
    .svg-wrapper {
      width: 100%;
      overflow-x: auto;
      display: flex;
      justify-content: center;
    }

    /* Configurazione base reattiva per il tag vettoriale */
    ::ngDeep .svg-wrapper svg {
      max-width: 100%;
      height: auto;
      display: block;
    }

    /* 3. CORREZIONE HOVER PER STRUTTURA GRUPPI D2 (<g>) */
    
    /* Forza il cursore a manina quando si passa sopra a un qualsiasi gruppo/nodo di D2 */
    ::ngDeep .svg-wrapper svg g {
      cursor: pointer;
    }

    /* Applica le transizioni fluide a tutti gli elementi interni ai gruppi */
    ::ngDeep .svg-wrapper svg g rect,
    ::ngDeep .svg-wrapper svg g polygon,
    ::ngDeep .svg-wrapper svg g path,
    ::ngDeep .svg-wrapper svg g text {
      transition: fill 0.2s ease, stroke 0.2s ease, stroke-width 0.2s ease;
    }

    /* INTERCETTAZIONE HOVER SUL GRUPPO: Quando il mouse entra nel gruppo <g>, 
       modifichiamo lo sfondo e il bordo di tutte le forme geometriche contenute */
    ::ngDeep .svg-wrapper svg g:hover rect,
    ::ngDeep .svg-wrapper svg g:hover polygon,
    ::ngDeep .svg-wrapper svg g:hover path {
      fill: #fff3ed !important;      /* Sfondo arancione chiarissimo GS1 */
      stroke: #f26322 !important;    /* Bordo arancione scuro GS1 */
      stroke-width: 2px !important;  /* Rende il bordo più spesso */
    }

    /* Quando il mouse entra nel gruppo <g>, cambiamo anche il colore del testo interno 
       e lo sottolineiamo per simulare l'effetto di un link cliccabile */
    ::ngDeep .svg-wrapper svg g:hover text {
      fill: #f26322 !important;      /* Testo arancione GS1 */
      text-decoration: underline !important;
    }

    /* Escludiamo dall'hover le frecce di collegamento e le linee di relazione globali, 
       altrimenti cambierebbero colore anche quelle quando ci si passa sopra. 
       D2 usa spesso tag <path> dedicati fuori dai nodi principali. */
    ::ngDeep .svg-wrapper svg > path:hover,
    ::ngDeep .svg-wrapper svg g marker path:hover {
      fill: none !important; 
      stroke: inherit !important;
    }

    /* 4. STATO DI CARICAMENTO (SPINNER) */
    .loading-state {
      color: #6c757d;
      font-style: italic;
      font-size: 14px;
      margin-bottom: 12px;
    }
    .spinner {
      display: inline-block;
      animation: spin 2s linear infinite;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class D2Viewer implements OnChanges {
  
  @Input() d2Code: string = '';
  @Output() nodeClick = new EventEmitter<string>(); // <-- NUOVO: Rilascia l'ID/Label del nodo cliccato
  
  svgHtml = signal<SafeHtml>('');
  isLoading = signal<boolean>(false);

  private sanitizer = inject(DomSanitizer);
  private d2Instance = new D2(); 

  ngOnChanges(changes: SimpleChanges) {
    if (changes['d2Code']) {
      const code = this.d2Code;
      if (code) {
        this.renderD2(code);
      } else {
        this.svgHtml.set('');
      }
    }
  }

  private async renderD2(code: string) {
    this.isLoading.set(true);
    try {
      const compiled = await this.d2Instance.compile(code);
      const svgString = await this.d2Instance.render(compiled.diagram, compiled.renderOptions);
      this.svgHtml.set(this.sanitizer.bypassSecurityTrustHtml(svgString));
    } catch (err) {
      console.error('Error rendering D2 diagram:', err);
      this.svgHtml.set(this.sanitizer.bypassSecurityTrustHtml(
        '<p style="color:#721c24; background:#f8d7da; padding:12px; border-radius:4px;">Error compiling the diagram. Please check the syntax.</p>'
      ));
    } finally {
      this.isLoading.set(false);
    }
  }

  // --- NUOVO METODO: Intercetta il click sui testi dei nodi dell'SVG ---
  handleSvgClick(event: MouseEvent) {
    const target = event.target as SVGElement;
    
    // Se l'utente clicca su un elemento testuale dell'SVG (<text> o <tspan>)
    if (target && (target.tagName === 'text' || target.tagName === 'tspan')) {
      const clickedText = target.textContent?.trim();
      
      if (clickedText) {
        // Emette il testo del nodo cliccato verso il componente Home
        this.nodeClick.emit(clickedText);
      }
    }
  }
}