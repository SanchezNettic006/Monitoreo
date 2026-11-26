import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DescansoService, EmpleadoEquipo, DescansoEmpleado } from '../../../services/descanso.service';

interface DiaCelda {
  numero: number;
  fecha: string;
  diaSemana: number; // 0 = Lunes .. 6 = Domingo
}

interface CeldaAnio {
  fecha: string | null;
  descansa: boolean;
}

interface LabelMes {
  semanaIndex: number;
  label: string;
}

const NOMBRES_MES_CORTO = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

const NOMBRES_DIA_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const DIAS_SEMANA_CORTO = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']; // índice = diaSemana (0=Lunes)

@Component({
  selector: 'app-calendario-equipo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatSnackBarModule,
  ],
  templateUrl: './calendario-equipo.component.html',
  styleUrl: './calendario-equipo.component.scss',
})
export class CalendarioEquipoComponent implements OnInit {
  readonly diasSemanaCorto = DIAS_SEMANA_CORTO;

  empleados: EmpleadoEquipo[] = [];
  empleadoSeleccionadoId: number | null = null;

  hoy = new Date();
  anio = this.hoy.getFullYear();
  mes = this.hoy.getMonth() + 1; // 1-12

  /** 'mes' (por defecto, el mes actual) o 'anio' (mosaico estilo GitHub del año completo) */
  vista: 'mes' | 'anio' = 'mes';

  dias: (DiaCelda | null)[] = [];
  descansosDelMes: DescansoEmpleado[] = [];
  descansosDelAnio: DescansoEmpleado[] = [];
  semanasAnio: CeldaAnio[][] = [];
  labelsMesAnio: LabelMes[] = [];
  cargando = false;
  guardando = false;

  /** Cambios sin guardar todavía: fecha -> nuevo valor de "descansa" (solo entradas que difieren del servidor) */
  cambiosLocales = new Map<string, boolean>();

  private readonly nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  constructor(
    private descansoService: DescansoService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.descansoService.listarEmpleados().subscribe({
      next: (empleados) => {
        this.empleados = empleados;
        if (empleados.length > 0) {
          this.empleadoSeleccionadoId = empleados[0].id;
        }
        this.cargar();
      },
      error: () => {
        this.snackBar.open('Error al cargar los empleados de tu equipo', 'Cerrar', { duration: 3000 });
      },
    });
  }

  get nombreMes(): string {
    return this.nombresMeses[this.mes - 1];
  }

  get nombreEmpleadoSeleccionado(): string {
    return this.empleados.find((e) => e.id === this.empleadoSeleccionadoId)?.nombre || '';
  }

  get inicialesEmpleadoSeleccionado(): string {
    const nombre = this.nombreEmpleadoSeleccionado;
    if (!nombre) return '';
    const partes = nombre.trim().split(/\s+/);
    const primera = partes[0]?.charAt(0) || '';
    const segunda = partes[1]?.charAt(0) || '';
    return (primera + segunda).toUpperCase();
  }

  get esHoy(): boolean {
    return this.anio === this.hoy.getFullYear() && this.mes === this.hoy.getMonth() + 1;
  }

  get hayCambiosSinGuardar(): boolean {
    return this.cambiosLocales.size > 0;
  }

  /** Descansos marcados (ya guardados en servidor) del empleado seleccionado, en el mes visible */
  private get descansosOriginalesDelMes(): Map<string, DescansoEmpleado> {
    const mapa = new Map<string, DescansoEmpleado>();
    if (!this.empleadoSeleccionadoId) return mapa;
    for (const d of this.descansosDelMes) {
      if (d.empleado_id === this.empleadoSeleccionadoId) mapa.set(d.fecha.slice(0, 10), d);
    }
    return mapa;
  }

  /** Lista para el panel lateral: fecha + si descansa, ya mezclando cambios sin guardar */
  get descansosEmpleadoActual(): { fecha: string; descansa: boolean }[] {
    if (!this.empleadoSeleccionadoId) return [];

    if (this.vista === 'anio') {
      return this.descansosDelAnio
        .filter((d) => d.empleado_id === this.empleadoSeleccionadoId)
        .map((d) => ({ fecha: d.fecha.slice(0, 10), descansa: true }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
    }

    const originales = this.descansosOriginalesDelMes;
    const fechas = new Set([...originales.keys(), ...this.cambiosLocales.keys()]);
    return Array.from(fechas)
      .map((fecha) => ({ fecha, descansa: this.descansaEnFecha(fecha) }))
      .filter((d) => d.descansa)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  /** Estado efectivo (ya con cambios sin guardar aplicados) de una fecha del mes visible */
  descansaEnFecha(fecha: string): boolean {
    if (this.cambiosLocales.has(fecha)) return this.cambiosLocales.get(fecha)!;
    return this.descansosOriginalesDelMes.has(fecha);
  }

  formatearFechaCorta(fecha: string): string {
    const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number);
    const fechaLocal = new Date(anio, mes - 1, dia);
    return `${NOMBRES_DIA_SEMANA[fechaLocal.getDay()]} ${dia} ${NOMBRES_MES_CORTO[mes - 1]}`;
  }

  // ==================== Resumen del mes ====================

  get diasQueTrabaja(): number {
    return this.dias.filter((d) => d && !this.descansaEnFecha(d.fecha)).length;
  }

  get totalDescansos(): number {
    return this.dias.filter((d) => d && this.descansaEnFecha(d.fecha)).length;
  }

  get domingosTrabajados(): number {
    return this.dias.filter((d) => d && d.diaSemana === 6 && !this.descansaEnFecha(d.fecha)).length;
  }

  // ==================== Navegación ====================

  cambiarVista(vista: 'mes' | 'anio'): void {
    if (this.hayCambiosSinGuardar) {
      this.snackBar.open('Guarda o descarta tus cambios antes de cambiar de vista', 'Cerrar', { duration: 3000 });
      return;
    }
    this.vista = vista;
    this.cargar();
  }

  cambiarMes(delta: number): void {
    if (this.hayCambiosSinGuardar) {
      this.snackBar.open('Guarda o descarta tus cambios antes de cambiar de mes', 'Cerrar', { duration: 3000 });
      return;
    }
    this.mes += delta;
    if (this.mes > 12) {
      this.mes = 1;
      this.anio++;
    } else if (this.mes < 1) {
      this.mes = 12;
      this.anio--;
    }
    this.cargar();
  }

  cambiarAnio(delta: number): void {
    if (this.hayCambiosSinGuardar) {
      this.snackBar.open('Guarda o descarta tus cambios antes de cambiar de año', 'Cerrar', { duration: 3000 });
      return;
    }
    this.anio += delta;
    this.cargar();
  }

  irAHoy(): void {
    if (this.hayCambiosSinGuardar) {
      this.snackBar.open('Guarda o descarta tus cambios antes de cambiar de mes', 'Cerrar', { duration: 3000 });
      return;
    }
    this.anio = this.hoy.getFullYear();
    this.mes = this.hoy.getMonth() + 1;
    this.cargar();
  }

  cambiarEmpleado(): void {
    this.cambiosLocales.clear();
    if (this.vista === 'anio') {
      this.construirMosaicoAnio();
    }
  }

  private cargar(): void {
    this.cambiosLocales.clear();
    if (this.vista === 'mes') {
      this.cargarMes();
    } else {
      this.cargarAnio();
    }
  }

  private cargarMes(): void {
    this.cargando = true;
    const mesStr = `${this.anio}-${String(this.mes).padStart(2, '0')}`;
    this.descansoService.listarPorMes(mesStr).subscribe({
      next: (descansos) => {
        this.descansosDelMes = descansos;
        this.construirDiasMes();
        this.cargando = false;
      },
      error: () => {
        this.snackBar.open('Error al cargar el calendario de descansos', 'Cerrar', { duration: 3000 });
        this.cargando = false;
      },
    });
  }

  private cargarAnio(): void {
    this.cargando = true;
    this.descansoService.listarPorAnio(this.anio).subscribe({
      next: (descansos) => {
        this.descansosDelAnio = descansos;
        this.construirMosaicoAnio();
        this.cargando = false;
      },
      error: () => {
        this.snackBar.open('Error al cargar el calendario de descansos', 'Cerrar', { duration: 3000 });
        this.cargando = false;
      },
    });
  }

  private construirDiasMes(): void {
    const diasEnMes = new Date(this.anio, this.mes, 0).getDate();
    const primerDiaSemana = (new Date(this.anio, this.mes - 1, 1).getDay() + 6) % 7; // Lunes = 0

    const dias: (DiaCelda | null)[] = new Array(primerDiaSemana).fill(null);
    for (let numero = 1; numero <= diasEnMes; numero++) {
      const fecha = `${this.anio}-${String(this.mes).padStart(2, '0')}-${String(numero).padStart(2, '0')}`;
      const diaSemana = (new Date(this.anio, this.mes - 1, numero).getDay() + 6) % 7; // Lunes = 0
      dias.push({ numero, fecha, diaSemana });
    }
    this.dias = dias;
  }

  /** Arma la cuadrícula de 53 semanas x 7 días (estilo GitHub) para el empleado seleccionado */
  private construirMosaicoAnio(): void {
    if (!this.empleadoSeleccionadoId) {
      this.semanasAnio = [];
      this.labelsMesAnio = [];
      return;
    }

    const fechasDescanso = new Set(
      this.descansosDelAnio
        .filter((d) => d.empleado_id === this.empleadoSeleccionadoId)
        .map((d) => d.fecha.slice(0, 10)),
    );

    const inicioAnio = new Date(this.anio, 0, 1);
    const inicioGrid = new Date(inicioAnio);
    inicioGrid.setDate(inicioGrid.getDate() - inicioGrid.getDay());

    const semanas: CeldaAnio[][] = [];
    const labelsMes: LabelMes[] = [];
    let mesAnterior = -1;
    const cursor = new Date(inicioGrid);

    for (let semana = 0; semana < 53; semana++) {
      const columna: CeldaAnio[] = [];
      let primeraFechaDelAnioEnSemana: Date | null = null;

      for (let dia = 0; dia < 7; dia++) {
        const perteneceAlAnio = cursor.getFullYear() === this.anio;
        const fecha = perteneceAlAnio
          ? `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
          : null;

        if (fecha && !primeraFechaDelAnioEnSemana) {
          primeraFechaDelAnioEnSemana = new Date(cursor);
        }

        columna.push({ fecha, descansa: fecha ? fechasDescanso.has(fecha) : false });
        cursor.setDate(cursor.getDate() + 1);
      }

      if (primeraFechaDelAnioEnSemana) {
        const mes = primeraFechaDelAnioEnSemana.getMonth();
        if (mes !== mesAnterior) {
          labelsMes.push({ semanaIndex: semana, label: NOMBRES_MES_CORTO[mes] });
          mesAnterior = mes;
        }
      }

      semanas.push(columna);
    }

    this.semanasAnio = semanas;
    this.labelsMesAnio = labelsMes;
  }

  labelMesDeSemana(semanaIndex: number): string {
    return this.labelsMesAnio.find((l) => l.semanaIndex === semanaIndex)?.label || '';
  }

  // ==================== Edición (vista Mes, por lotes) ====================

  /** Clic en un día: alterna el estado EN MEMORIA; no se guarda hasta "Guardar cambios" */
  onClickDia(celda: DiaCelda | null): void {
    if (!celda || !this.empleadoSeleccionadoId) return;

    const nuevoValor = !this.descansaEnFecha(celda.fecha);
    const original = this.descansosOriginalesDelMes.has(celda.fecha);

    if (nuevoValor === original) {
      this.cambiosLocales.delete(celda.fecha);
    } else {
      this.cambiosLocales.set(celda.fecha, nuevoValor);
    }
  }

  /** Patrón semanal: alterna TODAS las fechas del mes que caen en ese día de semana */
  toggleDiaSemana(diaSemana: number): void {
    if (!this.empleadoSeleccionadoId) return;

    const fechasDelDia = (this.dias.filter((d) => d && d.diaSemana === diaSemana) as DiaCelda[]).map((d) => d.fecha);
    if (fechasDelDia.length === 0) return;

    const todasDescansan = fechasDelDia.every((f) => this.descansaEnFecha(f));
    const nuevoValor = !todasDescansan;

    for (const fecha of fechasDelDia) {
      const original = this.descansosOriginalesDelMes.has(fecha);
      if (nuevoValor === original) {
        this.cambiosLocales.delete(fecha);
      } else {
        this.cambiosLocales.set(fecha, nuevoValor);
      }
    }
  }

  restablecerMes(): void {
    this.cambiosLocales.clear();
  }

  guardarCambios(): void {
    if (!this.empleadoSeleccionadoId || this.cambiosLocales.size === 0 || this.guardando) return;

    const empleadoId = this.empleadoSeleccionadoId;
    const originales = this.descansosOriginalesDelMes;
    const cambios = Array.from(this.cambiosLocales.entries());

    this.guardando = true;
    let pendientes = cambios.length;
    let huboError = false;

    const terminarSiListo = () => {
      pendientes--;
      if (pendientes > 0) return;
      this.guardando = false;
      this.cambiosLocales.clear();
      if (huboError) {
        this.snackBar.open('Algunos cambios no se pudieron guardar', 'Cerrar', { duration: 3000 });
      } else {
        this.snackBar.open('✅ Cambios guardados', 'Cerrar', { duration: 2000 });
      }
      this.cargarMes();
    };

    for (const [fecha, descansaNuevo] of cambios) {
      if (descansaNuevo) {
        this.descansoService.crear(empleadoId, fecha).subscribe({
          next: terminarSiListo,
          error: () => {
            huboError = true;
            terminarSiListo();
          },
        });
      } else {
        const existente = originales.get(fecha);
        if (!existente) {
          terminarSiListo();
          continue;
        }
        this.descansoService.eliminar(existente.id).subscribe({
          next: terminarSiListo,
          error: () => {
            huboError = true;
            terminarSiListo();
          },
        });
      }
    }
  }

  /** Clic en una celda del mosaico anual: ahí sí se guarda al instante (no tiene "Guardar cambios" propio) */
  onClickCeldaAnio(celda: CeldaAnio): void {
    if (!celda.fecha || !this.empleadoSeleccionadoId || this.guardando) return;

    this.guardando = true;
    const existente = this.descansosDelAnio.find(
      (d) => d.empleado_id === this.empleadoSeleccionadoId && d.fecha.slice(0, 10) === celda.fecha,
    );

    if (existente) {
      this.descansoService.eliminar(existente.id).subscribe({
        next: () => {
          this.descansosDelAnio = this.descansosDelAnio.filter((d) => d.id !== existente.id);
          this.construirMosaicoAnio();
          this.guardando = false;
        },
        error: (error) => {
          this.snackBar.open(error.error?.mensaje || 'Error al quitar el descanso', 'Cerrar', { duration: 3000 });
          this.guardando = false;
        },
      });
      return;
    }

    this.descansoService.crear(this.empleadoSeleccionadoId, celda.fecha).subscribe({
      next: (descanso) => {
        this.descansosDelAnio = [...this.descansosDelAnio, descanso];
        this.construirMosaicoAnio();
        this.guardando = false;
      },
      error: (error) => {
        this.snackBar.open(error.error?.mensaje || 'Error al marcar el descanso', 'Cerrar', { duration: 3000 });
        this.guardando = false;
      },
    });
  }

  /** Quitar un descanso directamente desde el panel lateral (vista Año: guarda al instante) */
  quitarDescansoAnio(fecha: string): void {
    const existente = this.descansosDelAnio.find(
      (d) => d.empleado_id === this.empleadoSeleccionadoId && d.fecha.slice(0, 10) === fecha,
    );
    if (existente) this.onClickCeldaAnio({ fecha, descansa: true });
  }
}
