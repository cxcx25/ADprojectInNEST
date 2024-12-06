import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'user',
    loadChildren: () => import('./user/user.module').then(m => m.UserModule)
  },
  {
    path: '',
    redirectTo: 'user/search',
    pathMatch: 'full'
  }
];