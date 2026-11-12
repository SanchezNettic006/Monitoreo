import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Bloquea el acceso a Registro de Asistencia / Mis Horas a empleados que
 * marcan entrada/salida en un reloj biométrico físico (no por esta app) y
 * solo deben poder usar Trámites. El sidebar ya les oculta estos enlaces;
 * este guard evita que entren igual escribiendo la URL directamente.
 */
export const noSoloTramitesGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.esSoloTramites()) {
    return true;
  }

  router.navigate(['/tramites']);
  return false;
};
