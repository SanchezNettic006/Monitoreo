import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Permite el acceso a administradores y líderes de departamento */
export const adminOLiderGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && (authService.esAdmin() || authService.esLider())) {
    return true;
  }

  console.warn('🔴 Acceso restringido a administradores y líderes. Redirigiendo...');
  router.navigate(['/dashboard']);
  return false;
};
