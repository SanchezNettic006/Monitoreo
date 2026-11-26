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

interface MesAnio {
  numero: number; // 1-12
  nombre: string;
  dias: (DiaCelda | null)[];
}

const NOMBRES_MES_CORTO = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

const NOMBRES_DIA_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const DIAS_SEMANA_CORTO = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']; // índice = diaSemana (0=Lunes)

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

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

  /** 'mes' (por defecto, el mes actual) o 'anio' (los 12 meses en mini-calendarios) */
  vista: 'mes' | 'anio' = 'mes';

  dias: (DiaCelda | null)[] = [];
  mesesDelAnio: MesAnio[] = [];
  descansosDelMes: DescansoEmpleado[] = [];
  descansosDelAnio: DescansoEmpleado[] = [];
  cargando = false;
  guardando = false;

  /** Cambios sin guardar todavía: fecha -> nuevo valor de "descansa" (solo entradas que difieren del servidor) */
  cambiosLocales = new Map<string, boolean>();

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
    return NOMBRES_MESES[this.mes - 1];
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

  esFechaHoy(fecha: string): boolean {
    return fecha === this.fechaHoyStr;
  }

  private get fechaHoyStr(): string {
    return `${this.hoy.getFullYear()}-${String(this.hoy.getMonth() + 1).padStart(2, '0')}-${String(this.hoy.getDate()).padStart(2, '0')}`;
  }

  /** Descansos marcados (ya guardados en servidor) del empleado seleccionado, en el período visible (mes o año) */
  private get descansosOriginalesDelPeriodo(): Map<string, DescansoEmpleado> {
    const mapa = new Map<string, DescansoEmpleado>();
    if (!this.empleadoSeleccionadoId) return mapa;
    const fuente = this.vista === 'mes' ? this.descansosDelMes : this.descansosDelAnio;
    for (const d of fuente) {
      if (d.empleado_id === this.empleadoSeleccionadoId) mapa.set(d.fecha.slice(0, 10), d);
    }
    return mapa;
  }

  /** Todas las celdas de día visibles en el período actual (mes: ese mes; año: los 12 meses) */
  private get todasLasCeldas(): DiaCelda[] {
    if (this.vista === 'mes') {
      return this.dias.filter((d): d is DiaCelda => !!d);
    }
    return this.mesesDelAnio.flatMap((m) => m.dias.filter((d): d is DiaCelda => !!d));
  }

  /** Lista para el panel lateral (solo vista Mes): fecha + si descansa, ya mezclando cambios sin guardar */
  get descansosEmpleadoActual(): { fecha: string; descansa: boolean }[] {
    if (!this.empleadoSeleccionadoId) return [];

    const originales = this.descansosOriginalesDelPeriodo;
    const fechas = new Set([...originales.keys(), ...this.cambiosLocales.keys()]);
    return Array.from(fechas)
      .map((fecha) => ({ fecha, descansa: this.descansaEnFecha(fecha) }))
      .filter((d) => d.descansa)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  /** Estado efectivo (ya con cambios sin guardar aplicados) de una fecha del período visible */
  descansaEnFecha(fecha: string): boolean {
    if (this.cambiosLocales.has(fecha)) return this.cambiosLocales.get(fecha)!;
    return this.descansosOriginalesDelPeriodo.has(fecha);
  }

  formatearFechaCorta(fecha: string): string {
    const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number);
    const fechaLocal = new Date(anio, mes - 1, dia);
    return `${NOMBRES_DIA_SEMANA[fechaLocal.getDay()]} ${dia} ${NOMBRES_MES_CORTO[mes - 1]}`;
  }

  // ==================== Resumen del período (mes o año) ====================

  get diasQueTrabaja(): number {
    return this.todasLasCeldas.filter((d) => !this.descansaEnFecha(d.fecha)).length;
  }

  get totalDescansos(): number {
    return this.todasLasCeldas.filter((d) => this.descansaEnFecha(d.fecha)).length;
  }

  get domingosTrabajados(): number {
    return this.todasLasCeldas.filter((d) => d.diaSemana === 6 && !this.descansaEnFecha(d.fecha)).length;
  }

  /** Cantidad de descansos por cada uno de los 12 meses del año visible, para la barra lateral */
  get descansosPorMes(): { numero: number; nombreCorto: string; cantidad: number }[] {
    return this.mesesDelAnio.map((m) => ({
      numero: m.numero,
      nombreCorto: NOMBRES_MES_CORTO[m.numero - 1],
      cantidad: (m.dias.filter((d): d is DiaCelda => !!d)).filter((d) => this.descansaEnFecha(d.fecha)).length,
    }));
  }

  get maxDescansosPorMes(): number {
    return Math.max(1, ...this.descansosPorMes.map((m) => m.cantidad));
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

  /** Clic en el nombre de un mes dentro de la vista Año: lo abre en detalle (vista Mes) */
  abrirMesEnDetalle(numero: number): void {
    if (this.hayCambiosSinGuardar) {
      this.snackBar.open('Guarda o descarta tus cambios antes de abrir otro mes', 'Cerrar', { duration: 3000 });
      return;
    }
    this.mes = numero;
    this.vista = 'mes';
    this.cargarMes();
  }

  cambiarEmpleado(): void {
    this.cambiosLocales.clear();
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
        this.construirMesesDelAnio();
        this.cargando = false;
      },
      error: () => {
        this.snackBar.open('Error al cargar el calendario de descansos', 'Cerrar', { duration: 3000 });
        this.cargando = false;
      },
    });
  }

  private construirDiasMes(): void {
    this.dias = this.construirDiasDeMes(this.anio, this.mes);
  }

  private construirMesesDelAnio(): void {
    this.mesesDelAnio = NOMBRES_MESES.map((nombre, i) => ({
      numero: i + 1,
      nombre,
      dias: this.construirDiasDeMes(this.anio, i + 1),
    }));
  }

  private construirDiasDeMes(anio: number, mes: number): (DiaCelda | null)[] {
    const diasEnMes = new Date(anio, mes, 0).getDate();
    const primerDiaSemana = (new Date(anio, mes - 1, 1).getDay() + 6) % 7; // Lunes = 0

    const dias: (DiaCelda | null)[] = new Array(primerDiaSemana).fill(null);
    for (let numero = 1; numero <= diasEnMes; numero++) {
      const fecha = `${anio}-${String(mes).padStart(2, '0')}-${String(numero).padStart(2, '0')}`;
      const diaSemana = (new Date(anio, mes - 1, numero).getDay() + 6) % 7; // Lunes = 0
      dias.push({ numero, fecha, diaSemana });
    }
    return dias;
  }

  // ==================== Edición por lotes (mes o año, según la vista activa) ====================

  /** Clic en un día: alterna el estado EN MEMORIA; no se guarda hasta "Guardar cambios" */
  onClickDia(celda: DiaCelda | null): void {
    if (!celda || !this.empleadoSeleccionadoId) return;

    const nuevoValor = !this.descansaEnFecha(celda.fecha);
    const original = this.descansosOriginalesDelPeriodo.has(celda.fecha);

    if (nuevoValor === original) {
      this.cambiosLocales.delete(celda.fecha);
    } else {
      this.cambiosLocales.set(celda.fecha, nuevoValor);
    }
  }

  /** Patrón semanal: alterna TODAS las fechas del período visible que caen en ese día de semana */
  toggleDiaSemana(diaSemana: number): void {
    if (!this.empleadoSeleccionadoId) return;

    const fechasDelDia = this.todasLasCeldas.filter((d) => d.diaSemana === diaSemana).map((d) => d.fecha);
    if (fechasDelDia.length === 0) return;

    const originales = this.descansosOriginalesDelPeriodo;
    const todasDescansan = fechasDelDia.every((f) => this.descansaEnFecha(f));
    const nuevoValor = !todasDescansan;

    for (const fecha of fechasDelDia) {
      const original = originales.has(fecha);
      if (nuevoValor === original) {
        this.cambiosLocales.delete(fecha);
      } else {
        this.cambiosLocales.set(fecha, nuevoValor);
      }
    }
  }

  restablecerCambios(): void {
    this.cambiosLocales.clear();
  }

  guardarCambios(): void {
    if (!this.empleadoSeleccionadoId || this.cambiosLocales.size === 0 || this.guardando) return;

    const empleadoId = this.empleadoSeleccionadoId;
    const originales = this.descansosOriginalesDelPeriodo;
    const cambios = Array.from(this.cambiosLocales.entries());
    const vistaGuardada = this.vista;

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
      if (vistaGuardada === 'mes') {
        this.cargarMes();
      } else {
        this.cargarAnio();
      }
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
}
