import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService, Usuario } from '../../services/auth.service';
import { ReportesService, ResumenReportes, AsistenciaReporte } from '../../services/reportes.service';
import { CalendarioService, EventoProximo } from '../../services/calendario.service';
import { EmpleadoService } from '../../services/empleado.service';
import { HoraExtraService } from '../../services/hora-extra.service';
import { SolicitudService } from '../../services/solicitud.service';
import { AusenciasDepartamentoDialogComponent } from './ausencias-departamento-dialog/ausencias-departamento-dialog.component';
import { PresenteHoyDialogComponent } from './presente-hoy-dialog/presente-hoy-dialog.component';

interface DiaSemana {
  fecha: string;
  numero: number;
  diaLabel: string;
  esHoy: boolean;
  feriado?: string;
}

interface BarraSemana {
  titulo: string;
  colIni: number;
  colFin: number;
  rango: string;
}

const NOMBRES_DIA = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatDialogModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  currentUser: Usuario | null = null;
  resumen: ResumenReportes | null = null;
  totalDepartamentos = 0;

  horasExtraPendientes = 0;
  tramitesPendientes = 0;
  totalAusenciasMes = 0;

  cargandoResumenEquipo = false;
  empleadosIniciadosHoy: string[] = [];
  empleadosPendientesHoy: string[] = [];
  totalEmpleadosEquipo = 0;

  semana: DiaSemana[] = [];
  barrasSemana: BarraSemana[] = [];
  cargandoSemana = true;

  constructor(
    private authService: AuthService,
    private reportesService: ReportesService,
    private calendarioService: CalendarioService,
    private empleadoService: EmpleadoService,
    private horaExtraService: HoraExtraService,
    private solicitudService: SolicitudService,
    private dialog: MatDialog,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((usuario) => {
      this.currentUser = usuario;
    });

    if (this.esAdmin) {
      this.cargarResumen();
      this.cargarDepartamentos();
      this.cargarAusenciasDelMes();
      this.cargarEstaSemana();
    }
    if (this.esAdmin || this.esLider) {
      this.cargarHorasExtraPendientes();
      this.cargarTramitesPendientes();
    }
    if (this.esLider) {
      this.cargarResumenEquipoHoy();
    }
  }

  get esAdmin(): boolean {
    return this.authService.esAdmin();
  }

  get esLider(): boolean {
    return this.authService.esLider();
  }

  get fechaHoyLabel(): string {
    const hoy = new Date();
    const texto = hoy.toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    // "lunes, 19 de octubre de 2026" (o sin coma) -> "LUNES 19 · OCTUBRE 2026"
    const partes = texto.match(/^(\p{L}+),?\s*(\d+) de (\p{L}+) de (\d+)$/u);
    if (!partes) return texto.toUpperCase();
    const [, nombreDia, dia, mes, anio] = partes;
    return `${nombreDia.toUpperCase()} ${dia} · ${mes.toUpperCase()} ${anio}`;
  }

  get primerNombre(): string {
    return this.currentUser?.email.split('@')[0] || '';
  }

  get empleadosSinMarcar(): number {
    if (!this.resumen) return 0;
    return Math.max(0, (this.resumen.totalEmpleados || 0) - (this.resumen.presenteHoy || 0));
  }

  get hayPendientes(): boolean {
    return this.horasExtraPendientes > 0 || this.tramitesPendientes > 0;
  }

  /** El líder revisa horas extra desde "Mi Equipo", no desde este panel, así que aquí solo cuentan los trámites */
  get hayPendientesLider(): boolean {
    return this.tramitesPendientes > 0;
  }

  revisarTodo(): void {
    this.irA(this.horasExtraPendientes > 0 ? 'horas-extras' : 'tramites');
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

  /** Total de trámites aprobados (todos los tipos) del mes actual, para la tarjeta del Home */
  cargarAusenciasDelMes(): void {
    const mesActual = new Date().toISOString().slice(0, 7);
    this.solicitudService.obtenerSolicitudesAprobadas(mesActual).subscribe({
      next: (data) => {
        this.totalAusenciasMes = data.length;
      },
      error: () => {
        this.totalAusenciasMes = 0;
      },
    });
  }

  abrirAusenciasPorDepartamento(): void {
    this.dialog.open(AusenciasDepartamentoDialogComponent, { width: '480px' });
  }

  abrirPresenteHoy(): void {
    this.dialog.open(PresenteHoyDialogComponent, { width: '420px' });
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

  /**
   * Trae los eventos (festivos y trámites aprobados) de los próximos ~15 días,
   * suficiente para cubrir cualquier día restante de la semana en curso, y arma
   * la franja "Esta semana": festivos marcados por día y trámites de varios días
   * (vacaciones, reposición, etc.) como una barra continua.
   */
  cargarEstaSemana(): void {
    this.cargandoSemana = true;
    this.calendarioService.obtenerProximosEventos(60).subscribe({
      next: (response) => {
        const eventos = (response.data || []).filter((e) => !!e.titulo && !!e.fecha && !!e.tipo);
        this.construirSemana(eventos);
        this.cargandoSemana = false;
      },
      error: () => {
        this.construirSemana([]);
        this.cargandoSemana = false;
      },
    });
  }

  private construirSemana(eventos: EventoProximo[]): void {
    const hoy = new Date();
    const diaSemanaHoy = hoy.getDay(); // 0 = domingo .. 6 = sábado
    const offsetLunes = diaSemanaHoy === 0 ? -6 : 1 - diaSemanaHoy;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() + offsetLunes);
    lunes.setHours(0, 0, 0, 0);

    const hoyStr = this.aFechaLocal(hoy);
    const dias: DiaSemana[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      const fecha = this.aFechaLocal(d);
      dias.push({ fecha, numero: d.getDate(), diaLabel: NOMBRES_DIA[i], esHoy: fecha === hoyStr });
    }

    // Festivos / días no laborables de esta semana, como chip bajo el día
    for (const evento of eventos) {
      if (evento.tipo !== 'festivo' && evento.tipo !== 'no_laborable') continue;
      const fecha = evento.fecha.slice(0, 10);
      const dia = dias.find((d) => d.fecha === fecha);
      if (dia) dia.feriado = evento.titulo;
    }

    // Trámites de varios días dentro de esta semana, agrupados por título en una barra continua
    const fechasPorTitulo = new Map<string, string[]>();
    for (const evento of eventos) {
      if (evento.tipo === 'festivo' || evento.tipo === 'no_laborable') continue;
      const fecha = evento.fecha.slice(0, 10);
      if (!dias.some((d) => d.fecha === fecha)) continue;
      const lista = fechasPorTitulo.get(evento.titulo) || [];
      lista.push(fecha);
      fechasPorTitulo.set(evento.titulo, lista);
    }

    const barras: BarraSemana[] = [];
    for (const [titulo, fechas] of fechasPorTitulo) {
      fechas.sort();
      const colIni = dias.findIndex((d) => d.fecha === fechas[0]);
      const colFin = dias.findIndex((d) => d.fecha === fechas[fechas.length - 1]);
      if (colIni === -1 || colFin === -1) continue;
      barras.push({
        titulo: titulo.replace(' - ', ' · '),
        colIni,
        colFin,
        rango: this.formatearRangoDias(fechas[0], fechas[fechas.length - 1]),
      });
    }

    this.semana = dias;
    this.barrasSemana = barras.sort((a, b) => a.colIni - b.colIni);
  }

  private formatearRangoDias(inicio: string, fin: string): string {
    const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', timeZone: 'UTC' };
    const fInicio = new Date(`${inicio}T00:00:00Z`);
    const fFin = new Date(`${fin}T00:00:00Z`);
    if (inicio === fin) return fInicio.toLocaleDateString('es-SV', opciones);
    const diaInicio = fInicio.getUTCDate();
    const textoFin = fFin.toLocaleDateString('es-SV', opciones);
    return `${diaInicio}-${textoFin}`;
  }

  irA(ruta: string): void {
    this.router.navigate([`/${ruta}`]);
  }

  /** Genera un arreglo de `n` elementos para dibujar la matriz de puntos de "Presentes ahora" */
  rangoDots(n: number | undefined): number[] {
    return Array.from({ length: Math.max(0, n || 0) });
  }

  /** Formatear duración en horas/minutos */
  formatearDuracion(horas: number | null | undefined): string {
    if (typeof horas !== 'number' || isNaN(horas) || horas === 0) return '0h';

    const h = Math.floor(horas);
    const m = Math.round((horas % 1) * 60);

    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }
}
