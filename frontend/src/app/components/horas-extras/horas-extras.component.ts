import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HoraExtraService, HoraExtraResponse } from '../../services/hora-extra.service';
import { ReportesService, TecnicoHorasAprobadas } from '../../services/reportes.service';
import { AuthService } from '../../services/auth.service';
import { ExportarExcelService } from '../../services/exportar-excel.service';
import { FinalizarHoraExtraModalComponent } from '../finalizar-hora-extra-modal/finalizar-hora-extra-modal.component';
import { RevisarHoraExtraDialogComponent } from './revisar-hora-extra-dialog/revisar-hora-extra-dialog.component';

@Component({
  selector: 'app-horas-extras',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatBadgeModule,
    MatDialogModule,
  ],
  templateUrl: './horas-extras.component.html',
  styleUrl: './horas-extras.component.scss',
})
export class HorasExtrasComponent implements OnInit, OnDestroy {
  cargando = false;
  tab = 'activas';
  
  horasExtrasActivas: HoraExtraResponse[] = [];
  horasExtrasFinalizadas: HoraExtraResponse[] = [];
  horaExtraActualDelUsuario: HoraExtraResponse | null = null; // Hora extra del usuario actual
  tiempoTranscurrido = '0:00:00'; // Cronómetro
  private intervalId: any = null; // Para limpiar el intervalo
  
  // Data sources para tablas
  dataSourceActivas = new MatTableDataSource<HoraExtraResponse>([]);
  dataSourceFinalizadas = new MatTableDataSource<HoraExtraResponse>([]);
  
  displayedColumns: string[] = ['ticket', 'empleado', 'horaInicio', 'horaFin', 'duracion', 'estado', 'fotos', 'acciones'];
  
  // Filtros
  filtroTicket = '';
  filtroEmpleado = '';
  filtroEmpleadoHE = '';
  filtroMesHE = '';
  
  // Paginación
  totalActivasRegistros = 0;
  totalFinalizadasRegistros = 0;
  pageSize = 20;
  currentPageActivas = 0;
  currentPageFinalizadas = 0;

  // Horas aprobadas por técnico
  tecnicosHorasAprobadas: TecnicoHorasAprobadas[] = [];
  tecnicosHorasAprobadasFiltrados: TecnicoHorasAprobadas[] = [];
  totalHorasAprobadas = 0;
  cargandoHorasAprobadas = false;
  mesHorasAprobadas = new Date().toISOString().slice(0, 7);
  opcionesMesHorasAprobadas: { value: string; label: string }[] = [];
  departamentosHorasAprobadas: string[] = [];
  filtroTecnico = '';
  filtroDepartamentoHorasAprobadas = '';

  constructor(
    private horaExtraService: HoraExtraService,
    private reportesService: ReportesService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private exportarExcelService: ExportarExcelService,
  ) {}

  ngOnInit(): void {
    this.cargarHorasExtras();
    this.cargarHoraExtraActual();
    this.opcionesMesHorasAprobadas = this.generarOpcionesMes();
    this.cargarHorasAprobadas();
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
   * Horas extra aprobadas (total o parcial) del mes, por técnico
   * (admin: todos los departamentos; líder: solo el suyo, vía este mismo componente en Mi Equipo)
   */
  cargarHorasAprobadas(): void {
    this.cargandoHorasAprobadas = true;
    this.reportesService.obtenerHorasAprobadas(this.mesHorasAprobadas).subscribe({
      next: (response) => {
        const departamentos = response.data.departamentos;
        this.tecnicosHorasAprobadas = departamentos
          .flatMap((d) => d.tecnicos)
          .sort((a, b) => b.totalHoras - a.totalHoras);
        this.departamentosHorasAprobadas = departamentos.map((d) => d.departamento).sort();
        this.filtroDepartamentoHorasAprobadas = '';
        this.filtroTecnico = '';
        this.aplicarFiltroHorasAprobadas();
        this.cargandoHorasAprobadas = false;
      },
      error: () => {
        this.tecnicosHorasAprobadas = [];
        this.departamentosHorasAprobadas = [];
        this.aplicarFiltroHorasAprobadas();
        this.cargandoHorasAprobadas = false;
      },
    });
  }

  aplicarFiltroHorasAprobadas(): void {
    const nombreFiltro = this.filtroTecnico.trim().toLowerCase();
    this.tecnicosHorasAprobadasFiltrados = this.tecnicosHorasAprobadas.filter((t) => {
      const coincideNombre = !nombreFiltro || t.nombre.toLowerCase().includes(nombreFiltro);
      const coincideDepto = !this.filtroDepartamentoHorasAprobadas || t.departamento === this.filtroDepartamentoHorasAprobadas;
      return coincideNombre && coincideDepto;
    });
    this.totalHorasAprobadas = this.tecnicosHorasAprobadasFiltrados.reduce((sum, t) => sum + t.totalHoras, 0);
  }

  limpiarFiltroHorasAprobadas(): void {
    this.filtroTecnico = '';
    this.filtroDepartamentoHorasAprobadas = '';
    this.aplicarFiltroHorasAprobadas();
  }

  get esAdmin(): boolean {
    return this.authService.esAdmin();
  }

  // Admin y líder gestionan (revisan/aprueban) horas extra; el líder solo ve
  // las de su propio departamento (ya filtrado por el backend).
  get puedeRevisar(): boolean {
    return this.authService.esAdmin() || this.authService.esLider();
  }

  ngOnDestroy(): void {
    // Limpiar intervalo al destruir componente
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  /**
   * Cargar horas extras (activas e finalizadas)
   */
  cargarHorasExtras(): void {
    this.cargando = true;
    
    // Obtener todas las horas extras activas y finalizadas del sistema
    // (Si deseas filtrar solo las del usuario, usa obtenerMiHoraExtraActiva)
    this.horaExtraService.obtenerTodasHorasExtras().subscribe({
      next: (response: any) => {
        if (response.data) {
          // Separar activas de finalizadas
          this.horasExtrasActivas = response.data.filter((h: any) => h.estado === 'iniciada') || [];
          this.horasExtrasFinalizadas = response.data.filter((h: any) => h.estado === 'finalizada') || [];
        }
        this.dataSourceActivas = new MatTableDataSource(this.horasExtrasActivas);
        this.dataSourceFinalizadas = new MatTableDataSource(this.horasExtrasFinalizadas);
        this.totalActivasRegistros = this.horasExtrasActivas.length || 0;
        this.totalFinalizadasRegistros = this.horasExtrasFinalizadas.length || 0;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar horas extras:', error);
        this.snackBar.open('Error al cargar horas extras', 'Cerrar', { duration: 3000 });
        this.cargando = false;
      },
    });
  }

  /**
   * Formatear duración (horas decimales)
   */
  formatearDuracion(duracion: number | null | undefined): string {
    if (!duracion || duracion === 0) return 'En progreso';
    const horas = Math.floor(duracion);
    const minutos = Math.round((duracion % 1) * 60);
    if (horas === 0) return `${minutos}m`;
    return `${horas}h ${minutos}m`;
  }

  /**
   * Formatear hora (timestamp ISO)
   */
  formatearHora(fecha: string | Date | null | undefined): string {
    if (!fecha) return '--:--';
    try {
      const date = new Date(fecha);
      return date.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  }

  /**
   * Formatear fecha (timestamp ISO)
   */
  formatearFecha(fecha: string | Date | null | undefined): string {
    if (!fecha) return '--/--/--';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-SV');
    } catch {
      return '--/--/--';
    }
  }

  /**
   * Obtener nombre del empleado
   */
  obtenerNombreEmpleado(horaExtra: HoraExtraResponse): string {
    // La API devuelve solo el ID, no los datos del empleado
    // Mostrar el ticket como identificador
    return `Empleado #${horaExtra.record_asistencia_id}`;
  }

  /**
   * Filtrar horas extras por ticket, nombre de empleado y/o mes
   */
  filtrarPorTicket(): void {
    const filtroTexto = this.filtroTicket.trim().toLowerCase();
    const filtroNombre = this.filtroEmpleadoHE.trim().toLowerCase();
    const filtroMes = this.filtroMesHE;

    if (!filtroTexto && !filtroNombre && !filtroMes) {
      this.dataSourceActivas = new MatTableDataSource(this.horasExtrasActivas);
      this.dataSourceFinalizadas = new MatTableDataSource(this.horasExtrasFinalizadas);
      return;
    }

    const coincide = (h: HoraExtraResponse) => {
      const coincideTicket = !filtroTexto || h.numero_ticket.toLowerCase().includes(filtroTexto);
      const coincideNombre = !filtroNombre || (h.empleado_nombre_completo || '').toLowerCase().includes(filtroNombre);
      const coincideMes = !filtroMes || (h.hora_inicio || '').slice(0, 7) === filtroMes;
      return coincideTicket && coincideNombre && coincideMes;
    };

    const activasFiltradas = this.horasExtrasActivas.filter(coincide);
    const finalizadasFiltradas = this.horasExtrasFinalizadas.filter(coincide);

    this.dataSourceActivas = new MatTableDataSource(activasFiltradas);
    this.dataSourceFinalizadas = new MatTableDataSource(finalizadasFiltradas);
  }

  /**
   * Limpiar filtros
   */
  limpiarFiltros(): void {
    this.filtroTicket = '';
    this.filtroEmpleado = '';
    this.filtroEmpleadoHE = '';
    this.filtroMesHE = '';
    this.cargarHorasExtras();
  }

  /**
   * Cambiar página
   */
  onPageChangeActivas(event: PageEvent): void {
    this.currentPageActivas = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  onPageChangeFinalizadas(event: PageEvent): void {
    this.currentPageFinalizadas = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  /**
   * Ver detalles de una hora extra
   */
  verDetalles(horaExtra: HoraExtraResponse): void {
    const mensaje = `Ticket: ${horaExtra.numero_ticket}\nDuración: ${this.formatearDuracion(horaExtra.duracion)}`;
    this.snackBar.open(mensaje, 'OK', { duration: 5000 });
  }

  /**
   * Cargar la hora extra activa del usuario actual
   */
  cargarHoraExtraActual(): void {
    this.horaExtraService.obtenerMiHoraExtraActiva().subscribe({
      next: (response: any) => {
        this.horaExtraActualDelUsuario = response.data || null;
        if (this.horaExtraActualDelUsuario) {
          // Iniciar cronómetro
          this.iniciarCronometro();
        } else {
          // Limpiar cronómetro
          if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
          }
        }
      },
      error: (error) => {
        // No hay hora extra activa, es normal
        this.horaExtraActualDelUsuario = null;
        console.log('No hay hora extra activa:', error);
      }
    });
  }

  /**
   * Iniciar cronómetro para la hora extra activa
   */
  private iniciarCronometro(): void {
    // Limpiar intervalo anterior si existe
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Actualizar cada segundo
    this.intervalId = setInterval(() => {
      if (this.horaExtraActualDelUsuario) {
        const inicio = new Date(this.horaExtraActualDelUsuario.hora_inicio);
        const ahora = new Date();
        const diferencia = Math.floor((ahora.getTime() - inicio.getTime()) / 1000);

        const horas = Math.floor(diferencia / 3600);
        const minutos = Math.floor((diferencia % 3600) / 60);
        const segundos = diferencia % 60;

        this.tiempoTranscurrido = 
          `${horas}:${this.padZero(minutos)}:${this.padZero(segundos)}`;
      }
    }, 1000);

    // Actualizar inmediatamente
    this.tiempoTranscurrido = '0:00:00';
  }

  /**
   * Rellenar con cero a la izquierda
   */
  private padZero(num: number): string {
    return num.toString().padStart(2, '0');
  }

  /**
   * Abrir modal para finalizar hora extra (con foto final)
   */
  finalizarHoraExtraModal(horaExtra: HoraExtraResponse): void {
    const dialogRef = this.dialog.open(FinalizarHoraExtraModalComponent, {
      width: '500px',
      maxWidth: '90vw',
      disableClose: false,
      data: { 
        horaExtraId: horaExtra.id
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Recargar horas extras
        this.cargarHorasExtras();
        this.cargarHoraExtraActual();
        this.snackBar.open('Hora extra finalizada correctamente', 'OK', { duration: 3000 });
      }
    });
  }

  /**
   * Abrir diálogo para aprobar/rechazar/ajustar las horas de un ticket finalizado
   */
  abrirRevisarDialog(horaExtra: HoraExtraResponse): void {
    const dialogRef = this.dialog.open(RevisarHoraExtraDialogComponent, {
      width: '480px',
      maxWidth: '90vw',
      data: { horaExtra },
    });

    dialogRef.afterClosed().subscribe((resultado) => {
      if (!resultado) return;

      this.horaExtraService.revisarHoraExtra(horaExtra.id, resultado.horasAprobadas, resultado.motivo).subscribe({
        next: () => {
          this.snackBar.open('Horas extra revisadas correctamente', 'OK', { duration: 3000 });
          this.cargarHorasExtras();
        },
        error: (error) => {
          const mensaje = error?.error?.message || 'Error al revisar las horas extra';
          this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
        },
      });
    });
  }

  exportarActivas(): void {
    if (this.dataSourceActivas.data.length === 0) {
      this.snackBar.open('No hay registros para exportar', 'Cerrar', { duration: 3000 });
      return;
    }
    const filas = this.dataSourceActivas.data.map((h) => ({
      'Ticket/NET': h.numero_ticket,
      Empleado: h.empleado_nombre_completo || 'N/A',
      Departamento: h.departamento_nombre || 'N/A',
      Fecha: this.formatearFecha(h.hora_inicio),
      'Hora Inicio': this.formatearHora(h.hora_inicio),
      Duración: this.formatearDuracion(h.duracion),
    }));
    this.exportarExcelService.exportar(filas, 'horas_extra_en_progreso');
  }

  exportarFinalizadas(): void {
    if (this.dataSourceFinalizadas.data.length === 0) {
      this.snackBar.open('No hay registros para exportar', 'Cerrar', { duration: 3000 });
      return;
    }
    const filas = this.dataSourceFinalizadas.data.map((h) => ({
      'Ticket/NET': h.numero_ticket,
      Empleado: h.empleado_nombre_completo || 'N/A',
      Departamento: h.departamento_nombre || 'N/A',
      Fecha: this.formatearFecha(h.hora_inicio),
      Inicio: this.formatearHora(h.hora_inicio),
      Fin: this.formatearHora(h.hora_fin),
      'Duración Total': this.formatearDuracion(h.duracion),
      Aprobación: this.estadoAprobacionLabel(h),
      'Horas Aprobadas': h.estado_aprobacion !== 'pendiente' ? this.formatearDuracion(h.horas_aprobadas) : '-',
    }));
    this.exportarExcelService.exportar(filas, 'horas_extra_completadas');
  }

  exportarHorasAprobadas(): void {
    if (this.tecnicosHorasAprobadasFiltrados.length === 0) {
      this.snackBar.open('No hay registros para exportar', 'Cerrar', { duration: 3000 });
      return;
    }
    const filas = this.tecnicosHorasAprobadasFiltrados.map((t) => ({
      Técnico: t.nombre,
      Departamento: t.departamento,
      'Tickets Aprobados': t.totalTickets,
      'Total Horas': this.formatearDuracion(t.totalHoras),
    }));
    this.exportarExcelService.exportar(filas, `horas_aprobadas_${this.mesHorasAprobadas}`);
  }

  estadoAprobacionLabel(horaExtra: HoraExtraResponse): string {
    switch (horaExtra.estado_aprobacion) {
      case 'aprobada':
        return horaExtra.horas_aprobadas === horaExtra.duracion ? 'Aprobada' : 'Aprobada parcial';
      case 'rechazada':
        return 'Rechazada';
      default:
        return 'Pendiente';
    }
  }

  /**
   * Ver fotos de una hora extra
   */
  verFotos(fotos?: any[]): void {
    if (!fotos || fotos.length === 0) {
      this.snackBar.open('No hay fotos disponibles', 'Cerrar', { duration: 3000 });
      return;
    }

    this.dialog.open(FotosHorasExtrasDialogComponent, {
      width: '600px',
      data: { fotos },
    });
  }
}

/**
 * Dialog para ver fotos de horas extras
 */
@Component({
  selector: 'app-fotos-horas-extras-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="fotos-dialog">
      <div class="fotos-container">
        <div class="foto-wrapper" *ngFor="let foto of data.fotos">
          <img 
            [src]="foto.url_foto" 
            [alt]="foto.tipo"
            class="foto-preview"
            title="{{ foto.tipo }}"
          />
          <span class="badge" [ngClass]="'badge-' + foto.tipo.toLowerCase()">
            {{ foto.tipo.toUpperCase() }}
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
  `]
})
export class FotosHorasExtrasDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}

