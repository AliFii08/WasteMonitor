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
    path: 'home/dashboard',
    title: 'Dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then(m => m.Dashboard),
  },
  {
    path: 'home/horarios',
    title: 'Horarios',
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then(m => m.Dashboard),
  },
  {
    path: 'home/routes',
    title: 'Rutas',
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
    path: 'change-password',
    title: 'Cambiar Contraseña',
    loadComponent: () =>
      import('./@core/auth/change-password/change-password').then(m => m.ChangePassword),
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
