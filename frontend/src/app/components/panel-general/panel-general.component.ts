import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReportesService, ResumenReportes, AsistenciaReporte } from '../../services/reportes.service';
import { SolicitudService } from '../../services/solicitud.service';
import { EmpleadoService } from '../../services/empleado.service';
import { HoraExtraService } from '../../services/hora-extra.service';

interface AsistenciaDepto {
  departamento: string;
  presentes: number;
  total: number;
}

interface SemanaHoras {
  label: string;
  horas: number;
}

/**
 * Panel General: una sola pantalla con los KPIs del día a día — empleados,
 * presentes hoy, horas extra del mes, ausencias y lo pendiente de aprobar —
 * más dos vistazos rápidos: quién ha marcado hoy por departamento, y cómo se
 * repartieron las horas extra del mes por semana. Solo admin.
 */
@Component({
  selector: 'app-panel-general',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './panel-general.component.html',
  styleUrl: './panel-general.component.scss',
})
export class PanelGeneralComponent implements OnInit {
  periodo = new Date().toISOString().slice(0, 7);
  opcionesPeriodo: { value: string; label: string }[] = [];

  resumen: ResumenReportes | null = null;
  cargandoResumen = false;

  totalAusenciasMes: number | null = null;
  horasExtraPendientes = 0;
  tramitesPendientes = 0;
  cargandoPorAprobar = false;

  asistenciaPorDepto: AsistenciaDepto[] = [];
  cargandoAsistenciaDepto = false;

  semanasHoras: SemanaHoras[] = [];
  cargandoHorasSemana = false;

  constructor(
    private reportesService: ReportesService,
    private solicitudService: SolicitudService,
    private empleadoService: EmpleadoService,
    private horaExtraService: HoraExtraService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.opcionesPeriodo = this.generarOpcionesMes();
    this.cargarTodo();
  }

  /** Recarga todo lo que depende del período seleccionado */
  cargarTodo(): void {
    this.cargarResumen();
    this.cargarAusenciasDelMes();
    this.cargarPorAprobar();
    this.cargarAsistenciaPorDepartamento();
    this.cargarHorasPorSemana();
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

  private aFechaLocal(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  cargarResumen(): void {
    this.cargandoResumen = true;
    this.reportesService.obtenerResumen().subscribe({
      next: (response) => {
        this.resumen = response.data;
        this.cargandoResumen = false;
      },
      error: () => {
        this.resumen = null;
        this.cargandoResumen = false;
      },
    });
  }

  /** Trámites aprobados (todos los tipos) del período seleccionado — mismo criterio que la tarjeta del Home */
  cargarAusenciasDelMes(): void {
    this.solicitudService.obtenerSolicitudesAprobadas(this.periodo).subscribe({
      next: (data) => {
        this.totalAusenciasMes = data.length;
      },
      error: () => {
        this.totalAusenciasMes = null;
      },
    });
  }

  cargarPorAprobar(): void {
    this.cargandoPorAprobar = true;
    this.horaExtraService.obtenerTodasHorasExtras().subscribe({
      next: (response: any) => {
        const tickets = response.data || [];
        this.horasExtraPendientes = tickets.filter(
          (h: any) => h.estado === 'finalizada' && h.estado_aprobacion === 'pendiente',
        ).length;
        this.cargandoPorAprobar = false;
      },
      error: () => {
        this.horasExtraPendientes = 0;
        this.cargandoPorAprobar = false;
      },
    });

    this.solicitudService.obtenerSolicitudesPendientes().subscribe({
      next: (solicitudes) => {
        this.tramitesPendientes = solicitudes.length;
      },
      error: () => {
        this.tramitesPendientes = 0;
      },
    });
  }

  get totalPorAprobar(): number {
    return this.horasExtraPendientes + this.tramitesPendientes;
  }

  /** Quién ha marcado entrada hoy, agrupado por departamento (excluye líderes e inactivos) */
  cargarAsistenciaPorDepartamento(): void {
    this.cargandoAsistenciaDepto = true;
    this.empleadoService.obtenerTodos().subscribe({
      next: (response) => {
        const todos = Array.isArray(response.data) ? response.data : [response.data];
        const empleados = todos.filter((e: any) => e.estado !== 'inactivo' && e.usuario?.rol !== 'lider');

        if (empleados.length === 0) {
          this.asistenciaPorDepto = [];
          this.cargandoAsistenciaDepto = false;
          return;
        }

        const hoy = this.aFechaLocal(new Date());
        this.reportesService.obtenerAsistencias(1, 1000, undefined, hoy, hoy).subscribe({
          next: (resp) => {
            const registros: AsistenciaReporte[] = resp.data || [];
            const nombresConEntrada = new Set(
              registros.filter((r) => r.tipo === 'asistencia' && r.entrada).map((r) => r.empleado),
            );

            const porDepto = new Map<string, AsistenciaDepto>();
            for (const e of empleados) {
              const nombreDepto = e.departamento?.nombre || 'Sin departamento';
              const nombreCompleto = `${e.nombre} ${e.apellido}`;
              const grupo = porDepto.get(nombreDepto) || { departamento: nombreDepto, presentes: 0, total: 0 };
              grupo.total++;
              if (nombresConEntrada.has(nombreCompleto)) grupo.presentes++;
              porDepto.set(nombreDepto, grupo);
            }

            this.asistenciaPorDepto = Array.from(porDepto.values()).sort((a, b) => b.total - a.total);
            this.cargandoAsistenciaDepto = false;
          },
          error: () => {
            this.asistenciaPorDepto = [];
            this.cargandoAsistenciaDepto = false;
          },
        });
      },
      error: () => {
        this.asistenciaPorDepto = [];
        this.cargandoAsistenciaDepto = false;
      },
    });
  }

  /**
   * Horas extra aprobadas del período seleccionado, repartidas por semana
   * (lunes a domingo, recortada a los límites del mes y al día de hoy si el
   * mes está en curso). La suma de las barras coincide con la tarjeta
   * "Horas extra" de arriba, porque usa el mismo criterio: horas_aprobadas
   * de tickets con estado_aprobacion 'aprobada'.
   */
  cargarHorasPorSemana(): void {
    this.cargandoHorasSemana = true;
    this.horaExtraService.obtenerTodasHorasExtras().subscribe({
      next: (response: any) => {
        const tickets = response.data || [];
        const [anio, mes] = this.periodo.split('-').map(Number);
        const semanas = this.construirSemanasDelMes(anio, mes);

        for (const semana of semanas) {
          const enRango = tickets.filter((t: any) => {
            if (t.estado_aprobacion !== 'aprobada' || !t.hora_inicio) return false;
            const fecha = new Date(t.hora_inicio);
            return fecha >= semana.inicio && fecha <= semana.finDia;
          });
          semana.horas = enRango.reduce((sum: number, t: any) => sum + (parseFloat(t.horas_aprobadas) || 0), 0);
        }

        this.semanasHoras = semanas.map((s) => ({ label: s.label, horas: s.horas }));
        this.cargandoHorasSemana = false;
      },
      error: () => {
        this.semanasHoras = [];
        this.cargandoHorasSemana = false;
      },
    });
  }

  private construirSemanasDelMes(
    anio: number,
    mes: number,
  ): { inicio: Date; finDia: Date; label: string; horas: number }[] {
    const primerDia = new Date(anio, mes - 1, 1);
    const ultimoDiaMes = new Date(anio, mes, 0);
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    const limiteFin = anio === hoy.getFullYear() && mes - 1 === hoy.getMonth() && ultimoDiaMes > hoy ? hoy : ultimoDiaMes;

    const mesCorto = primerDia.toLocaleDateString('es-SV', { month: 'short' }).replace('.', '');
    const semanas: { inicio: Date; finDia: Date; label: string; horas: number }[] = [];

    let cursor = new Date(primerDia);
    while (cursor <= limiteFin) {
      const diaSemana = cursor.getDay(); // 0 = domingo .. 6 = sábado
      const diasHastaDomingo = diaSemana === 0 ? 0 : 7 - diaSemana;
      let finSemana = new Date(cursor);
      finSemana.setDate(cursor.getDate() + diasHastaDomingo);
      if (finSemana > limiteFin) finSemana = new Date(limiteFin);

      const finDia = new Date(finSemana);
      finDia.setHours(23, 59, 59, 999);

      const label =
        cursor.getDate() === finSemana.getDate()
          ? `${cursor.getDate()} ${mesCorto}`
          : `${cursor.getDate()}-${finSemana.getDate()} ${mesCorto}`;

      semanas.push({ inicio: new Date(cursor), finDia, label, horas: 0 });

      cursor = new Date(finSemana);
      cursor.setDate(cursor.getDate() + 1);
    }

    return semanas;
  }

  get labelPeriodo(): string {
    return this.opcionesPeriodo.find((o) => o.value === this.periodo)?.label || '';
  }

  get maxHorasSemana(): number {
    return Math.max(1, ...this.semanasHoras.map((s) => s.horas));
  }

  /** Lleva a la pestaña "Aprobados" de Trámites del mismo período */
  verAusencias(): void {
    this.router.navigate(['/tramites'], { queryParams: { tab: 'aprobados', mes: this.periodo } });
  }

  /** Lleva a revisar lo pendiente: horas extra si hay, si no trámites */
  verPorAprobar(): void {
    this.router.navigate([this.horasExtraPendientes > 0 ? '/horas-extras' : '/tramites']);
  }

  /** Mismo formato usado en Reportes/Home: "2h 30m" en vez de un decimal crudo */
  formatearDuracion(horas: number | null | undefined): string {
    if (typeof horas !== 'number' || isNaN(horas) || horas === 0) return '0h';

    const h = Math.floor(horas);
    const m = Math.round((horas % 1) * 60);

    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }
}
