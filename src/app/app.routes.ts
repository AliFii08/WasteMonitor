import { Routes } from '@angular/router';
//import { LayoutComponent } from './@core/layout/layout.component';
//import { jwtGuard } from './@core/guards/jwt.guard';

export const routes: Routes = [

  {
    path: 'home',
    title: 'Principal',
    loadComponent: () =>
      import('./pages/home/home').then(m => m.Home),
  },
  {
    path: 'dashboard',
    title: 'Dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then(m => m.Dashboard),
  },
  {
    path: 'register',
    title: 'Registrarse',
    loadComponent: () =>
      import('./pages/register/register').then(m => m.Register),
  },
  {
    path: 'login',
    title: 'Iniciar Sesión',
    loadComponent: () =>
      import('./@core/auth/login/login').then(m => m.Login),
  },
  {
    path: '**',
    redirectTo: 'login',
  }
];
