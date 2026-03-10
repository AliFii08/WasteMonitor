import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { catchError, map, of } from 'rxjs';
import { MessageService } from 'primeng/api';

export const jwtGuard: CanActivateFn = (route, state) => {
  const router: Router = inject(Router);
  const auth: Auth = inject(Auth);
  const messageService = inject(MessageService);

  return authState(auth).pipe(
    map((firebaseUser) => {
      if (!firebaseUser) {
        router.navigateByUrl('/login');
        return false; // Bloquea el acceso si no hay usuario
      }
      return true; // Permite el acceso si hay usuario
    }),
    catchError((error) => {
      messageService.add({severity:'error', summary: 'Error', detail: 'Sesión expirada. Por favor, inicie sesión de nuevo.'});
      router.navigateByUrl('/login');
      return of(false); // Bloquea el acceso en caso de error
    })
  );
};