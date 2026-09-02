import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SolicitudService } from '../../../services/solicitud.service';
import { ReprogramarDialogComponent } from './reprogramar-dialog/reprogramar-dialog.component';
import { TipoTramitePipe } from '../../../pipes/tipo-tramite.pipe';

interface MesComparacion {
  mes: string;
  label: string;
  cantidad: number;
}

@Component({
  selector: 'app-solicitudes-aprobadas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    TipoTramitePipe,
  ],
  template: `
    <div class="solicitudes-aprobadas-container">
      <!-- Comparación de los últimos 3 meses -->
      <div class="comparacion-section" *ngIf="!cargandoComparacion">
        <h3 class="comparacion-titulo">Aprobados por mes</h3>
        <div class="comparacion-chart" role="img" [attr.aria-label]="descripcionComparacion">
          <div class="comparacion-barra" *ngFor="let m of mesesComparacion" [title]="m.cantidad + ' trámite(s) aprobado(s) en ' + m.label">
            <span class="comparacion-valor">{{ m.cantidad }}</span>
            <div class="comparacion-columna">
              <div class="comparacion-fill" [style.height.%]="maxComparacion > 0 ? (m.cantidad / maxComparacion) * 100 : 0"></div>
            </div>
            <span class="comparacion-mes">{{ m.label }}</span>
          </div>
        </div>
      </div>

      <div class="filtros-section">
        <mat-form-field appearance="fill" class="filter-field">
          <mat-label>Mes</mat-label>
          <mat-select [(ngModel)]="mesSeleccionado" (selectionChange)="cargar()">
            <mat-option value="">Todos los meses</mat-option>
            <mat-option *ngFor="let opcion of opcionesMes" [value]="opcion.value">{{ opcion.label }}</mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Filtro por tipo llegado desde otra pantalla (ej. Panel General → Ausencias del mes) -->
        <div class="filtro-tipo-chip" *ngIf="tipoFiltro">
          <mat-icon>filter_alt</mat-icon>
          <span>Filtrando: {{ tipoFiltro | tipoTramite }}</span>
          <button mat-icon-button (click)="quitarFiltroTipo()" title="Quitar filtro">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Cargando solicitudes aprobadas...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && solicitudes.length === 0" class="empty-state">
        <mat-icon>check_circle</mat-icon>
        <h3>Sin solicitudes aprobadas</h3>
        <p>No hay trámites aprobados {{ mesSeleccionado ? 'para este mes' : 'todavía' }}.</p>
      </div>

      <!-- Tabla -->
      <div *ngIf="!loading && solicitudes.length > 0" class="table-container">
        <table mat-table [dataSource]="dataSource" class="solicitudes-table">
          <ng-container matColumnDef="empleado">
            <th mat-header-cell *matHeaderCellDef>Empleado</th>
            <td mat-cell *matCellDef="let element">
              <div class="empleado-info">
                <div class="empleado-nombre">{{ element.empleado?.nombre }} {{ element.empleado?.apellido }}</div>
                <div class="empleado-departamento">{{ element.empleado?.departamento?.nombre }}</div>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="tipo">
            <th mat-header-cell *matHeaderCellDef>Tipo</th>
            <td mat-cell *matCellDef="let element">{{ element.tipo | tipoTramite }}</td>
          </ng-container>

          <ng-container matColumnDef="fechas">
            <th mat-header-cell *matHeaderCellDef>Fechas</th>
            <td mat-cell *matCellDef="let element">
              {{ element.fecha_inicio | date: 'dd/MM/yyyy' }}
              <span *ngIf="element.fecha_fin" class="fecha-fin">a {{ element.fecha_fin | date: 'dd/MM/yyyy' }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="dias">
            <th mat-header-cell *matHeaderCellDef>Días</th>
            <td mat-cell *matCellDef="let element">{{ element.dias_solicitados }}</td>
          </ng-container>

          <ng-container matColumnDef="motivo">
            <th mat-header-cell *matHeaderCellDef>Motivo</th>
            <td mat-cell *matCellDef="let element">
              <span [title]="element.motivo">{{ element.motivo || '-' }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef>Acciones</th>
            <td mat-cell *matCellDef="let element">
              <button mat-icon-button matTooltip="Reprogramar fecha" (click)="reprogramar(element)">
                <mat-icon>event_repeat</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

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
      .solicitudes-aprobadas-container {
        width: 100%;
      }

      .comparacion-section {
        background: white;
        border: 1px solid #eee;
        border-radius: 10px;
        padding: 20px;
        margin-bottom: 20px;
      }

      .comparacion-titulo {
        margin: 0 0 16px;
        font-size: 14px;
        font-weight: 700;
        color: #333;
      }

      .comparacion-chart {
        display: flex;
        align-items: flex-end;
        gap: 24px;
        height: 160px;
        padding: 0 8px;
      }

      .comparacion-barra {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        max-width: 96px;
        height: 100%;
      }

      .comparacion-valor {
        font-size: 13px;
        font-weight: 700;
        color: #2b8a3e;
        margin-bottom: 6px;
      }

      .comparacion-columna {
        flex: 1;
        width: 100%;
        display: flex;
        align-items: flex-end;
      }

      .comparacion-fill {
        width: 100%;
        min-height: 4px;
        background: #2b8a3e;
        border-radius: 4px 4px 0 0;
        transition: height 0.3s ease;
      }

      .comparacion-mes {
        margin-top: 8px;
        font-size: 12px;
        color: #666;
        text-align: center;
      }

      .filtros-section {
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }

      .filter-field {
        min-width: 220px;
      }

      .filtro-tipo-chip {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 4px 4px 12px;
        background: #f0fbe8;
        border: 1px solid #2b8a3e;
        border-radius: 20px;
        color: #2b8a3e;
        font-size: 13px;
        font-weight: 600;

        mat-icon:first-child {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }

        button {
          width: 24px;
          height: 24px;
          line-height: 24px;

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
          }
        }
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
        padding: 0 8px;
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
      }

      ::ng-deep .mat-mdc-paginator {
        background-color: transparent;
        border-top: 1px solid #e0e0e0;
      }
    `,
  ],
})
export class SolicitudesAprobadasComponent implements OnInit {
  /** Mes inicial ('YYYY-MM'), ej. al llegar desde Panel General con un mes específico */
  @Input() mesInicial?: string;
  /** Filtro de tipo de trámite (ej. 'ausencia'), ej. al llegar desde Panel General */
  @Input() tipoFiltro?: string;

  solicitudes: any[] = [];
  dataSource = new MatTableDataSource<any>();
  displayedColumns: string[] = ['empleado', 'tipo', 'fechas', 'dias', 'motivo', 'acciones'];
  loading = true;
  mesSeleccionado = new Date().toISOString().slice(0, 7);
  opcionesMes: { value: string; label: string }[] = [];

  // Comparación de los últimos 3 meses, independiente del filtro de la tabla
  mesesComparacion: MesComparacion[] = [];
  maxComparacion = 0;
  cargandoComparacion = true;

  constructor(
    private solicitudService: SolicitudService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  get descripcionComparacion(): string {
    return (
      'Trámites aprobados por mes: ' +
      this.mesesComparacion.map((m) => `${m.label} ${m.cantidad}`).join(', ')
    );
  }

  ngOnInit() {
    this.opcionesMes = this.generarOpcionesMes();
    if (this.mesInicial) {
      this.mesSeleccionado = this.mesInicial;
    }
    this.cargar();
    this.cargarComparacionTresMeses();
  }

  quitarFiltroTipo() {
    this.tipoFiltro = undefined;
    this.cargar();
  }

  private generarOpcionesMes(): { value: string; label: string }[] {
    const opciones: { value: string; label: string }[] = [];
    const hoy = new Date();
    for (let i = 0; i < 12; i++) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const value = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const label = fecha.toLocaleDateString('es-SV', { month: 'long', year: 'numeric' });
      opciones.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return opciones;
  }

  cargar() {
    this.loading = true;
    this.solicitudService.obtenerSolicitudesAprobadas(this.mesSeleccionado || undefined, this.tipoFiltro).subscribe({
      next: (data) => {
        this.solicitudes = data;
        this.dataSource.data = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar solicitudes aprobadas:', error);
        this.loading = false;
      },
    });
  }

  /** Cuenta trámites aprobados de cada uno de los últimos 3 meses, para comparar */
  private cargarComparacionTresMeses() {
    this.cargandoComparacion = true;
    const meses = this.generarOpcionesMes().slice(0, 3).reverse(); // más viejo -> más nuevo

    forkJoin(meses.map((m) => this.solicitudService.obtenerSolicitudesAprobadas(m.value))).subscribe({
      next: (resultados) => {
        this.mesesComparacion = meses.map((m, i) => ({
          mes: m.value,
          label: m.label.split(' ')[0], // solo el nombre del mes, sin el año
          cantidad: resultados[i].length,
        }));
        this.maxComparacion = Math.max(...this.mesesComparacion.map((m) => m.cantidad), 0);
        this.cargandoComparacion = false;
      },
      error: (error) => {
        console.error('Error al cargar comparación de meses:', error);
        this.cargandoComparacion = false;
      },
    });
  }

  reprogramar(solicitud: any) {
    const dialogRef = this.dialog.open(ReprogramarDialogComponent, {
      data: { solicitud },
      width: '450px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;

      this.solicitudService
        .reprogramarSolicitud(solicitud.id, result.nuevaFechaInicio, result.nuevaFechaFin, result.motivo)
        .subscribe({
          next: () => {
            this.snackBar.open('Solicitud reprogramada correctamente', 'Cerrar', {
              duration: 3000,
              horizontalPosition: 'end',
              verticalPosition: 'bottom',
              panelClass: ['success-snackbar'],
            });
            this.cargar();
            this.cargarComparacionTresMeses();
          },
          error: (error) => {
            this.snackBar.open(
              error.error?.mensaje || 'Error al reprogramar la solicitud',
              'Cerrar',
              { duration: 3000, horizontalPosition: 'end', verticalPosition: 'bottom' },
            );
          },
        });
    });
  }

  onPageChange(event: PageEvent) {
    console.log('Page change:', event);
  }
}
