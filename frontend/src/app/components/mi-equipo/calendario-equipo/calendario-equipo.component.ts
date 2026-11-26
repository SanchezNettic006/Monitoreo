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

  /** Descansos marcados del empleado seleccionado, en el período que se esté viendo (mes o año), ordenados */
  get descansosEmpleadoActual(): DescansoEmpleado[] {
    if (!this.empleadoSeleccionadoId) return [];
    const fuente = this.vista === 'mes' ? this.descansosDelMes : this.descansosDelAnio;
    return fuente
      .filter((d) => d.empleado_id === this.empleadoSeleccionadoId)
      .slice()
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  formatearFechaCorta(fecha: string): string {
    const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number);
    const fechaLocal = new Date(anio, mes - 1, dia);
    return `${NOMBRES_DIA_SEMANA[fechaLocal.getDay()]} ${dia} ${NOMBRES_MES_CORTO[mes - 1]}`;
  }

  quitarDescanso(descanso: DescansoEmpleado): void {
    if (this.guardando) return;
    this.guardando = true;
    this.descansoService.eliminar(descanso.id).subscribe({
      next: () => {
        if (this.vista === 'mes') {
          this.descansosDelMes = this.descansosDelMes.filter((d) => d.id !== descanso.id);
        } else {
          this.descansosDelAnio = this.descansosDelAnio.filter((d) => d.id !== descanso.id);
          this.construirMosaicoAnio();
        }
        this.guardando = false;
      },
      error: (error) => {
        this.snackBar.open(error.error?.mensaje || 'Error al quitar el descanso', 'Cerrar', { duration: 3000 });
        this.guardando = false;
      },
    });
  }

  cambiarVista(vista: 'mes' | 'anio'): void {
    this.vista = vista;
    this.cargar();
  }

  cambiarMes(delta: number): void {
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
    this.anio += delta;
    this.cargar();
  }

  cambiarEmpleado(): void {
    if (this.vista === 'mes') {
      this.construirDiasMes();
    } else {
      this.construirMosaicoAnio();
    }
  }

  private cargar(): void {
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
      dias.push({ numero, fecha });
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

  descansoDeCelda(fecha: string): DescansoEmpleado | undefined {
    if (!this.empleadoSeleccionadoId) return undefined;
    return this.descansosDelMes.find((d) => d.empleado_id === this.empleadoSeleccionadoId && d.fecha.slice(0, 10) === fecha);
  }

  onClickDia(celda: DiaCelda | null): void {
    if (!celda || !this.empleadoSeleccionadoId || this.guardando) return;

    const existente = this.descansoDeCelda(celda.fecha);
    this.guardando = true;

    if (existente) {
      this.descansoService.eliminar(existente.id).subscribe({
        next: () => {
          this.descansosDelMes = this.descansosDelMes.filter((d) => d.id !== existente.id);
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
        this.descansosDelMes = [...this.descansosDelMes, descanso];
        this.guardando = false;
      },
      error: (error) => {
        this.snackBar.open(error.error?.mensaje || 'Error al marcar el descanso', 'Cerrar', { duration: 3000 });
        this.guardando = false;
      },
    });
  }

  /** Clic en una celda del mosaico anual: mismo efecto que en la vista de mes */
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
}
