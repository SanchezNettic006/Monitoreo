import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SolicitudService, SaldoVacaciones } from '../../../services/solicitud.service';
import { AprobarRechazarDialogComponent } from './aprobar-rechazar-dialog/aprobar-rechazar-dialog.component';

@Component({
  selector: 'app-gestionar-solicitudes',
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
    MatDialogModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="gestionar-solicitudes-container">
      <!-- Loading -->
      <div *ngIf="loading" class="loading">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Cargando solicitudes pendientes...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && solicitudes.length === 0" class="empty-state">
        <mat-icon>check_circle</mat-icon>
        <h3>Sin solicitudes pendientes</h3>
        <p>Todas las solicitudes han sido procesadas.</p>
      </div>

      <!-- Tabla -->
      <div *ngIf="!loading && solicitudes.length > 0" class="table-container">
        <table mat-table [dataSource]="dataSource" class="solicitudes-table">
          <!-- Empleado Column -->
          <ng-container matColumnDef="empleado">
            <th mat-header-cell *matHeaderCellDef>Empleado</th>
            <td mat-cell *matCellDef="let element">
              <div class="empleado-info">
                <div class="empleado-nombre">{{ element.empleado?.nombre }} {{ element.empleado?.apellido }}</div>
                <div class="empleado-departamento">{{ element.empleado?.departamento?.nombre }}</div>
              </div>
            </td>
          </ng-container>

          <!-- Tipo Column -->
          <ng-container matColumnDef="tipo">
            <th mat-header-cell *matHeaderCellDef>Tipo</th>
            <td mat-cell *matCellDef="let element">
              {{ element.tipo | titlecase }}
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
            <th mat-header-cell *matHeaderCellDef>Días</th>
            <td mat-cell *matCellDef="let element">
              {{ element.dias_solicitados }}
              <div
                class="saldo-vacaciones"
                *ngIf="element.tipo === 'vacaciones' && saldosPorEmpleado[element.empleado?.id]"
                [class.saldo-insuficiente]="saldosPorEmpleado[element.empleado?.id].diasDisponibles < element.dias_solicitados"
              >
                Saldo: {{ saldosPorEmpleado[element.empleado?.id].diasDisponibles }} de
                {{ saldosPorEmpleado[element.empleado?.id].cupoAnual }} ({{ saldosPorEmpleado[element.empleado?.id].anio }})
              </div>
            </td>
          </ng-container>

          <!-- Motivo Column -->
          <ng-container matColumnDef="motivo">
            <th mat-header-cell *matHeaderCellDef>Motivo</th>
            <td mat-cell *matCellDef="let element">
              <span [title]="element.motivo">{{ element.motivo || '-' }}</span>
            </td>
          </ng-container>

          <!-- Estado Column -->
          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let element">
              <mat-chip
                [class.estado-pendiente]="element.estado === 'pendiente'"
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
                matTooltip="Aprobar"
                (click)="aprobar(element)"
                [disabled]="element.estado !== 'pendiente'"
              >
                <mat-icon class="aprobar-icon">check_circle</mat-icon>
              </button>
              <button
                mat-icon-button
                matTooltip="Rechazar"
                (click)="rechazar(element)"
                [disabled]="element.estado !== 'pendiente'"
              >
                <mat-icon class="rechazar-icon">cancel</mat-icon>
              </button>
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
      .gestionar-solicitudes-container {
        width: 100%;
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
          color: #666;
        }
      }

      .empty-state {
        text-align: center;
        padding: 60px 20px;

        mat-icon {
          font-size: 64px;
          width: 64px;
          height: 64px;
          color: #ddd;
          margin-bottom: 16px;
        }

        h3 {
          margin: 16px 0 8px;
          color: #666;
        }

        p {
          color: #999;
          font-size: 14px;
        }
      }

      .table-container {
        overflow-x: auto;
      }

      .solicitudes-table {
        width: 100%;

        th {
          background-color: #f5f5f5;
          font-weight: 600;
          color: #333;
          border-bottom: 2px solid #e0e0e0;
        }

        td {
          padding: 12px;
          border-bottom: 1px solid #e0e0e0;
        }

        tr:hover {
          background-color: #fafafa;
        }

        .empleado-info {
          .empleado-nombre {
            font-weight: 500;
            color: #333;
          }

          .empleado-departamento {
            font-size: 12px;
            color: #999;
            margin-top: 2px;
          }
        }

        .fecha-fin {
          display: block;
          font-size: 12px;
          color: #999;
          margin-top: 4px;
        }

        .saldo-vacaciones {
          font-size: 11px;
          color: #2b8a3e;
          margin-top: 2px;
          white-space: nowrap;

          &.saldo-insuficiente {
            color: #d32f2f;
            font-weight: 600;
          }
        }
      }

      mat-chip {
        &.estado-pendiente {
          background: #fff3e0;
          color: #f57c00;
        }
      }

      .aprobar-icon {
        color: #2b8a3e;
      }

      .rechazar-icon {
        color: #d32f2f;
      }

      button[disabled] {
        opacity: 0.5;
        cursor: not-allowed !important;
      }

      ::ng-deep .mat-mdc-paginator {
        background-color: transparent;
        border-top: 1px solid #e0e0e0;
      }
    `,
  ],
})
export class GestionarSolicitudesComponent implements OnInit, OnDestroy {
  solicitudes: any[] = [];
  dataSource = new MatTableDataSource<any>();
  displayedColumns: string[] = ['empleado', 'tipo', 'fechas', 'dias', 'motivo', 'estado', 'acciones'];
  loading = true;
  saldosPorEmpleado: Record<number, SaldoVacaciones> = {};
  private destroy$ = new Subject<void>();

  constructor(
    private solicitudService: SolicitudService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit() {
    this.cargarSolicitudesPendientes();
    
    // Suscribirse a cambios en solicitudes
    this.solicitudService.getSolicitudActualizadaNotification()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.cargarSolicitudesPendientes();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarSolicitudesPendientes() {
    this.loading = true;
    this.solicitudService.obtenerSolicitudesPendientes().subscribe({
      next: (data) => {
        this.solicitudes = data;
        this.dataSource.data = data;
        this.loading = false;
        this.cargarSaldosVacaciones(data);
      },
      error: (error) => {
        console.error('Error al cargar solicitudes:', error);
        this.loading = false;
      },
    });
  }

  /** Carga el saldo de vacaciones de cada empleado con una solicitud de tipo 'vacaciones' pendiente */
  private cargarSaldosVacaciones(solicitudes: any[]): void {
    const empleadoIds = new Set(
      solicitudes.filter((s) => s.tipo === 'vacaciones' && s.empleado?.id).map((s) => s.empleado.id),
    );
    empleadoIds.forEach((empleadoId) => {
      const anio = new Date().getFullYear();
      this.solicitudService.obtenerSaldoVacaciones(empleadoId, anio).subscribe({
        next: (saldo) => {
          this.saldosPorEmpleado[empleadoId] = saldo;
        },
        error: () => {},
      });
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

  aprobar(solicitud: any) {
    const dialogRef = this.dialog.open(AprobarRechazarDialogComponent, {
      data: { accion: 'aprobar', solicitud },
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.cambiarEstado(solicitud.id, 'aprobada', result.comentario, result.observacion);
      }
    });
  }

  rechazar(solicitud: any) {
    const dialogRef = this.dialog.open(AprobarRechazarDialogComponent, {
      data: { accion: 'rechazar', solicitud },
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.cambiarEstado(solicitud.id, 'rechazada', result.comentario, result.observacion);
      }
    });
  }

  cambiarEstado(solicitudId: number, estado: string, comentario?: string, observacion?: string) {
    this.solicitudService
      .cambiarEstado(solicitudId, estado, comentario, observacion)
      .subscribe({
        next: () => {
          this.snackBar.open(
            `Solicitud ${estado === 'aprobada' ? 'aprobada' : 'rechazada'} exitosamente`,
            'Cerrar',
            {
              duration: 3000,
              horizontalPosition: 'end',
              verticalPosition: 'bottom',
              panelClass: ['success-snackbar'],
            },
          );
          this.cargarSolicitudesPendientes();
        },
        error: (error) => {
          console.error('Error:', error);
          this.snackBar.open('Error al procesar la solicitud', 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'bottom',
          });
        },
      });
  }

  verDetalles(solicitud: any) {
    console.log('Ver detalles:', solicitud);
    // TODO: Abrir modal con detalles completos
  }

  onPageChange(event: PageEvent) {
    console.log('Page change:', event);
  }
}
