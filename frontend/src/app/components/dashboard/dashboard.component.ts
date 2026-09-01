import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService, Usuario } from '../../services/auth.service';
import { ReportesService, ResumenReportes, DepartamentoStats, AsistenciaReporte } from '../../services/reportes.service';
import { CalendarioService, EventoProximo } from '../../services/calendario.service';
import { EmpleadoService } from '../../services/empleado.service';
import { HoraExtraService } from '../../services/hora-extra.service';
import { SolicitudService } from '../../services/solicitud.service';
import { MiPerfilComponent } from '../mi-perfil/mi-perfil.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
 })
 export class DashboardComponent implements OnInit {
  currentUser: Usuario | null = null;
  resumen: ResumenReportes | null = null;
  totalDepartamentos = 0;
  proximosEventos: EventoProximo[] = [];
  gruposEventos: { label: string; eventos: (EventoProximo & { diasExtra?: string[] })[] }[] = [];
  cargandoEventos = true;

  cargandoResumenEquipo = false;
  empleadosIniciadosHoy: string[] = [];
  empleadosPendientesHoy: string[] = [];
  totalEmpleadosEquipo = 0;

  horasExtraPendientes = 0;
  tramitesPendientes = 0;

  constructor(
    private authService: AuthService,
    private reportesService: ReportesService,
    private calendarioService: CalendarioService,
    private empleadoService: EmpleadoService,
    private horaExtraService: HoraExtraService,
    private solicitudService: SolicitudService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((usuario) => {
      this.currentUser = usuario;
    });
    if (this.esAdmin) {
      this.cargarResumen();
      this.cargarDepartamentos();
      this.cargarProximosEventos();
    }
    if (this.esAdmin || this.esLider) {
      // Admin ve todo; líder solo lo de su departamento (scoped por el backend)
      this.cargarHorasExtraPendientes();
      this.cargarTramitesPendientes();
    }
    if (this.esLider) {
      this.cargarResumenEquipoHoy();
    }
  }

  cargarHorasExtraPendientes(): void {
    this.horaExtraService.obtenerTodasHorasExtras().subscribe({
      next: (response: any) => {
        const tickets = response.data || [];
        this.horasExtraPendientes = tickets.filter(
          (h: any) => h.estado === 'finalizada' && h.estado_aprobacion === 'pendiente',
        ).length;
      },
      error: () => {
        this.horasExtraPendientes = 0;
      },
    });
  }

  cargarTramitesPendientes(): void {
    this.solicitudService.obtenerSolicitudesPendientes().subscribe({
      next: (solicitudes) => {
        this.tramitesPendientes = solicitudes.length;
      },
      error: () => {
        this.tramitesPendientes = 0;
      },
    });
  }

  get esAdmin(): boolean {
    return this.authService.esAdmin();
  }

  get esLider(): boolean {
    return this.authService.esLider();
  }

  cargarResumen(): void {
    this.reportesService.obtenerResumen().subscribe({
      next: (response) => {
        this.resumen = response.data;
      },
      error: (error) => {
        console.error('Error al cargar resumen:', error);
      },
    });
  }

  cargarDepartamentos(): void {
    this.reportesService.obtenerPorDepartamento().subscribe({
      next: (response) => {
        this.totalDepartamentos = response.data?.length || 0;
      },
      error: (error) => {
        console.error('Error al cargar departamentos:', error);
      },
    });
  }

  cargarResumenEquipoHoy(): void {
    this.cargandoResumenEquipo = true;
    this.empleadoService.obtenerTodos().subscribe({
      next: (response) => {
        const todosEmpleados = Array.isArray(response.data) ? response.data : [response.data];
        // El líder solo supervisa; no debe contarse a sí mismo en el conteo de asistencia de su equipo.
        const empleados = todosEmpleados.filter((e: any) => e.usuario_id !== this.currentUser?.id);
        const nombresEmpleados = empleados.map((e: any) => `${e.nombre} ${e.apellido}`);
        this.totalEmpleadosEquipo = nombresEmpleados.length;

        if (nombresEmpleados.length === 0) {
          this.empleadosIniciadosHoy = [];
          this.empleadosPendientesHoy = [];
          this.cargandoResumenEquipo = false;
          return;
        }

        const hoy = this.aFechaLocal(new Date());
        this.reportesService.obtenerAsistencias(1, 500, undefined, hoy, hoy).subscribe({
          next: (resp) => {
            const registros: AsistenciaReporte[] = resp.data || [];
            const nombresConEntrada = new Set(
              registros.filter((r) => r.tipo === 'asistencia' && r.entrada).map((r) => r.empleado),
            );
            this.empleadosIniciadosHoy = nombresEmpleados.filter((n) => nombresConEntrada.has(n));
            this.empleadosPendientesHoy = nombresEmpleados.filter((n) => !nombresConEntrada.has(n));
            this.cargandoResumenEquipo = false;
          },
          error: () => {
            this.empleadosIniciadosHoy = [];
            this.empleadosPendientesHoy = [];
            this.cargandoResumenEquipo = false;
          },
        });
      },
      error: () => {
        this.empleadosIniciadosHoy = [];
        this.empleadosPendientesHoy = [];
        this.totalEmpleadosEquipo = 0;
        this.cargandoResumenEquipo = false;
      },
    });
  }

  private aFechaLocal(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  cargarProximosEventos(): void {
    this.cargandoEventos = true;
    this.calendarioService.obtenerProximosEventos(60).subscribe({
      next: (response) => {
        const eventos = (response.data || []).filter((e) => !!e.titulo && !!e.fecha && !!e.tipo);
        this.proximosEventos = this.filtrarMesActual(eventos);
        this.gruposEventos = this.agruparPorMes(this.proximosEventos);
        this.cargandoEventos = false;
      },
      error: (error) => {
        console.error('Error al cargar próximos eventos:', error);
        this.proximosEventos = [];
        this.gruposEventos = [];
        this.cargandoEventos = false;
      },
    });
  }

  /** Solo eventos del mes en curso, para no saturar el panel con meses futuros */
  private filtrarMesActual(eventos: EventoProximo[]): EventoProximo[] {
    const hoy = new Date();
    const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    return eventos.filter((e) => e.fecha.slice(0, 7) === mesActual);
  }

  private agruparPorMes(eventos: EventoProximo[]): { label: string; eventos: (EventoProximo & { diasExtra?: string[] })[] }[] {
    const grupos: { label: string; eventos: (EventoProximo & { diasExtra?: string[] })[] }[] = [];

    for (const evento of eventos) {
      // Parsear como fecha UTC (sin hora) para no desplazar el día por zona horaria
      const fecha = new Date(`${evento.fecha.slice(0, 10)}T00:00:00Z`);
      const label = fecha.toLocaleDateString('es-SV', { month: 'long', year: 'numeric', timeZone: 'UTC' });

      let grupo = grupos.find((g) => g.label === label);
      if (!grupo) {
        grupo = { label, eventos: [] };
        grupos.push(grupo);
      }

      // Si es el día siguiente consecutivo del mismo evento (mismo tipo y título), lo agrupamos
      // como chip adicional en vez de repetir toda la fila
      const anterior = grupo.eventos[grupo.eventos.length - 1];
      const ultimaFecha = anterior?.diasExtra?.length ? anterior.diasExtra[anterior.diasExtra.length - 1] : anterior?.fecha;
      if (anterior && ultimaFecha && anterior.tipo === evento.tipo && anterior.titulo === evento.titulo && this.esDiaSiguiente(ultimaFecha, evento.fecha)) {
        anterior.diasExtra = [...(anterior.diasExtra || []), evento.fecha];
      } else {
        grupo.eventos.push({ ...evento });
      }
    }

    return grupos;
  }

  private esDiaSiguiente(fechaBase: string, fechaSiguiente: string): boolean {
    const base = new Date(`${fechaBase.slice(0, 10)}T00:00:00Z`);
    base.setUTCDate(base.getUTCDate() + 1);
    return base.toISOString().slice(0, 10) === fechaSiguiente.slice(0, 10);
  }

  diaDelEvento(fecha: string): number {
    return parseInt(fecha.slice(8, 10), 10);
  }

  iconoEvento(tipo: string): string {
    switch (tipo) {
      case 'festivo': return 'celebration';
      case 'no_laborable': return 'event_busy';
      case 'vacaciones': return 'beach_access';
      case 'ausencia': return 'medical_services';
      default: return 'event';
    }
  }

  etiquetaEvento(tipo: string): string {
    switch (tipo) {
      case 'festivo': return 'Festivo';
      case 'no_laborable': return 'No laborable';
      case 'vacaciones': return 'Vacaciones';
      case 'ausencia': return 'Ausencia';
      case 'cambio_jornada': return 'Cambio jornada';
      case 'cita_medica_programada': return 'Cita médica programada';
      case 'cita_medica_emergencia': return 'Cita médica de emergencia';
      default: return tipo;
    }
  }

  abrirMiPerfil(): void {
    this.dialog.open(MiPerfilComponent, { width: '420px' });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  irA(ruta: string): void {
    this.router.navigate([`/${ruta}`]);
  }

  getAvatarUrl(fotoUrl?: string): string {
    if (!fotoUrl) return '';
    
    // Si es una ruta relativa, construir URL completa
    if (fotoUrl.startsWith('/')) {
      return `${environment.apiUrl.replace('/api', '')}${fotoUrl}`;
    }
    return fotoUrl;
  }

  /**
   * Formatear duración en horas/minutos
   */
  formatearDuracion(horas: number | null | undefined): string {
    if (typeof horas !== 'number' || isNaN(horas) || horas === 0) return '0m';
    
    const h = Math.floor(horas);
    const m = Math.round((horas % 1) * 60);
    
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  }
}
