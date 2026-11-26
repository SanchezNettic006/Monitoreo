import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EmpleadoService } from '../../../services/empleado.service';
import { ReportesService, AsistenciaReporte } from '../../../services/reportes.service';
import { SolicitudService } from '../../../services/solicitud.service';
import { DescansoService } from '../../../services/descanso.service';
import { DetalleCumplimientoDialogComponent } from '../../reportes/reportes.component';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
            <li
              *ngFor="let empleado of presentes"
              [class.cargando-fila]="cargandoHistorialId === empleado.id"
              (click)="verHistorial(empleado)"
            >
              <mat-icon class="icono-ok" *ngIf="cargandoHistorialId !== empleado.id">check_circle</mat-icon>
              <mat-spinner *ngIf="cargandoHistorialId === empleado.id" diameter="18"></mat-spinner>
              {{ empleado.nombre }}
            </li>
          </ul>
          <p class="sin-datos" *ngIf="presentes.length === 0">Nadie ha marcado entrada todavía</p>
        </mat-tab>

        <mat-tab [label]="'Pendientes (' + pendientes.length + ')'">
          <ul class="lista-empleados" *ngIf="pendientes.length > 0">
            <li
              *ngFor="let empleado of pendientes"
              [class.cargando-fila]="cargandoHistorialId === empleado.id"
              (click)="verHistorial(empleado)"
            >
              <mat-icon class="icono-pendiente" *ngIf="cargandoHistorialId !== empleado.id">schedule</mat-icon>
              <mat-spinner *ngIf="cargandoHistorialId === empleado.id" diameter="18"></mat-spinner>
              {{ empleado.nombre }}
            </li>
          </ul>
          <p class="sin-datos" *ngIf="pendientes.length === 0">Todos los empleados ya marcaron</p>
        </mat-tab>

        <mat-tab [label]="'No les toca hoy (' + ausentes.length + ')'" *ngIf="ausentes.length > 0">
          <ul class="lista-empleados" *ngIf="ausentes.length > 0">
            <li
              *ngFor="let empleado of ausentes"
              [class.cargando-fila]="cargandoHistorialId === empleado.id"
              (click)="verHistorial(empleado)"
            >
              <mat-icon class="icono-ausente" *ngIf="cargandoHistorialId !== empleado.id">event_busy</mat-icon>
              <mat-spinner *ngIf="cargandoHistorialId === empleado.id" diameter="18"></mat-spinner>
              {{ empleado.nombre }}
            </li>
          </ul>
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
    .lista-empleados li.cargando-fila {
      cursor: wait;
      opacity: 0.7;
    }
    .lista-empleados mat-spinner {
      display: inline-block;
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
    .icono-ausente {
      color: #6b7d94;
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
  ausentes: EmpleadoHoy[] = [];
  cargando = true;
  cargandoHistorialId: number | null = null;

  constructor(
    public dialogRef: MatDialogRef<PresenteHoyDialogComponent>,
    private empleadoService: EmpleadoService,
    private reportesService: ReportesService,
    private solicitudService: SolicitudService,
    private descansoService: DescansoService,
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
        // Quienes marcan en reloj biométrico físico (solo_tramites) nunca tendrán
        // entrada en la app: no tiene sentido contarlos como "pendientes" de marcar.
        const empleados = (Array.isArray(response.data) ? response.data : [response.data]).filter(
          (e: any) => !e.solo_tramites && e.estado !== 'inactivo',
        );
        const lista: EmpleadoHoy[] = empleados.map((e: any) => ({
          id: e.id,
          nombre: `${e.nombre} ${e.apellido}`,
        }));

        if (lista.length === 0) {
          this.presentes = [];
          this.pendientes = [];
          this.ausentes = [];
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
            forkJoin({
              ausentes: this.solicitudService.obtenerAusentesHoy().pipe(catchError(() => of([]))),
              descansos: this.descansoService.obtenerDescansosHoy().pipe(catchError(() => of([]))),
            }).subscribe(({ ausentes, descansos }) => {
              const nombresAusentes = new Set([
                ...ausentes.map((a) => a.nombre_completo),
                ...descansos.map((d) => d.nombre_completo),
              ]);
              this.presentes = lista.filter((e) => nombresConEntrada.has(e.nombre)).sort(porNombre);
              this.ausentes = lista
                .filter((e) => !nombresConEntrada.has(e.nombre) && nombresAusentes.has(e.nombre))
                .sort(porNombre);
              this.pendientes = lista
                .filter((e) => !nombresConEntrada.has(e.nombre) && !nombresAusentes.has(e.nombre))
                .sort(porNombre);
              this.cargando = false;
            });
          },
          error: () => {
            this.presentes = [];
            this.ausentes = [];
            this.pendientes = lista.sort(porNombre);
            this.cargando = false;
          },
        });
      },
      error: () => {
        this.presentes = [];
        this.ausentes = [];
        this.pendientes = [];
        this.cargando = false;
      },
    });
  }

  /** Abre el mismo calendario de cumplimiento (Reportado/Pendiente/Justificado) que usa Reportes, para el mes en curso */
  verHistorial(empleado: EmpleadoHoy): void {
    // Mientras carga, la fila no da ninguna señal visual de que el clic
    // registró: eso hacía que se pareciera a que no pasó nada y, con varios
    // usuarios en el mismo panel, varios clics (y varios diálogos) se
    // acumulaban. Se bloquean clics nuevos mientras se resuelve este.
    if (this.cargandoHistorialId !== null) return;

    this.cargandoHistorialId = empleado.id;
    const hoy = new Date();
    const mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

    this.reportesService.obtenerDetalleCumplimientoEmpleado(empleado.id, mes).subscribe({
      next: (response) => {
        this.cargandoHistorialId = null;
        this.dialog.open(DetalleCumplimientoDialogComponent, {
          width: '420px',
          data: { detalle: response.data, mes },
        });
      },
      error: () => {
        this.cargandoHistorialId = null;
      },
    });
  }
}
