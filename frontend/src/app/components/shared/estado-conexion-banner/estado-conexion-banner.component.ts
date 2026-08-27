import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { map } from 'rxjs';
import { ConexionService } from '../../../services/conexion.service';
import { ColaOfflineService } from '../../../services/cola-offline.service';

/**
 * Banner global fijo que avisa al técnico cuando no tiene señal, y cuánto tiene
 * pendiente de sincronizar. Se monta una sola vez en app.component para que
 * aparezca sin importar en qué pantalla esté (registro de asistencia, horas
 * extra, etc.), ya que la pérdida de señal puede ocurrir en cualquier momento.
 */
@Component({
  selector: 'app-estado-conexion-banner',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="banner sin-conexion" *ngIf="!(enLinea$ | async)">
      <mat-icon>cloud_off</mat-icon>
      <span>
        Sin conexión — tus acciones se guardan y se enviarán automáticamente cuando vuelva la señal.
      </span>
    </div>

    <div class="banner pendientes" *ngIf="(enLinea$ | async) && (cantidadPendientes$ | async) as cantidad">
      <mat-icon [class.girando]="sincronizando$ | async">sync</mat-icon>
      <span>
        {{ (sincronizando$ | async) ? 'Sincronizando' : 'Tienes' }}
        {{ cantidad }} {{ cantidad === 1 ? 'registro pendiente' : 'registros pendientes' }} de enviar…
      </span>
    </div>
  `,
  styles: [
    `
      .banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 8px 16px;
        font-size: 13px;
        font-weight: 500;
        color: white;
        text-align: center;
      }

      .sin-conexion {
        background: #d32f2f;
      }

      .pendientes {
        background: #f0a400;
        top: 0;
      }

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .girando {
        animation: girar 1.2s linear infinite;
      }

      @keyframes girar {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class EstadoConexionBannerComponent implements OnInit {
  enLinea$;
  sincronizando$;
  cantidadPendientes$;

  constructor(
    private conexionService: ConexionService,
    private colaOfflineService: ColaOfflineService,
  ) {
    this.enLinea$ = this.conexionService.enLinea$;
    this.sincronizando$ = this.colaOfflineService.sincronizando$;
    this.cantidadPendientes$ = this.colaOfflineService.pendientes$.pipe(map((pendientes) => pendientes.length));
  }

  ngOnInit(): void {}
}
