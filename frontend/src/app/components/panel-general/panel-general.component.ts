import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReportesService, CumplimientoDepartamento } from '../../services/reportes.service';
import { SolicitudService } from '../../services/solicitud.service';

// Departamento PLEX (ver listas hardcodeadas de departamentos en el resto de la app)
const DEPARTAMENTO_PLEX_ID = 2;

/**
 * Panel General: vista tipo dashboard/BI con varias tarjetas KPI y gráficas,
 * pensada para ir agregando aquí las métricas que pidan a futuro. Solo admin.
 * Los gráficos puntuales dentro de cada módulo (ej. "Aprobados por mes" en
 * Trámites) se quedan donde están; este panel los complementa, no los reemplaza.
 */
@Component({
  selector: 'app-panel-general',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './panel-general.component.html',
  styleUrl: './panel-general.component.scss',
})
export class PanelGeneralComponent implements OnInit {
  // KPI: Horas Extra Aprobadas - PLEX
  mesHorasPlex = new Date().toISOString().slice(0, 7);
  opcionesMes: { value: string; label: string }[] = [];
  horasAprobadasPlex: number | null = null;
  ticketsAprobadosPlex: number | null = null;
  cargandoHorasPlex = false;

  // KPI: Ausencias del mes (trámites tipo "ausencia"/Reposición ya aprobados)
  mesAusencias = new Date().toISOString().slice(0, 7);
  totalAusencias: number | null = null;
  cargandoAusencias = false;

  // Cumplimiento de reportes por departamento (círculos de %)
  mesCumplimiento = new Date().toISOString().slice(0, 7);
  cumplimientoDeptos: CumplimientoDepartamento[] = [];
  cargandoCumplimiento = false;

  constructor(
    private reportesService: ReportesService,
    private solicitudService: SolicitudService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.opcionesMes = this.generarOpcionesMes();
    this.cargarHorasAprobadasPlex();
    this.cargarAusencias();
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

  cargarHorasAprobadasPlex(): void {
    this.cargandoHorasPlex = true;
    this.reportesService.obtenerHorasAprobadas(this.mesHorasPlex, DEPARTAMENTO_PLEX_ID).subscribe({
      next: (response) => {
        const plex = response.data.departamentos.find((d) => d.departamentoId === DEPARTAMENTO_PLEX_ID);
        this.horasAprobadasPlex = plex?.totalHoras ?? 0;
        this.ticketsAprobadosPlex = plex?.tecnicos.reduce((sum, t) => sum + t.totalTickets, 0) ?? 0;
        this.cargandoHorasPlex = false;
      },
      error: () => {
        this.horasAprobadasPlex = null;
        this.ticketsAprobadosPlex = null;
        this.cargandoHorasPlex = false;
      },
    });
  }

  cargarAusencias(): void {
    this.cargandoAusencias = true;
    this.solicitudService.obtenerSolicitudesAprobadas(this.mesAusencias, 'ausencia').subscribe({
      next: (data) => {
        this.totalAusencias = data.length;
        this.cargandoAusencias = false;
      },
      error: () => {
        this.totalAusencias = null;
        this.cargandoAusencias = false;
      },
    });
  }

  cargarCumplimiento(): void {
    this.cargandoCumplimiento = true;
    this.reportesService.obtenerCumplimiento(this.mesCumplimiento).subscribe({
      next: (response) => {
        this.cumplimientoDeptos = response.data.departamentos;
        this.cargandoCumplimiento = false;
      },
      error: () => {
        this.cumplimientoDeptos = [];
        this.cargandoCumplimiento = false;
      },
    });
  }

  /** Color del círculo según qué tan bajo está el cumplimiento (mismo criterio que Reportes) */
  colorCumplimiento(porcentaje: number): string {
    if (porcentaje >= 80) return '#2b8a3e';
    if (porcentaje >= 50) return '#f0a400';
    return '#d32f2f';
  }

  /** Lleva a Reportes con el mismo mes, para revisar el detalle día por día */
  verCumplimiento(): void {
    this.router.navigate(['/reportes']);
  }

  /** Lleva a la pestaña "Aprobados" de Trámites, ya filtrada por este mismo mes y tipo */
  verAusencias(): void {
    this.router.navigate(['/tramites'], {
      queryParams: { tab: 'aprobados', mes: this.mesAusencias, tipo: 'ausencia' },
    });
  }

  volver(): void {
    this.router.navigate(['/dashboard']);
  }

  /** Mismo formato usado en Reportes: "2h 30m" en vez de un decimal crudo como "0.03h" */
  formatearDuracion(horas: number | null | undefined): string {
    if (typeof horas !== 'number' || isNaN(horas) || horas === 0) return '0m';

    const h = Math.floor(horas);
    const m = Math.round((horas % 1) * 60);

    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  }
}
