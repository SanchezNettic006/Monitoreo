import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SolicitudService, Solicitud } from '../../../services/solicitud.service';
import { TipoTramitePipe } from '../../../pipes/tipo-tramite.pipe';

@Component({
  selector: 'app-mis-solicitudes',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    TipoTramitePipe,
  ],
  template: `
    <div class="mis-solicitudes-container">
      <!-- Loading -->
      <div *ngIf="loading" class="loading">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Cargando solicitudes...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && solicitudes.length === 0" class="empty-state">
        <mat-icon>inbox</mat-icon>
        <h3>Sin solicitudes</h3>
        <p>No has creado ninguna solicitud aún. Crea una nueva en la pestaña correspondiente.</p>
      </div>

      <!-- Tabla -->
      <div *ngIf="!loading && solicitudes.length > 0" class="table-container">
        <table mat-table [dataSource]="dataSource" class="solicitudes-table">
          <!-- Tipo Column -->
          <ng-container matColumnDef="tipo">
            <th mat-header-cell *matHeaderCellDef>Tipo</th>
            <td mat-cell *matCellDef="let element">
              {{ element.tipo | tipoTramite }}
            </td>
          </ng-container>

          <!-- Fechas Column -->
          <ng-container matColumnDef="fechas">
            <th mat-header-cell *matHeaderCellDef>Fecha de Solicitud</th>
            <td mat-cell *matCellDef="let element">
              {{ element.fecha_inicio | date: 'dd/MM/yyyy' }}
              <span *ngIf="element.fecha_fin" class="fecha-fin">
                a {{ element.fecha_fin | date: 'dd/MM/yyyy' }}
              </span>
            </td>
          </ng-container>

          <!-- Días Column -->
          <ng-container matColumnDef="dias">
            <th mat-header-cell *matHeaderCellDef>Días Solicitados</th>
            <td mat-cell *matCellDef="let element">
              {{ element.dias_solicitados }}
            </td>
          </ng-container>

          <!-- Motivo Column -->
          <ng-container matColumnDef="motivo">
            <th mat-header-cell *matHeaderCellDef>Motivo</th>
            <td mat-cell *matCellDef="let element">
              {{ element.motivo || '-' }}
            </td>
          </ng-container>

          <!-- Estado Column -->
          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let element">
              <mat-chip
                [class.estado-pendiente]="element.estado === 'pendiente'"
                [class.estado-aprobada]="element.estado === 'aprobada'"
                [class.estado-rechazada]="element.estado === 'rechazada'"
                [class.estado-cancelada]="element.estado === 'cancelada'"
              >
                {{ getEstadoLabel(element.estado) }}
              </mat-chip>
            </td>
          </ng-container>

          <!-- Acciones Column -->
          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef>Acciones</th>
            <td mat-cell *matCellDef="let element">
              <button
                mat-icon-button
                matTooltip="Ver detalles"
                (click)="verDetalles(element)"
              >
                <mat-icon>visibility</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <!-- Paginator -->
        <mat-paginator
          [length]="solicitudes.length"
          [pageSize]="20"
          [pageSizeOptions]="[10, 20, 50, 100]"
          (page)="onPageChange($event)"
        >
        </mat-paginator>
      </div>
    </div>
  `,
  styles: [
    `
      .mis-solicitudes-container {
        width: 100%;
        color: #e7f0e5;

        // Repintado de Material vía sus propias variables (paginador): más
        // confiable que pelear con la especificidad de sus clases internas.
        --mat-paginator-container-background-color: transparent;
        --mat-paginator-container-text-color: #8fa98f;
        --mat-paginator-enabled-icon-color: #8fa98f;
      }

      .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;

        p {
          margin-top: 16px;
          color: #8fa98f;
        }
      }

      .empty-state {
        text-align: center;
        padding: 60px 20px;

        mat-icon {
          font-size: 64px;
          width: 64px;
          height: 64px;
          color: rgba(255, 255, 255, 0.15);
          margin-bottom: 16px;
        }

        h3 {
          margin: 16px 0 8px;
          color: #e7f0e5;
        }

        p {
          color: #8fa98f;
          font-size: 14px;
        }
      }

      .table-container {
        overflow-x: auto;
        padding: 0 8px;
        background: #182d19;
        border-radius: 10px;
      }

      .solicitudes-table {
        width: 100%;
        background: transparent;

        th {
          background-color: #10200f;
          font-weight: 600;
          color: #8fa98f;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1);
        }

        td {
          padding: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          color: #e7f0e5;
        }

        tr:hover {
          background-color: rgba(255, 255, 255, 0.03);
        }

        .fecha-fin {
          display: block;
          font-size: 12px;
          color: #8fa98f;
          margin-top: 4px;
        }
      }

      mat-chip {
        &.estado-pendiente {
          background: rgba(240, 164, 0, 0.18) !important;
          color: #f0a400 !important;
        }

        &.estado-aprobada {
          background: rgba(148, 193, 32, 0.18) !important;
          color: #94c120 !important;
        }

        &.estado-rechazada {
          background: rgba(211, 47, 47, 0.18) !important;
          color: #ff6b6b !important;
        }

        &.estado-cancelada {
          background: rgba(123, 31, 162, 0.22) !important;
          color: #d9a3f0 !important;
        }
      }

      .mis-solicitudes-container ::ng-deep .mat-mdc-paginator {
        background-color: transparent;
        color: #8fa98f;
        border-top: 1px solid rgba(255, 255, 255, 0.08);

        .mat-mdc-paginator-icon {
          fill: #8fa98f;
        }
      }
    `,
  ],
})
export class MisSolicitudesComponent implements OnInit, OnDestroy {
  solicitudes: Solicitud[] = [];
  dataSource = new MatTableDataSource<Solicitud>();
  displayedColumns: string[] = ['tipo', 'fechas', 'dias', 'motivo', 'estado', 'acciones'];
  loading = true;
  private destroy$ = new Subject<void>();

  constructor(
    private solicitudService: SolicitudService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit() {
    console.log('🚀 [MisSolicitudes] ngOnInit - Componente inicializado');
    this.cargarMisSolicitudes();
    
    // Suscribirse a cambios en solicitudes
    this.solicitudService.getSolicitudCreadaNotification()
      .pipe(takeUntil(this.destroy$))
      .subscribe((notification) => {
        console.log('🔔 [MisSolicitudes] Notificación de solicitud creada recibida', notification);
        this.cargarMisSolicitudes();
        this.snackBar.open(notification.message, 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom',
          panelClass: ['success-snackbar'],
        });
      });

    this.solicitudService.getSolicitudActualizadaNotification()
      .pipe(takeUntil(this.destroy$))
      .subscribe((notification) => {
        console.log('🔔 [MisSolicitudes] Notificación de solicitud actualizada recibida', notification);
        this.cargarMisSolicitudes();
        this.snackBar.open(notification.message, 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom',
          panelClass: notification.status === 'rechazada' ? ['error-snackbar'] : ['success-snackbar'],
        });
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarMisSolicitudes() {
    this.loading = true;
    console.log('🔄 [MisSolicitudes] Iniciando carga de solicitudes...');
    
    this.solicitudService.obtenerMisSolicitudes().subscribe({
      next: (data) => {
        console.log('✅ [MisSolicitudes] Datos recibidos:', data);
        this.solicitudes = data;
        this.dataSource.data = data;
        this.loading = false;
        console.log('📊 [MisSolicitudes] dataSource actualizado. Longitud:', this.dataSource.data.length);
      },
      error: (error) => {
        console.error('❌ [MisSolicitudes] Error al cargar solicitudes:', error);
        this.loading = false;
      },
    });
  }

  getEstadoLabel(estado: string): string {
    const labels: { [key: string]: string } = {
      pendiente: 'Pendiente',
      aprobada: 'Aprobada',
      rechazada: 'Rechazada',
      cancelada: 'Cancelada',
    };
    return labels[estado] || estado;
  }

  verDetalles(solicitud: Solicitud) {
    console.log('Ver detalles:', solicitud);
    // TODO: Abrir modal con detalles
  }

  onPageChange(event: PageEvent) {
    console.log('Page change:', event);
  }
}
