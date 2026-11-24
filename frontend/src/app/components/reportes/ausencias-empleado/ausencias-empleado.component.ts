import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TipoTramitePipe } from '../../../pipes/tipo-tramite.pipe';
import {
  FichaAusenciasService,
  EmpleadoFichaAusencias,
  FichaAusenciasEmpleado,
  DiaAusencia,
  TipoDiaAusencia,
  HistorialAusencia,
} from '../../../services/ficha-ausencias.service';

type Filtro = 'todos' | 'saldo_alto' | 'con_faltas';

interface CeldaCalendario {
  fecha: string | null;
  tipo: TipoDiaAusencia | null;
  esFuturo: boolean;
}

interface LabelMes {
  semanaIndex: number;
  label: string;
}

const NOMBRES_MES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];
const NOMBRES_MES_LARGO = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Component({
  selector: 'app-ausencias-empleado',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    TipoTramitePipe,
  ],
  templateUrl: './ausencias-empleado.component.html',
  styleUrl: './ausencias-empleado.component.scss',
})
export class AusenciasEmpleadoComponent implements OnInit {
  // Panel izquierdo
  buscar = '';
  filtro: Filtro = 'todos';
  empleados: EmpleadoFichaAusencias[] = [];
  cargandoLista = false;
  private debounceBuscar: any = null;

  // Panel derecho
  empleadoSeleccionadoId: number | null = null;
  ficha: FichaAusenciasEmpleado | null = null;
  cargandoFicha = false;
  anioSeleccionado = new Date().getFullYear();
  aniosDisponibles: number[] = [];

  // Calendario: vista "mes" (por defecto, el mes actual) o "año" (el mosaico completo)
  vistaCalendario: 'mes' | 'anio' = 'mes';
  mesSeleccionado = new Date().getMonth() + 1; // 1-12
  semanas: CeldaCalendario[][] = [];
  labelsMes: LabelMes[] = [];
  diaSeleccionado: { celda: CeldaCalendario; historial: HistorialAusencia | null } | null = null;

  constructor(private fichaAusenciasService: FichaAusenciasService) {}

  ngOnInit(): void {
    const hoy = new Date().getFullYear();
    this.aniosDisponibles = [hoy, hoy - 1, hoy - 2, hoy - 3];
    this.cargarLista();
  }

  // ==================== Panel izquierdo ====================

  onBuscarChange(): void {
    if (this.debounceBuscar) clearTimeout(this.debounceBuscar);
    this.debounceBuscar = setTimeout(() => this.cargarLista(), 350);
  }

  seleccionarFiltro(filtro: Filtro): void {
    this.filtro = filtro;
    this.cargarLista();
  }

  cargarLista(): void {
    this.cargandoLista = true;
    const filtroApi = this.filtro === 'todos' ? undefined : this.filtro;
    this.fichaAusenciasService.listarEmpleados(this.buscar || undefined, filtroApi).subscribe({
      next: (response) => {
        this.empleados = response.data;
        this.cargandoLista = false;
        // Si todavía no hay nadie seleccionado, abre el primero de la lista
        if (!this.empleadoSeleccionadoId && this.empleados.length > 0) {
          this.seleccionarEmpleado(this.empleados[0].empleadoId);
        }
      },
      error: () => {
        this.empleados = [];
        this.cargandoLista = false;
      },
    });
  }

  seleccionarEmpleado(empleadoId: number): void {
    this.empleadoSeleccionadoId = empleadoId;
    this.diaSeleccionado = null;
    this.cargarFicha();
  }

  // ==================== Panel derecho ====================

  cambiarAnio(anio: number): void {
    this.anioSeleccionado = anio;
    this.diaSeleccionado = null;
    this.cargarFicha();
  }

  cargarFicha(): void {
    if (!this.empleadoSeleccionadoId) return;
    this.cargandoFicha = true;
    this.fichaAusenciasService.obtenerFicha(this.empleadoSeleccionadoId, this.anioSeleccionado).subscribe({
      next: (response) => {
        this.ficha = response.data;
        this.construirCalendario(this.ficha.dias, this.anioSeleccionado);
        this.cargandoFicha = false;
      },
      error: () => {
        this.ficha = null;
        this.semanas = [];
        this.labelsMes = [];
        this.cargandoFicha = false;
      },
    });
  }

  /** Arma la cuadrícula de 53 semanas x 7 días (estilo GitHub), con el Map de días recibido */
  private construirCalendario(dias: DiaAusencia[], anio: number): void {
    const porFecha = new Map(dias.map((d) => [d.fecha, d.tipo]));
    const hoyStr = new Date().toISOString().slice(0, 10);

    const inicioAnio = new Date(anio, 0, 1);
    // Retrocede hasta el domingo anterior (o el mismo 1 de enero si ya es domingo)
    const inicioGrid = new Date(inicioAnio);
    inicioGrid.setDate(inicioGrid.getDate() - inicioGrid.getDay());

    const semanas: CeldaCalendario[][] = [];
    const labelsMes: LabelMes[] = [];
    let mesAnterior = -1;
    const cursor = new Date(inicioGrid);

    for (let semana = 0; semana < 53; semana++) {
      const columna: CeldaCalendario[] = [];
      let primeraFechaDelAnioEnSemana: Date | null = null;

      for (let dia = 0; dia < 7; dia++) {
        const perteneceAlAnio = cursor.getFullYear() === anio;
        const fecha = perteneceAlAnio
          ? `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
          : null;

        if (fecha && !primeraFechaDelAnioEnSemana) {
          primeraFechaDelAnioEnSemana = new Date(cursor);
        }

        columna.push({
          fecha,
          tipo: fecha ? (porFecha.get(fecha) as TipoDiaAusencia) || null : null,
          esFuturo: fecha ? fecha > hoyStr : false,
        });

        cursor.setDate(cursor.getDate() + 1);
      }

      if (primeraFechaDelAnioEnSemana) {
        const mes = primeraFechaDelAnioEnSemana.getMonth();
        if (mes !== mesAnterior) {
          labelsMes.push({ semanaIndex: semana, label: NOMBRES_MES[mes] });
          mesAnterior = mes;
        }
      }

      semanas.push(columna);
    }

    this.semanas = semanas;
    this.labelsMes = labelsMes;
  }

  labelMesDeSemana(semanaIndex: number): string {
    return this.labelsMes.find((l) => l.semanaIndex === semanaIndex)?.label || '';
  }

  /**
   * Calendario de mes normal (filas = semanas, columnas = Dom..Sáb), a todo
   * lo ancho — distinto del mosaico compacto de la vista año, que va por
   * columnas de semana para que quepan las 53 del año.
   */
  get filasMes(): CeldaCalendario[][] {
    if (!this.ficha) return [];

    const anio = this.anioSeleccionado;
    const mes = this.mesSeleccionado; // 1-12
    const porFecha = new Map(this.ficha.dias.map((d) => [d.fecha, d.tipo]));
    const hoyStr = new Date().toISOString().slice(0, 10);

    const inicioGrid = new Date(anio, mes - 1, 1);
    inicioGrid.setDate(inicioGrid.getDate() - inicioGrid.getDay()); // retrocede al domingo

    const finMes = new Date(anio, mes, 0);
    const finGrid = new Date(finMes);
    finGrid.setDate(finGrid.getDate() + (6 - finGrid.getDay())); // avanza al sábado

    const filas: CeldaCalendario[][] = [];
    const cursor = new Date(inicioGrid);

    while (cursor <= finGrid) {
      const fila: CeldaCalendario[] = [];
      for (let i = 0; i < 7; i++) {
        const perteneceAlMes = cursor.getMonth() === mes - 1;
        const fecha = perteneceAlMes
          ? `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
          : null;

        fila.push({
          fecha,
          tipo: fecha ? (porFecha.get(fecha) as TipoDiaAusencia) || null : null,
          esFuturo: fecha ? fecha > hoyStr : false,
        });

        cursor.setDate(cursor.getDate() + 1);
      }
      filas.push(fila);
    }

    return filas;
  }

  get nombreMesSeleccionado(): string {
    return NOMBRES_MES_LARGO[this.mesSeleccionado - 1];
  }

  cambiarVista(vista: 'mes' | 'anio'): void {
    this.vistaCalendario = vista;
    this.diaSeleccionado = null;
  }

  /** Mueve un mes hacia adelante/atrás; si cruza de año, recarga la ficha de ese año */
  cambiarMes(delta: number): void {
    this.diaSeleccionado = null;
    let nuevoMes = this.mesSeleccionado + delta;
    let nuevoAnio = this.anioSeleccionado;

    if (nuevoMes > 12) {
      nuevoMes = 1;
      nuevoAnio++;
    } else if (nuevoMes < 1) {
      nuevoMes = 12;
      nuevoAnio--;
    }

    this.mesSeleccionado = nuevoMes;
    if (nuevoAnio !== this.anioSeleccionado) {
      this.anioSeleccionado = nuevoAnio;
      this.cargarFicha();
    }
  }

  verDetalleDia(celda: CeldaCalendario): void {
    if (!celda.fecha || !celda.tipo || celda.tipo === 'presente' || !this.ficha) return;

    const historial = this.ficha.historial.find(
      (h) => celda.fecha! >= h.fechaInicio && celda.fecha! <= h.fechaFin,
    );
    this.diaSeleccionado = { celda, historial: historial || null };
  }

  cerrarDetalleDia(): void {
    this.diaSeleccionado = null;
  }

  colorPuntoHistorial(tipo: string): string {
    if (tipo === 'vacaciones') return 'vacaciones';
    if (tipo === 'permiso_personal') return 'permiso';
    if (tipo === 'ausencia') return 'reposicion';
    return 'otros';
  }

  iniciales(nombreCompleto: string): string {
    const partes = nombreCompleto.trim().split(/\s+/);
    const segunda = partes.length > 1 ? partes[1].charAt(0) : '';
    return `${partes[0]?.charAt(0) || ''}${segunda}`.toUpperCase();
  }

  formatFechaCorta(fecha: string): string {
    const [, mes, dia] = fecha.split('-');
    return `${dia}/${mes}`;
  }
}
