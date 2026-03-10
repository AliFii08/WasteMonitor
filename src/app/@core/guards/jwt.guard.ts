import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, authState, signOut } from '@angular/fire/auth';
import { catchError, map, of, take } from 'rxjs';
import { MessageService } from 'primeng/api';
import { SessionTimeoutService } from '../services/session-timeout.service';

export const jwtGuard: CanActivateFn = (route, state) => {
  const router: Router = inject(Router);
  const auth: Auth = inject(Auth);
  const messageService = inject(MessageService);
  const sessionTimeoutService = inject(SessionTimeoutService);

  return authState(auth).pipe(
    take(1),
    map((firebaseUser) => {
      if (!firebaseUser) {
        sessionTimeoutService.stopTracking();
        return router.createUrlTree(['/login']); // Bloquea el acceso si no hay usuario
      }

      if (sessionTimeoutService.isSessionExpired()) {
        sessionTimeoutService.stopTracking();
        void signOut(auth);
        messageService.add({
          severity: 'warn',
          summary: 'Sesion expirada',
          detail: 'Inicia sesion nuevamente para continuar.',
        });
        return router.createUrlTree(['/login']);
      }

      sessionTimeoutService.startTracking();
      return true; // Permite el acceso si hay usuario
    }),
    catchError(() => {
      sessionTimeoutService.stopTracking();
      messageService.add({severity:'error', summary: 'Error', detail: 'Sesión expirada. Por favor, inicie sesión de nuevo.'});
      return of(router.createUrlTree(['/login'])); // Bloquea el acceso en caso de error
    })
  );
};
