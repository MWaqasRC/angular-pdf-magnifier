import { Component, AfterViewInit, ElementRef, ViewChild, Renderer2 } from '@angular/core';
// Import the getDocument and GlobalWorkerOptions from pdfjs-dist
import { getDocument, GlobalWorkerOptions,  PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

// Set the workerSrc property to the PDF.js worker script
GlobalWorkerOptions.workerSrc = `assets/pdf.worker.min.mjs`;



@Component({
  selector: 'app-magnifier-two',
  standalone: true,
  imports: [],
  templateUrl: './magnifier-two.component.html',
  styleUrl: './magnifier-two.component.css'
})
export class MagnifierTwoComponent implements  AfterViewInit  {
  @ViewChild('pdfViewer') pdfViewer!: ElementRef<HTMLDivElement>;
  @ViewChild('magnifier') magnifier!: ElementRef<HTMLDivElement>;
  pdfSrc = 'assets/sample.pdf'; // Path to your PDF file
  zoomLevel = 1; // Initial zoom level
  isMagnifierActive = false; // Flag to manage magnifier state

  constructor(private renderer: Renderer2) {}

  ngAfterViewInit() {
    this.loadPDF(this.pdfSrc);
  }

  async loadPDF(src: string) {
    try {
      const loadingTask = getDocument(src);
      const pdf: PDFDocumentProxy = await loadingTask.promise;

      const container = this.pdfViewer.nativeElement;
      container.innerHTML = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page: PDFPageProxy = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: this.zoomLevel + .5 });

        const canvas = document.createElement('canvas');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const pageWrapper = document.createElement('div');
        pageWrapper.className = 'page'; // Ensure the page class is set
        pageWrapper.style.position = 'relative';
        pageWrapper.style.marginBottom = '10px'; // Adjust margin between pages if needed
        pageWrapper.appendChild(canvas);

        container.appendChild(pageWrapper);

        const renderContext = {
          canvasContext: canvas.getContext('2d')!,
          viewport: viewport
        };

        await page.render(renderContext).promise;
      }

      this.initMagnifier();
    } catch (error) {
      console.error('Error loading PDF:', error);
    }
  }

  initMagnifier() {
    const pdfViewerElement = this.pdfViewer.nativeElement;

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
      const pageTop = pageRect.top + pdfContainer.scrollTop;
      const pageBottom = pageTop + pageRect.height;
  
      if (y >= pageTop && y <= pageBottom) {
        currentPage = page;
        break;
      }
  
      const distance = Math.min(Math.abs(pageTop - y), Math.abs(pageBottom - y));
  
      if (distance < minDistance) {
        minDistance = distance;
        currentPage = page;
      }
    }
  
    if (!currentPage) {
      console.error('Could not determine the current page. Pages count:', pages.length);
      throw new Error('Could not determine the current page');
    }
  
    return currentPage;
  }
  
}