import { Component, AfterViewInit, ElementRef, ViewChild, Renderer2 } from '@angular/core';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';

@Component({
  selector: 'app-ngx-extended-pdf-viewer',
  standalone: true,
  imports: [NgxExtendedPdfViewerModule],
  templateUrl: './ngx-extended-pdf-viewer.component.html',
  styleUrl: './ngx-extended-pdf-viewer.component.css'
})
export class NgxExtendedPdfViewerComponent implements AfterViewInit {
  pdfSrc = 'assets/sample.pdf'; // Path to your PDF file
  zoomLevel = 1; // Initial zoom level
  isMagnifierActive = false; // Flag to manage magnifier state

  @ViewChild('magnifier') magnifier!: ElementRef<HTMLDivElement>;
  @ViewChild('pdfViewer') pdfViewer!: ElementRef<HTMLDivElement>;

  constructor(private renderer: Renderer2) { }

  ngAfterViewInit() {
    // Wait for the PDF viewer to fully render before adding event listeners
    setTimeout(() => {
      const pdfViewerElement = this.pdfViewer.nativeElement.querySelector('.pdfViewer') as HTMLDivElement;

      if (pdfViewerElement) {
        // Listen for mouse movements over the PDF viewer
        this.renderer.listen(pdfViewerElement, 'mousemove', (event: MouseEvent) => {
          if (!this.isMagnifierActive) return; // Check if the magnifier is active

          const rect = pdfViewerElement.getBoundingClientRect();
          const scrollTop = pdfViewerElement.scrollTop; // Get current scroll position
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top + scrollTop; // Adjust for scroll offset

          const magnificationFactor = 1.3; // Change this for stronger magnification

          // Get the current PDF page and its viewport
          const currentPage = this.getCurrentPage(pdfViewerElement, y);
          const canvas = currentPage.querySelector('canvas') as HTMLCanvasElement;

          if (canvas) {
            // Create an offscreen canvas for magnified content
            const offscreenCanvas = document.createElement('canvas');
            const context = offscreenCanvas.getContext('2d')!;
            offscreenCanvas.width = this.magnifier.nativeElement.offsetWidth;
            offscreenCanvas.height = this.magnifier.nativeElement.offsetHeight;
            // Get the scale and source coordinates
            const scale = (this.zoomLevel * magnificationFactor);
            const sx = (x - currentPage.offsetLeft) / this.zoomLevel - offscreenCanvas.width / (3 * scale);
            const sy = (y - currentPage.offsetTop) / this.zoomLevel - offscreenCanvas.height / (3 * scale);

            const sWidth = offscreenCanvas.width / scale;
            const sHeight = offscreenCanvas.height / scale;

            // Draw the magnified portion on the offscreen canvas
            context.drawImage(canvas, sx, sy, sWidth, sHeight, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

            if (context.imageSmoothingEnabled) {
              context.imageSmoothingEnabled = true;
              context.imageSmoothingQuality = 'high';
            }

            context.drawImage(canvas, sx, sy, sWidth, sHeight, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

            // Update the magnifier image source
            const magnifierElement = this.magnifier.nativeElement;
            magnifierElement.querySelector('img')!.src = offscreenCanvas.toDataURL();

            // Position the magnifier
            magnifierElement.style.display = 'block';
            magnifierElement.style.left = `${event.clientX - magnifierElement.offsetWidth / 2}px`;
            magnifierElement.style.top = `${event.clientY - magnifierElement.offsetHeight / 2}px`;

            // Scale the magnifier image
            const img = magnifierElement.querySelector('img')!;
            img.style.transform = `scale(${scale})`;
          }
        });

        // Hide the magnifier when the mouse leaves the PDF viewer
        this.renderer.listen(pdfViewerElement, 'mouseleave', () => {
          this.magnifier.nativeElement.style.display = 'none';
        });
      }
    }, 1000); // Adjust the timeout if necessary
  }

  toggleMagnifier() {
    this.isMagnifierActive = !this.isMagnifierActive;
    if (!this.isMagnifierActive) {
      this.magnifier.nativeElement.style.display = 'none'; // Hide magnifier when deactivated
    }
  }

  getCurrentPage(pdfContainer: HTMLElement, y: number): HTMLDivElement {
    const pages = Array.from(pdfContainer.querySelectorAll('.page')) as HTMLDivElement[];
    let currentPage: HTMLDivElement | null = null;
    let minDistance = Infinity;

    for (const page of pages) {
      const pageRect = page.getBoundingClientRect();
      const distance = Math.abs(pageRect.top + pdfContainer.scrollTop - y);

      if (distance < minDistance) {
        minDistance = distance;
        currentPage = page;
      }
    }

    if (!currentPage) {
      throw new Error('Could not determine the current page');
    }

    return currentPage;
  }
}
