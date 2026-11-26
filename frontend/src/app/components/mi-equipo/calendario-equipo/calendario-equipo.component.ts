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

  dias: (DiaCelda | null)[] = [];
  descansosDelMes: DescansoEmpleado[] = [];
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
        this.cargarMes();
      },
      error: () => {
        this.snackBar.open('Error al cargar los empleados de tu equipo', 'Cerrar', { duration: 3000 });
      },
    });
  }

  get nombreMes(): string {
    return this.nombresMeses[this.mes - 1];
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
    this.cargarMes();
  }

  cambiarEmpleado(): void {
    this.construirDias();
  }

  private cargarMes(): void {
    this.cargando = true;
    const mesStr = `${this.anio}-${String(this.mes).padStart(2, '0')}`;
    this.descansoService.listarPorMes(mesStr).subscribe({
      next: (descansos) => {
        this.descansosDelMes = descansos;
        this.construirDias();
        this.cargando = false;
      },
      error: () => {
        this.snackBar.open('Error al cargar el calendario de descansos', 'Cerrar', { duration: 3000 });
        this.cargando = false;
      },
    });
  }

  private construirDias(): void {
    const diasEnMes = new Date(this.anio, this.mes, 0).getDate();
    const primerDiaSemana = (new Date(this.anio, this.mes - 1, 1).getDay() + 6) % 7; // Lunes = 0

    const dias: (DiaCelda | null)[] = new Array(primerDiaSemana).fill(null);
    for (let numero = 1; numero <= diasEnMes; numero++) {
      const fecha = `${this.anio}-${String(this.mes).padStart(2, '0')}-${String(numero).padStart(2, '0')}`;
      dias.push({ numero, fecha });
    }
    this.dias = dias;
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
}
