import { Routes } from '@angular/router';
import { NgxExtendedPdfViewerComponent } from './magnifier-one/ngx-extended-pdf-viewer.component';
import { MagnifierTwoComponent } from './magnifier-two/magnifier-two.component';

export const routes: Routes = [
   {
      path: '',
      pathMatch: 'full',
      redirectTo: 'ngx-extended-pdf-viewer'
   },
   {
      path: 'ngx-extended-pdf-viewer',
      component: NgxExtendedPdfViewerComponent
   },
   {
      path: 'pdf-viewer',
      component: MagnifierTwoComponent
   }
];