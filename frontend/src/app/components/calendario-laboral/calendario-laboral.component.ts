import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CalendarioService, DiaCalendario, TipoDiaCalendario } from '../../services/calendario.service';
import { EmpleadoService, Empleado } from '../../services/empleado.service';

interface DiaCelda {
  numero: number;
  fecha: string;
  diaEspecial?: DiaCalendario;
}

interface MesCalendario {
  nombre: string;
  dias: (DiaCelda | null)[];
}

@Component({
  selector: 'app-nuevo-dia-especial-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatCheckboxModule,
  ],
  template: `
    <h2 mat-dialog-title>Nuevo día especial</h2>
    <mat-dialog-content>
      <p class="fecha-info">{{ data.fecha }}</p>

      <mat-form-field appearance="fill" class="campo-completo">
        <mat-label>Nombre</mat-label>
        <input matInput [(ngModel)]="nombre" placeholder="Ej: Día de la Independencia" />
      </mat-form-field>

      <mat-radio-group [(ngModel)]="tipo" class="tipo-group">
        <mat-radio-button value="festivo">Festivo</mat-radio-button>
        <mat-radio-button value="no_laborable">No laborable</mat-radio-button>
      </mat-radio-group>

      <div class="excepciones-section">
        <p class="excepciones-titulo">
          Excepciones (opcional)
          <span class="excepciones-hint">Empleados que sí trabajarán normalmente este día</span>
        </p>
        <div class="empleados-lista">
          <mat-checkbox
            *ngFor="let empleado of empleados"
            [checked]="idsExceptuados.has(empleado.id)"
            (change)="toggleExcepcion(empleado.id)"
          >
            {{ empleado.nombre }} {{ empleado.apellido }}
          </mat-checkbox>
          <p *ngIf="!empleados.length" class="sin-empleados">Cargando empleados...</p>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="!nombre.trim()" (click)="guardar()">Guardar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .fecha-info { color: #666; font-size: 13px; margin: 0 0 12px; }
    .campo-completo { width: 100%; }
    .tipo-group { display: flex; gap: 16px; margin: 8px 0 16px; }
    .excepciones-section { margin-top: 8px; }
    .excepciones-titulo { font-size: 13px; font-weight: 600; color: #333; margin: 0 0 4px; display: flex; flex-direction: column; gap: 2px; }
    .excepciones-hint { font-size: 12px; font-weight: 400; color: #888; }
    .empleados-lista { max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; border: 1px solid #eee; border-radius: 8px; padding: 8px 12px; }
    .sin-empleados { color: #999; font-size: 13px; }
  `],
})
export class NuevoDiaEspecialDialogComponent implements OnInit {
  nombre = '';
  tipo: TipoDiaCalendario = 'no_laborable';
  empleados: Empleado[] = [];
  idsExceptuados = new Set<number>();

  constructor(
    public dialogRef: MatDialogRef<NuevoDiaEspecialDialogComponent>,
    private empleadoService: EmpleadoService,
    @Inject(MAT_DIALOG_DATA) public data: { fecha: string },
  ) {}

  ngOnInit(): void {
    this.empleadoService.obtenerTodos().subscribe({
      next: (response) => {
        this.empleados = (Array.isArray(response.data) ? response.data : []).filter(
          (e) => e.estado !== 'inactivo',
        );
      },
    });
  }

  toggleExcepcion(empleadoId: number): void {
    if (this.idsExceptuados.has(empleadoId)) {
      this.idsExceptuados.delete(empleadoId);
    } else {
      this.idsExceptuados.add(empleadoId);
    }
  }

  guardar(): void {
    if (!this.nombre.trim()) return;
    this.dialogRef.close({
      nombre: this.nombre.trim(),
      tipo: this.tipo,
      empleadosExceptuadosIds: Array.from(this.idsExceptuados),
    });
  }
}

@Component({
  selector: 'app-calendario-laboral',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatDialogModule],
  templateUrl: './calendario-laboral.component.html',
  styleUrl: './calendario-laboral.component.scss'
})
export class CalendarioLaboralComponent implements OnInit {
  anio = new Date().getFullYear();
  meses: MesCalendario[] = [];
  diasEspeciales: DiaCalendario[] = [];
  cargando = false;

  private readonly nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  constructor(
    private calendarioService: CalendarioService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.cargarAnio();
  }

  cargarAnio(): void {
    this.cargando = true;
    this.calendarioService.listarPorAnio(this.anio).subscribe({
      next: (response) => {
        this.diasEspeciales = response.data;
        this.construirMeses();
        this.cargando = false;
      },
      error: () => {
        this.snackBar.open('Error al cargar el calendario', 'Cerrar', { duration: 3000 });
        this.cargando = false;
      }
    });
  }

  cambiarAnio(delta: number): void {
    this.anio += delta;
    this.cargarAnio();
  }

  private construirMeses(): void {
    this.meses = this.nombresMeses.map((nombre, indiceMes) => {
      const diasEnMes = new Date(this.anio, indiceMes + 1, 0).getDate();
      const primerDiaSemana = (new Date(this.anio, indiceMes, 1).getDay() + 6) % 7; // Lunes = 0

      const dias: (DiaCelda | null)[] = new Array(primerDiaSemana).fill(null);

      for (let numero = 1; numero <= diasEnMes; numero++) {
        const fecha = `${this.anio}-${String(indiceMes + 1).padStart(2, '0')}-${String(numero).padStart(2, '0')}`;
        dias.push({
          numero,
          fecha,
          diaEspecial: this.diasEspeciales.find((d) => d.fecha.slice(0, 10) === fecha)
        });
      }

      return { nombre, dias };
    });
  }

  tituloCelda(celda: DiaCelda | null): string {
    if (!celda?.diaEspecial) return '';
    const excepciones = celda.diaEspecial.empleadosExceptuados;
    if (!excepciones?.length) return celda.diaEspecial.nombre;
    const nombres = excepciones.map((e) => `${e.nombre} ${e.apellido}`).join(', ');
    return `${celda.diaEspecial.nombre} (excepto: ${nombres})`;
  }

  onClickDia(celda: DiaCelda | null): void {
    if (!celda) return;

    if (celda.diaEspecial) {
      this.eliminarDia(celda.diaEspecial);
      return;
    }

    const ref = this.dialog.open(NuevoDiaEspecialDialogComponent, {
      width: '420px',
      data: { fecha: celda.fecha },
    });

    ref.afterClosed().subscribe((resultado) => {
      if (!resultado) return;

      this.calendarioService
        .crear(celda.fecha, resultado.tipo, resultado.nombre, resultado.empleadosExceptuadosIds)
        .subscribe({
          next: () => {
            this.snackBar.open('✅ Día especial registrado', 'Cerrar', { duration: 2500 });
            this.cargarAnio();
          },
          error: (error) => {
            this.snackBar.open(error.error?.mensaje || 'Error al registrar el día', 'Cerrar', { duration: 3000 });
          }
        });
    });
  }

  private eliminarDia(dia: DiaCalendario): void {
    if (!window.confirm(`¿Quitar "${dia.nombre}" del calendario?`)) return;

    this.calendarioService.eliminar(dia.id).subscribe({
      next: () => {
        this.snackBar.open('Día eliminado del calendario', 'Cerrar', { duration: 2500 });
        this.cargarAnio();
      },
      error: () => {
        this.snackBar.open('Error al eliminar el día', 'Cerrar', { duration: 3000 });
      }
    });
  }
}
