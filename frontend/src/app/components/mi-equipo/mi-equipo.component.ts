import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { GestionarSolicitudesComponent } from '../tramites/gestionar-solicitudes/gestionar-solicitudes.component';
import { HorasExtrasComponent } from '../horas-extras/horas-extras.component';
import { FotosDialogComponent } from '../reportes/reportes.component';
import { ReportesService, AsistenciaReporte } from '../../services/reportes.service';
import { EmpleadoService, Empleado } from '../../services/empleado.service';
import { ExportarExcelService } from '../../services/exportar-excel.service';

@Component({
  selector: 'app-mi-equipo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatPaginatorModule,
    MatDialogModule,
    MatSnackBarModule,
    MatMenuModule,
    MatDividerModule,
    GestionarSolicitudesComponent,
    HorasExtrasComponent,
  ],
  templateUrl: './mi-equipo.component.html',
  styleUrl: './mi-equipo.component.scss',
})
export class MiEquipoComponent implements OnInit {
  departamento = '';
  empleados: Empleado[] = [];
  cargandoEmpleados = false;
  paginaEmpleados = 0;
  tamPaginaEmpleados = 20;
  filtroNombreEmpleadoLista = '';

  asistencias: AsistenciaReporte[] = [];
  cargandoAsistencias = false;
  paginaAsistencias = 0;
  tamPaginaAsistencias = 20;
  fechaInicio = '';
  fechaFin = '';
  filtroNombreAsistencia = '';

  totalHoras = 0;
  totalExtras = 0;
  totalPausas = 0;

  constructor(
    private reportesService: ReportesService,
    private empleadoService: EmpleadoService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private exportarExcelService: ExportarExcelService,
  ) {}

  ngOnInit(): void {
    this.cargarEmpleados();

    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    this.fechaInicio = this.aFechaLocal(inicioMes);
    this.fechaFin = this.aFechaLocal(finMes);
    this.cargarAsistencias();
  }

  private aFechaLocal(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  cargarEmpleados(): void {
    this.cargandoEmpleados = true;
    this.empleadoService.obtenerTodos().subscribe({
      next: (response) => {
        this.empleados = Array.isArray(response.data) ? response.data : [response.data];
        this.departamento = this.empleados[0]?.departamento?.nombre || '';
        this.paginaEmpleados = 0;
        this.cargandoEmpleados = false;
      },
      error: () => {
        this.empleados = [];
        this.cargandoEmpleados = false;
      },
    });
  }

  cargarAsistencias(): void {
    this.cargandoAsistencias = true;
    this.reportesService
      .obtenerAsistencias(
        1,
        200,
        undefined,
        this.fechaInicio || undefined,
        this.fechaFin || undefined,
        undefined,
        this.filtroNombreAsistencia || undefined,
      )
      .subscribe({
        next: (response) => {
          this.asistencias = response.data || [];
          this.calcularTotales();
          this.paginaAsistencias = 0;
          this.cargandoAsistencias = false;
        },
        error: () => {
          this.asistencias = [];
          this.cargandoAsistencias = false;
        },
      });
  }

  private calcularTotales(): void {
    this.totalHoras = this.asistencias.reduce((sum, r) => sum + (r.horasTrabajadas || 0), 0);
    this.totalExtras = this.asistencias.reduce((sum, r) => sum + (r.horasExtras || 0), 0);
    this.totalPausas = this.asistencias.reduce((sum, r) => sum + (r.totalPausas || 0), 0);
  }

  formatearFecha(fecha?: string | Date | null): string {
    if (!fecha) return '--';
    const date = typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)
      ? new Date(`${fecha}T00:00:00`)
      : new Date(fecha);
    return date.toLocaleDateString('es-SV');
  }

  formatearHora(hora?: string | Date | null): string {
    if (!hora) return '--';
    return new Date(hora).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });
  }

  get asistenciasPaginadas(): AsistenciaReporte[] {
    const inicio = this.paginaAsistencias * this.tamPaginaAsistencias;
    return this.asistencias.slice(inicio, inicio + this.tamPaginaAsistencias);
  }

  onPageAsistencias(evento: PageEvent): void {
    this.paginaAsistencias = evento.pageIndex;
    this.tamPaginaAsistencias = evento.pageSize;
  }

  get empleadosFiltrados(): Empleado[] {
    const filtro = this.filtroNombreEmpleadoLista.trim().toLowerCase();
    if (!filtro) return this.empleados;
    return this.empleados.filter((e) => `${e.nombre} ${e.apellido}`.toLowerCase().includes(filtro));
  }

  get empleadosPaginados(): Empleado[] {
    const inicio = this.paginaEmpleados * this.tamPaginaEmpleados;
    return this.empleadosFiltrados.slice(inicio, inicio + this.tamPaginaEmpleados);
  }

  filtrarEmpleadosLista(): void {
    this.paginaEmpleados = 0;
  }

  onPageEmpleados(evento: PageEvent): void {
    this.paginaEmpleados = evento.pageIndex;
    this.tamPaginaEmpleados = evento.pageSize;
  }

  exportarAsistencias(): void {
    if (this.asistencias.length === 0) {
      this.snackBar.open('No hay registros para exportar', 'Cerrar', { duration: 3000 });
      return;
    }
    const filas = this.asistencias.map((r) => ({
      Empleado: r.empleado,
      Fecha: this.formatearFecha(r.fecha),
      Proyecto: r.proyecto || '-',
      Entrada: this.formatearHora(r.entrada),
      Salida: this.formatearHora(r.salida),
      Horas: this.formatearDuracion(r.horasTrabajadas),
      Pausas: this.formatearDuracion(r.totalPausas),
      Extras: this.formatearDuracion(r.horasExtras),
    }));
    this.exportarExcelService.exportar(filas, 'mi_equipo_asistencias');
  }

  exportarEmpleados(): void {
    if (this.empleadosFiltrados.length === 0) {
      this.snackBar.open('No hay empleados para exportar', 'Cerrar', { duration: 3000 });
      return;
    }
    const filas = this.empleadosFiltrados.map((e) => ({
      Nombre: `${e.nombre} ${e.apellido}`,
      Cargo: e.cargo || '-',
      Teléfono: e.telefono || '-',
      Email: e.usuario?.email || '-',
    }));
    this.exportarExcelService.exportar(filas, 'empleados_equipo');
  }

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

  /** true si la fila tiene al menos una ubicación de marcaje registrada (jornada o algún ticket) */
  tieneUbicacion(element: AsistenciaReporte): boolean {
    return !!(
      element.latitudEntrada ||
      element.latitudSalida ||
      element.ticketsUbicacion?.some((t) => t.latitudInicio || t.latitudFin)
    );
  }

  /** Abre la ubicación (lat/lng) en Google Maps en una pestaña nueva */
  abrirMapa(lat?: number | null, lng?: number | null): void {
    if (!lat || !lng) return;
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  }

  formatearDuracion(horas?: number | null): string {
    if (typeof horas !== 'number' || isNaN(horas) || horas === 0) return '0m';
    const h = Math.floor(horas);
    const m = Math.round((horas % 1) * 60);
    return h === 0 ? `${m}m` : `${h}h ${m}m`;
  }
}
