import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { FormsModule } from '@angular/forms';
import { ReportesService } from '../../services/reportes.service';
import { HoraExtraService, HoraExtraResponse } from '../../services/hora-extra.service';
import { DetalleHoraExtraDialogComponent } from './detalle-hora-extra-dialog/detalle-hora-extra-dialog.component';

@Component({
  selector: 'app-mis-horas',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatDialogModule,
    MatPaginatorModule,
    FormsModule,
  ],
  templateUrl: './mis-horas.component.html',
  styleUrl: './mis-horas.component.scss'
})
export class MisHorasComponent implements OnInit {
  registros: any[] = [];
  cargando = false;
  mesSeleccionado: string = '';
  fechaInicio: string = '';
  fechaFin: string = '';
  opcionesMes: { value: string; label: string }[] = [];
  paginaRegistros = 0;
  tamPaginaRegistros = 20;

  totalHoras = 0;
  totalExtras = 0;
  totalPausas = 0;
  hayExtrasPendientes = false;

  horasExtra: HoraExtraResponse[] = [];
  cargandoHorasExtra = false;
  paginaHorasExtra = 0;
  tamPaginaHorasExtra = 20;

  constructor(
    private reportesService: ReportesService,
    private horaExtraService: HoraExtraService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.opcionesMes = this.generarOpcionesMes();
    // Por defecto, mostrar el mes en curso
    const hoy = new Date();
    this.mesSeleccionado = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    this.aplicarMes();
    this.cargarHorasExtra();
  }

  cargarHorasExtra(): void {
    this.cargandoHorasExtra = true;
    this.horaExtraService.obtenerMisHorasExtras().subscribe({
      next: (response) => {
        this.horasExtra = response.data || [];
        this.paginaHorasExtra = 0;
        this.cargandoHorasExtra = false;
      },
      error: () => {
        this.horasExtra = [];
        this.cargandoHorasExtra = false;
      },
    });
  }

  estadoAprobacionLabel(horaExtra: HoraExtraResponse): string {
    switch (horaExtra.estado_aprobacion) {
      case 'aprobada':
        return horaExtra.horas_aprobadas === horaExtra.duracion ? 'Aprobada' : 'Aprobada parcial';
      case 'rechazada':
        return 'Rechazada';
      default:
        return horaExtra.estado === 'iniciada' ? 'En progreso' : 'Pendiente de revisión';
    }
  }

  verDetalleHoraExtra(horaExtra: HoraExtraResponse): void {
    this.dialog.open(DetalleHoraExtraDialogComponent, {
      width: '480px',
      maxWidth: '90vw',
      data: { horaExtra },
    });
  }

  /** Genera los últimos 12 meses + el actual, más recientes primero */
  private generarOpcionesMes(): { value: string; label: string }[] {
    const opciones: { value: string; label: string }[] = [];
    const hoy = new Date();

    for (let i = 0; i < 13; i++) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const value = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const label = fecha.toLocaleDateString('es-SV', { month: 'long', year: 'numeric' });
      opciones.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }

    return opciones;
  }

  /** Al elegir un mes, calcula automáticamente su rango de fechas inicio/fin */
  aplicarMes(): void {
    if (!this.mesSeleccionado) return;
    const [anio, mes] = this.mesSeleccionado.split('-').map(Number);
    const ultimoDia = new Date(anio, mes, 0).getDate();
    const mesStr = String(mes).padStart(2, '0');
    this.fechaInicio = `${anio}-${mesStr}-01`;
    this.fechaFin = `${anio}-${mesStr}-${String(ultimoDia).padStart(2, '0')}`;
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    // Se envían tal cual ('YYYY-MM-DD'): convertirlas a Date las interpretaría
    // como medianoche UTC y correría el día en zonas con offset negativo
    const inicio = this.fechaInicio || undefined;
    const fin = this.fechaFin || undefined;

    this.reportesService.obtenerMisAsistencias(1, 100, inicio, fin).subscribe({
      next: (response) => {
        this.registros = response.data || [];
        this.calcularTotales();
        this.paginaRegistros = 0;
        this.cargando = false;
      },
      error: () => {
        this.registros = [];
        this.cargando = false;
      },
    });
  }

  private calcularTotales(): void {
    this.totalHoras = this.registros.reduce((sum, r) => sum + (r.horasTrabajadas || 0), 0);
    this.totalExtras = this.registros.reduce((sum, r) => sum + (r.horasExtras || 0), 0);
    this.totalPausas = this.registros.reduce((sum, r) => sum + (r.totalPausas || 0), 0);
    this.hayExtrasPendientes = this.registros.some((r) => r.horasExtrasPendiente);
  }

  limpiar(): void {
    this.mesSeleccionado = '';
    this.fechaInicio = '';
    this.fechaFin = '';
    this.cargar();
  }

  get registrosPaginados(): any[] {
    const inicio = this.paginaRegistros * this.tamPaginaRegistros;
    return this.registros.slice(inicio, inicio + this.tamPaginaRegistros);
  }

  onPageRegistros(evento: PageEvent): void {
    this.paginaRegistros = evento.pageIndex;
    this.tamPaginaRegistros = evento.pageSize;
  }

  get horasExtraPaginadas(): HoraExtraResponse[] {
    const inicio = this.paginaHorasExtra * this.tamPaginaHorasExtra;
    return this.horasExtra.slice(inicio, inicio + this.tamPaginaHorasExtra);
  }

  onPageHorasExtra(evento: PageEvent): void {
    this.paginaHorasExtra = evento.pageIndex;
    this.tamPaginaHorasExtra = evento.pageSize;
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

  formatearDuracion(horas?: number | string | null): string {
    const valor = Number(horas);
    if (horas === null || horas === undefined || isNaN(valor) || valor === 0) return '0m';
    const h = Math.floor(valor);
    const m = Math.round((valor % 1) * 60);
    return h === 0 ? `${m}m` : `${h}h ${m}m`;
  }
}
