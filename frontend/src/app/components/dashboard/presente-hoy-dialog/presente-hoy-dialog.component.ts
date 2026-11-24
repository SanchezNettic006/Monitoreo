import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EmpleadoService } from '../../../services/empleado.service';
import { ReportesService, AsistenciaReporte } from '../../../services/reportes.service';
import { DetalleCumplimientoDialogComponent } from '../../reportes/reportes.component';

interface EmpleadoHoy {
  id: number;
  nombre: string;
}

/**
 * Detalle de "Presente Hoy" del Home: quién ya marcó entrada hoy y quién
 * todavía no, abierto desde esa tarjeta del dashboard (solo admin).
 */
@Component({
  selector: 'app-presente-hoy-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>check_circle</mat-icon>
      Presente Hoy
    </h2>

    <mat-dialog-content>
      <div class="loading" *ngIf="cargando">
        <mat-spinner diameter="32"></mat-spinner>
      </div>

      <mat-tab-group *ngIf="!cargando">
        <mat-tab [label]="'Ya marcaron (' + presentes.length + ')'">
          <ul class="lista-empleados" *ngIf="presentes.length > 0">
            <li *ngFor="let empleado of presentes" (click)="verHistorial(empleado)">
              <mat-icon class="icono-ok">check_circle</mat-icon>
              {{ empleado.nombre }}
            </li>
          </ul>
          <p class="sin-datos" *ngIf="presentes.length === 0">Nadie ha marcado entrada todavía</p>
        </mat-tab>

        <mat-tab [label]="'Pendientes (' + pendientes.length + ')'">
          <ul class="lista-empleados" *ngIf="pendientes.length > 0">
            <li *ngFor="let empleado of pendientes" (click)="verHistorial(empleado)">
              <mat-icon class="icono-pendiente">schedule</mat-icon>
              {{ empleado.nombre }}
            </li>
          </ul>
          <p class="sin-datos" *ngIf="pendientes.length === 0">Todos los empleados ya marcaron</p>
        </mat-tab>
      </mat-tab-group>
    </mat-dialog-content>

    <mat-dialog-actions>
      <span class="spacer"></span>
      <button mat-stroked-button (click)="dialogRef.close()">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 30px 0;
    }
    .lista-empleados {
      list-style: none;
      margin: 0;
      padding: 12px 4px 4px;
      max-height: 340px;
      overflow-y: auto;
    }
    .lista-empleados li {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 4px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
      cursor: pointer;
      border-radius: 4px;
    }
    .lista-empleados li:hover {
      background: #f5f5f5;
    }
    .icono-ok {
      color: #2b8a3e;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .icono-pendiente {
      color: #f0a400;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .sin-datos {
      text-align: center;
      color: #999;
      padding: 30px 0;
    }
    mat-dialog-actions {
      display: flex;
    }
    .spacer {
      flex: 1;
    }
  `],
})
export class PresenteHoyDialogComponent implements OnInit {
  presentes: EmpleadoHoy[] = [];
  pendientes: EmpleadoHoy[] = [];
  cargando = true;

  constructor(
    public dialogRef: MatDialogRef<PresenteHoyDialogComponent>,
    private empleadoService: EmpleadoService,
    private reportesService: ReportesService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  private aFechaLocal(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  cargar(): void {
    this.cargando = true;
    this.empleadoService.obtenerTodos().subscribe({
      next: (response) => {
        const empleados = Array.isArray(response.data) ? response.data : [response.data];
        const lista: EmpleadoHoy[] = empleados.map((e: any) => ({
          id: e.id,
          nombre: `${e.nombre} ${e.apellido}`,
        }));

        if (lista.length === 0) {
          this.presentes = [];
          this.pendientes = [];
          this.cargando = false;
          return;
        }

        const porNombre = (a: EmpleadoHoy, b: EmpleadoHoy) => a.nombre.localeCompare(b.nombre);
        const hoy = this.aFechaLocal(new Date());
        this.reportesService.obtenerAsistencias(1, 500, undefined, hoy, hoy).subscribe({
          next: (resp) => {
            const registros: AsistenciaReporte[] = resp.data || [];
            const nombresConEntrada = new Set(
              registros.filter((r) => r.tipo === 'asistencia' && r.entrada).map((r) => r.empleado),
            );
            this.presentes = lista.filter((e) => nombresConEntrada.has(e.nombre)).sort(porNombre);
            this.pendientes = lista.filter((e) => !nombresConEntrada.has(e.nombre)).sort(porNombre);
            this.cargando = false;
          },
          error: () => {
            this.presentes = [];
            this.pendientes = lista.sort(porNombre);
            this.cargando = false;
          },
        });
      },
      error: () => {
        this.presentes = [];
        this.pendientes = [];
        this.cargando = false;
      },
    });
  }

  /** Abre el mismo calendario de cumplimiento (Reportado/Pendiente/Justificado) que usa Reportes, para el mes en curso */
  verHistorial(empleado: EmpleadoHoy): void {
    const hoy = new Date();
    const mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

    this.reportesService.obtenerDetalleCumplimientoEmpleado(empleado.id, mes).subscribe({
      next: (response) => {
        this.dialog.open(DetalleCumplimientoDialogComponent, {
          width: '420px',
          data: { detalle: response.data, mes },
        });
      },
    });
  }
}
