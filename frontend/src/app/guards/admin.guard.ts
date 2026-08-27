import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Restringe el acceso a rutas de administrador; redirige al dashboard si el usuario no es admin */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.esAdmin()) {
    return true;
  }

  console.warn('🔴 Acceso restringido a administradores. Redirigiendo...');
  router.navigate(['/dashboard']);
  return false;
};
