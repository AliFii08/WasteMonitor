import { Routes } from '@angular/router';
import { Layout } from './@core/layout/layout';
import { jwtGuard } from './@core/guards/jwt.guard';
//import { jwtGuard } from './@core/guards/jwt.guard';

export const routes: Routes = [

  {
    path: '',
    component: Layout,
    canActivate: [/*jwtGuard*/],
    children: [
      {
        path: 'home',
        title: 'Inicio',
        loadComponent: () =>
          import('./pages/home/home').then(m => m.Home),
      },
      {
        path: 'home/schedules',
        title: 'Horarios',
        loadComponent: () =>
          import('./pages/schedules/schedules').then(m => m.Schedules),
      },
      {
        path: 'home/dashboard',
        title: 'Dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard').then(m => m.Dashboard),
      },
      {
        path: 'home/drivers',
        title: 'Conductores',
        loadComponent: () =>
          import('./pages/drivers/drivers').then(m => m.Drivers),
      },
      {
        path: 'home/vehicles',
        title: 'Vehículos',
        loadComponent: () =>
          import('./pages/vehicles/vehicles').then(m => m.Vehicles),
      },
      {
        path: 'home/routes',
        title: 'Rutas',
        loadComponent: () =>
          import('./pages/route-drivers/route-drivers').then(m => m.RouteDrivers),
      },
    ]
  },
  {
    path: 'login',
    title: 'Iniciar Sesión',
    loadComponent: () =>
      import('./@core/auth/login/login').then(m => m.Login),
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
    path: '**',
    redirectTo: 'login',
  }
];
