import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SolicitudService } from '../../../services/solicitud.service';

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
  ],
  template: `
    <div class="solicitudes-aprobadas-container">
      <div class="filtros-section">
        <mat-form-field appearance="fill" class="filter-field">
          <mat-label>Mes</mat-label>
          <mat-select [(ngModel)]="mesSeleccionado" (selectionChange)="cargar()">
            <mat-option value="">Todos los meses</mat-option>
            <mat-option *ngFor="let opcion of opcionesMes" [value]="opcion.value">{{ opcion.label }}</mat-option>
          </mat-select>
        </mat-form-field>
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
            <td mat-cell *matCellDef="let element">{{ element.tipo | titlecase }}</td>
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

      .filtros-section {
        margin-bottom: 16px;
      }

      .filter-field {
        min-width: 220px;
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
  solicitudes: any[] = [];
  dataSource = new MatTableDataSource<any>();
  displayedColumns: string[] = ['empleado', 'tipo', 'fechas', 'dias', 'motivo'];
  loading = true;
  mesSeleccionado = new Date().toISOString().slice(0, 7);
  opcionesMes: { value: string; label: string }[] = [];

  constructor(private solicitudService: SolicitudService) {}

  ngOnInit() {
    this.opcionesMes = this.generarOpcionesMes();
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
    this.solicitudService.obtenerSolicitudesAprobadas(this.mesSeleccionado || undefined).subscribe({
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

  onPageChange(event: PageEvent) {
    console.log('Page change:', event);
  }
}
