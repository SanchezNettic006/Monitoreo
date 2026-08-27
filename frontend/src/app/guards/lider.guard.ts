import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Restringe el acceso a la vista de equipo del líder */
export const liderGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.esLider()) {
    return true;
  }

  console.warn('🔴 Acceso restringido a líderes de departamento. Redirigiendo...');
  router.navigate(['/dashboard']);
  return false;
};
