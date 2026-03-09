import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { catchError, map, of, tap } from 'rxjs';
import { MessageService } from 'primeng/api';

export const jwtGuard: CanActivateFn = (route, state) => {
  const router: Router = inject(Router);
  const user: UserService = inject(UserService);
  const messageService = inject(MessageService);

  // Verifica si hay un token antes de llamar al servicio
  const token = localStorage.getItem('token');
  if (!token) {
    router.navigateByUrl('auth/login');
    return of(false); // Bloquea el acceso
  }

  return user.currentUser().pipe(
    map((user) => {
      if (!user) {
        router.navigateByUrl('auth/login');
        return false; // Bloquea el acceso si no hay usuario
      }
      return true; // Permite el acceso si hay usuario
    }),
    catchError((error) => {
      messageService.add({severity:'error', summary: 'Error', detail: 'Sesión expirada. Por favor, inicie sesión de nuevo.'});
      router.navigateByUrl('auth/login');
      return of(false); // Bloquea el acceso en caso de error
    })
  );
};