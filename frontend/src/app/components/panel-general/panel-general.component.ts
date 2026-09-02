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
import { ReportesService } from '../../services/reportes.service';

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

  constructor(
    private reportesService: ReportesService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.opcionesMes = this.generarOpcionesMes();
    this.cargarHorasAprobadasPlex();
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

  volver(): void {
    this.router.navigate(['/dashboard']);
  }
}
