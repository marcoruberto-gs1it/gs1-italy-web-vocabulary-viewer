import { Component, Input, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
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
      
      <div class="svg-wrapper" [innerHTML]="svgHtml()"></div>
    </div>
  `,
  styles: [`
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
    .svg-wrapper {
      width: 100%;
      overflow-x: auto;
      display: flex;
      justify-content: center;
    }
    /* Mantiene l'SVG responsivo senza forzature interattive */
    ::ngDeep .svg-wrapper svg {
      max-width: 100%;
      height: auto;
      display: block;
    }
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
}