import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import {
  ReportesService,
  AsistenciaReporte,
  ResumenReportes,
  DepartamentoStats,
  CumplimientoResponse,
  CumplimientoDepartamento,
  CumplimientoEmpleado,
  DetalleCumplimientoEmpleado,
} from '../../services/reportes.service';
import { ExportarExcelService } from '../../services/exportar-excel.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatDialogModule,
    MatMenuModule,
  ],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.scss',
})
export class ReportesComponent implements OnInit {
  // Datos
  asistencias = new MatTableDataSource<AsistenciaReporte>([]);
  resumen: ResumenReportes | null = null;
  departamentos: DepartamentoStats[] = [];
  cargando = false;

  // Paginación
  page = 1;
  limit = 20;
  total = 0;
  pageSizeOptions = [10, 20, 50, 100];

  // Filtros
  filtroFechaInicio: Date | null = null;
  filtroFechaFin: Date | null = null;
  filtroNombreEmpleado = '';
  filtroDepartamentoId: number | null = null;
  listaDepartamentos = [
    { id: 1, nombre: 'Taller' },
    { id: 2, nombre: 'PLEX' },
    { id: 3, nombre: 'Administración' },
    { id: 4, nombre: 'Troncal' },
    { id: 5, nombre: 'Ventas' },
    { id: 6, nombre: 'SAC' },
    { id: 7, nombre: 'Vehículos' },
  ];

  // Cumplimiento de reportes (gráfica)
  cumplimiento: CumplimientoResponse | null = null;
  cargandoCumplimiento = false;
  mesCumplimiento = new Date().toISOString().slice(0, 7);
  opcionesMesCumplimiento: { value: string; label: string }[] = [];
  departamentoCumplimientoActivo: CumplimientoDepartamento | null = null;

  // Columnas tabla
  displayedColumns: string[] = [
    'fecha',
    'empleado',
    'departamento',
    'entrada',
    'salida',
    'horasTrabajadas',
    'totalPausas',
    'horasExtras',
    'horasNetas',
    'fotos',
  ];

  exportando = false;

  constructor(
    private reportesService: ReportesService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private exportarExcelService: ExportarExcelService,
  ) {}

  ngOnInit(): void {
    this.cargarResumen();
    this.cargarAsistencias();
    this.cargarDepartamentos();
    this.opcionesMesCumplimiento = this.generarOpcionesMes();
    this.cargarCumplimiento();
  }

  private generarOpcionesMes(): { value: string; label: string }[] {
    const opciones: { value: string; label: string }[] = [];
    const hoy = new Date();
    for (let i = 0; i < 6; i++) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const value = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const label = fecha.toLocaleDateString('es-SV', { month: 'long', year: 'numeric' });
      opciones.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return opciones;
  }

  /**
   * Cumplimiento de reportes (días con check-out) del mes, por departamento
   */
  cargarCumplimiento(): void {
    this.cargandoCumplimiento = true;
    this.departamentoCumplimientoActivo = null;
    this.reportesService.obtenerCumplimiento(this.mesCumplimiento).subscribe({
      next: (response) => {
        this.cumplimiento = response.data;
        this.cargandoCumplimiento = false;
      },
      error: () => {
        this.cumplimiento = null;
        this.cargandoCumplimiento = false;
      },
    });
  }

  verDepartamentoCumplimiento(departamento: CumplimientoDepartamento): void {
    this.departamentoCumplimientoActivo = departamento;
  }

  volverADepartamentosCumplimiento(): void {
    this.departamentoCumplimientoActivo = null;
  }

  abrirDetalleEmpleadoCumplimiento(empleado: CumplimientoEmpleado): void {
    this.reportesService.obtenerDetalleCumplimientoEmpleado(empleado.empleadoId, this.mesCumplimiento).subscribe({
      next: (response) => {
        this.dialog.open(DetalleCumplimientoDialogComponent, {
          width: '420px',
          data: { detalle: response.data, mes: this.mesCumplimiento },
        });
      },
      error: () => {
        this.snackBar.open('Error al cargar el detalle', 'Cerrar', { duration: 3000 });
      },
    });
  }

  /**
   * Cargar resumen de estadísticas
   */
  cargarResumen(): void {
    this.reportesService.obtenerResumen().subscribe({
      next: (response) => {
        this.resumen = response.data;
      },
      error: (error) => {
        console.error('Error al cargar resumen:', error);
        this.snackBar.open('Error al cargar resumen', 'Cerrar', { duration: 3000 });
      },
    });
  }

  /**
   * Cargar asistencias con filtros
   */
  cargarAsistencias(): void {
    this.cargando = true;
    this.reportesService
      .obtenerAsistencias(
        this.page,
        this.limit,
        undefined,
        this.filtroFechaInicio || undefined,
        this.filtroFechaFin || undefined,
        this.filtroDepartamentoId || undefined,
        this.filtroNombreEmpleado || undefined,
      )
      .subscribe({
        next: (response) => {
          console.log('Respuesta de asistencias:', response);
          console.log('Datos:', response.data);
          console.log('Total:', response.paginacion.total);
          
          // Reinicializar MatTableDataSource con los nuevos datos
          this.asistencias = new MatTableDataSource(response.data);
          this.total = response.paginacion.total;
          this.cargando = false;
          
          console.log('AsistenciasDataSource después de asignar:', this.asistencias.data);
        },
        error: (error) => {
          console.error('Error al cargar asistencias:', error);
          this.snackBar.open('Error al cargar asistencias', 'Cerrar', { duration: 3000 });
          this.cargando = false;
        },
      });
  }

  /**
   * Cargar estadísticas por departamento
   */
  cargarDepartamentos(): void {
    this.reportesService.obtenerPorDepartamento().subscribe({
      next: (response) => {
        this.departamentos = response.data;
      },
      error: (error) => {
        console.error('Error al cargar departamentos:', error);
      },
    });
  }

  /**
   * Calcular horas netas (trabajadas - pausas + extras)
   */
  calcularHorasNetas(horasTrabajadas: number | null, totalPausas: number | null, horasExtras: number | null = 0): number {
    // Validar que todos los valores sean números válidos
    const horas = typeof horasTrabajadas === 'number' && !isNaN(horasTrabajadas) ? horasTrabajadas : 0;
    const pausas = typeof totalPausas === 'number' && !isNaN(totalPausas) ? totalPausas : 0;
    const extras = typeof horasExtras === 'number' && !isNaN(horasExtras) ? horasExtras : 0;
    
    return horas - pausas + extras;
  }

  /**
   * Manejar cambio de página
   */
  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.limit = event.pageSize;
    this.cargarAsistencias();
  }

  /**
   * Aplicar filtros
   */
  aplicarFiltros(): void {
    this.page = 1;
    this.cargarAsistencias();
  }

  /**
   * Limpiar filtros
   */
  limpiarFiltros(): void {
    this.filtroFechaInicio = null;
    this.filtroFechaFin = null;
    this.filtroNombreEmpleado = '';
    this.filtroDepartamentoId = null;
    this.page = 1;
    this.cargarAsistencias();
  }

  /**
   * Formatear hora
   */
  formatearHora(hora?: string | Date | null): string {
    if (!hora) return '--:--';
    try {
      const date = new Date(hora);
      return date.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  }

  /**
   * Formatear fecha
   */
  formatearFecha(fecha?: string | Date | null): string {
    if (!fecha) return '--';
    try {
      // Fecha sin hora (ej: 'YYYY-MM-DD'): parsear como fecha local para evitar desfase de zona horaria
      const date = typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)
        ? new Date(`${fecha}T00:00:00`)
        : new Date(fecha);
      return date.toLocaleDateString('es-SV');
    } catch {
      return '--';
    }
  }

  /**
   * Ver fotos de un registro
   */
  verFotos(fotos?: any[], descripcion?: string | null): void {
    if (!fotos || fotos.length === 0) {
      this.snackBar.open('No hay fotos disponibles', 'Cerrar', { duration: 3000 });
      return;
    }

    this.dialog.open(FotosDialogComponent, {
      width: '600px',
      data: { fotos, descripcion },
    });
  }

  /** true si la fila tiene al menos una ubicación de marcaje registrada */
  tieneUbicacion(element: AsistenciaReporte): boolean {
    return !!(element.latitudEntrada || element.latitudSalida);
  }

  /** Abre la ubicación (lat/lng) en Google Maps en una pestaña nueva */
  abrirMapa(lat?: number | null, lng?: number | null): void {
    if (!lat || !lng) return;
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  }

  /**
   * Exportar a Excel todos los registros que coinciden con los filtros actuales
   * (no solo la página visible)
   */
  exportarExcel(): void {
    this.exportando = true;
    this.reportesService
      .obtenerAsistencias(
        1,
        10000,
        undefined,
        this.filtroFechaInicio || undefined,
        this.filtroFechaFin || undefined,
        this.filtroDepartamentoId || undefined,
        this.filtroNombreEmpleado || undefined,
      )
      .subscribe({
        next: (response) => {
          const filas = (response.data as AsistenciaReporte[]).map((r) => ({
            Fecha: this.formatearFecha(r.fecha),
            Empleado: r.empleado,
            Departamento: r.departamento || '-',
            Proyecto: r.tipo === 'asistencia' ? r.proyecto || '-' : '-',
            Entrada: r.tipo === 'asistencia' ? this.formatearHora(r.entrada) : '-',
            Salida: r.tipo === 'asistencia' ? this.formatearHora(r.salida) : '-',
            'Horas Trabajadas': r.tipo === 'asistencia' ? this.formatearDuracion(r.horasTrabajadas) : '-',
            Pausas: r.tipo === 'asistencia' ? this.formatearDuracion(r.totalPausas) : '-',
            Extras:
              r.tipo === 'asistencia'
                ? this.formatearDuracion(r.horasExtras)
                : this.formatearDuracion(r.duracionHoraExtra),
            'Horas Netas':
              r.tipo === 'asistencia'
                ? this.formatearDuracion(this.calcularHorasNetas(r.horasTrabajadas, r.totalPausas, r.horasExtras))
                : this.formatearDuracion(r.duracionHoraExtra),
            Motivo: r.motivo || '-',
          }));

          if (filas.length === 0) {
            this.snackBar.open('No hay registros para exportar', 'Cerrar', { duration: 3000 });
          } else {
            this.exportarExcelService.exportar(filas, 'registros_asistencia');
          }
          this.exportando = false;
        },
        error: () => {
          this.snackBar.open('Error al exportar', 'Cerrar', { duration: 3000 });
          this.exportando = false;
        },
      });
  }

  /**
   * Formatear duración
   */
  formatearDuracion(horas: number | null | undefined): string {
    // Validar que sea un número válido
    if (typeof horas !== 'number' || isNaN(horas) || horas === 0) return '0m';
    
    const h = Math.floor(horas);
    const m = Math.round((horas % 1) * 60);
    
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  }
}

/**
 * Dialog para ver fotos
 */
@Component({
  selector: 'app-fotos-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="fotos-dialog">
      <div class="descripcion-trabajo" *ngIf="data.descripcion">
        <span class="descripcion-label">Reporte de cierre</span>
        <p>{{ data.descripcion }}</p>
      </div>
      <div class="fotos-container">
        <div class="foto-wrapper" *ngFor="let foto of data.fotos">
          <img
            [src]="foto.url_foto"
            [alt]="foto.tipo"
            class="foto-preview"
            title="{{ foto.tipo }}"
          />
          <span class="badge" [ngClass]="'badge-' + foto.tipo.toLowerCase()">
            {{ foto.tipo.toLowerCase().startsWith('ext_') ? 'EXT. ' + foto.tipo.slice(4).toUpperCase() : foto.tipo.toUpperCase() }}
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fotos-dialog {
      padding: 20px;
    }
    
    .fotos-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    
    .foto-wrapper {
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      border: 2px solid #ddd;
    }

    .foto-preview {
      width: 100%;
      height: 250px;
      object-fit: cover;
      display: block;
      transition: transform 0.3s ease;
      cursor: zoom-in;
      
      &:hover {
        transform: scale(1.05);
      }
    }

    .badge {
      position: absolute;
      top: 8px;
      left: 8px;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    .badge-entrada {
      background: linear-gradient(135deg, #2B8A3E 0%, #1a5a2a 100%);
      color: white;
    }

    .badge-salida {
      background: linear-gradient(135deg, #F0A400 0%, #e08900 100%);
      color: white;
    }

    .badge-ext_entrada {
      background: linear-gradient(135deg, #1971C2 0%, #0f4a85 100%);
      color: white;
    }

    .badge-ext_salida {
      background: linear-gradient(135deg, #E8590C 0%, #b8460a 100%);
      color: white;
    }

    .badge-reporte_cierre {
      background: linear-gradient(135deg, #F0A400 0%, #b97e00 100%);
      color: white;
    }

    .descripcion-trabajo {
      margin-bottom: 16px;
      padding: 12px 14px;
      background: rgba(240, 164, 0, 0.08);
      border-left: 3px solid #F0A400;
      border-radius: 6px;

      .descripcion-label {
        display: block;
        font-size: 11px;
        font-weight: 700;
        color: #b97e00;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin-bottom: 6px;
      }

      p {
        margin: 0;
        font-size: 14px;
        color: #333;
        line-height: 1.5;
      }
    }
  `]
})
export class FotosDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}

/**
 * Dialog con el detalle día por día del cumplimiento de reportes de un empleado
 */
@Component({
  selector: 'app-detalle-cumplimiento-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.detalle.nombre }}</h2>
    <mat-dialog-content>
      <div class="leyenda">
        <span class="item"><span class="punto reportado"></span> Reportado</span>
        <span class="item"><span class="punto pendiente"></span> Pendiente</span>
        <span class="item"><span class="punto justificado"></span> Justificado</span>
      </div>
      <div class="dias-grid">
        <div class="dia-item" *ngFor="let dia of data.detalle.dias" [ngClass]="dia.estado">
          <span class="dia-numero">{{ dia.fecha.slice(8, 10) }}</span>
        </div>
      </div>
      <div class="sin-datos" *ngIf="data.detalle.dias.length === 0">Sin días en este rango</div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .leyenda {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      font-size: 12px;
      color: #666;

      .item { display: flex; align-items: center; gap: 6px; }

      .punto {
        width: 10px;
        height: 10px;
        border-radius: 50%;

        &.reportado { background: #2b8a3e; }
        &.pendiente { background: #f0a400; }
        &.justificado { background: #c3c2b7; }
      }
    }

    .dias-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 6px;
    }

    .dia-item {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 34px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      color: white;

      &.reportado { background: #2b8a3e; }
      &.pendiente { background: #f0a400; }
      &.justificado { background: #c3c2b7; color: #666; }
    }

    .sin-datos {
      text-align: center;
      padding: 20px;
      color: #999;
    }
  `],
})
export class DetalleCumplimientoDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { detalle: DetalleCumplimientoEmpleado; mes: string }) {}
}
