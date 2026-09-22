import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Layout } from './@core/layout/layout';
import { jwtGuard } from './@core/guards/jwt.guard';
import { AuthService, UserRole } from './@core/services/auth.service';

// Functional Guard para validar roles permitidos
export const roleGuard = (allowedRoles: UserRole[]) => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.hasRole(allowedRoles)) {
      return true;
    }

    // Redirige a una ruta pública o segura si no tiene permisos
    router.navigate(['/home/routes']);
    return false;
  };
};

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    canActivate: [jwtGuard],
    children: [
      {
        path: '',
        title: 'Inicio',
        loadComponent: () => import('./pages/home/home').then((m) => m.Home),
      },
      {
        path: 'home',
        title: 'Inicio',
        loadComponent: () => import('./pages/home/home').then((m) => m.Home),
      },
      {
        path: 'home/schedules',
        title: 'Horarios',
        loadComponent: () => import('./pages/schedules/schedules').then((m) => m.Schedules),
      },
      {
        path: 'home/dashboard',
        title: 'Dashboard',
        // Bloquea el acceso por URL a usuarios comunes ('user')
        canActivate: [roleGuard(['admin', 'supervisor', 'crew', 'conductor'])],
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'home/drivers',
        title: 'Conductores',

        canActivate: [roleGuard(['admin', 'supervisor', 'crew', 'conductor'])],
        loadComponent: () => import('./pages/drivers/drivers').then((m) => m.Drivers),
      },
      {
        path: 'home/vehicles',
        title: 'Vehículos',
        canActivate: [roleGuard(['admin', 'supervisor', 'crew', 'conductor'])],
        loadComponent: () => import('./pages/vehicles/vehicles').then((m) => m.Vehicles),
      },
      {
        path: 'home/routes',
        title: 'Rutas',
        loadComponent: () =>
          import('./pages/route-drivers/route-drivers').then((m) => m.RouteDrivers),
      },
      {
        path: 'home/taller',
        title: 'Taller',
        loadComponent: () =>
          import('./pages/taller/taller').then((m) => m.Taller),
      },
      {
        path: 'home/journey-report',
        title: 'Informe de Jornada',
        canActivate: [roleGuard(['admin', 'supervisor'])],
        loadComponent: () =>
          import('./pages/journey-report/journey-report').then((m) => m.JourneyReport),
      },
      {
        path: 'home/complaints',
        title: 'Quejas',
        loadComponent: () => import('./pages/complaints/complaints').then((m) => m.Complaints),
      },
      {
        path: 'home/profile',
        title: 'Perfil',
        loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile),
      },
    ],
  },
  {
    path: 'register',
    title: 'Registrarse',
    loadComponent: () => import('./pages/register/register').then((m) => m.Register),
  },
  {
    path: 'change-password',
    title: 'Cambiar Contraseña',
    loadComponent: () =>
      import('./@core/auth/change-password/change-password').then((m) => m.ChangePassword),
  },
  {
    path: 'login',
    title: 'Iniciar Sesión',
    loadComponent: () => import('./@core/auth/login/login').then((m) => m.Login),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];