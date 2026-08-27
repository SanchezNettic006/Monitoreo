import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Rastrea el estado de conexión del navegador (online/offline).
 * Los técnicos en campo suelen perder señal; esto permite avisarles
 * y decidir si una acción debe encolarse en vez de fallar en silencio.
 */
@Injectable({
  providedIn: 'root',
})
export class ConexionService {
  private enLineaSubject = new BehaviorSubject<boolean>(navigator.onLine);
  enLinea$ = this.enLineaSubject.asObservable();

  constructor() {
    window.addEventListener('online', () => this.enLineaSubject.next(true));
    window.addEventListener('offline', () => this.enLineaSubject.next(false));
  }

  get enLinea(): boolean {
    return this.enLineaSubject.value;
  }
}
