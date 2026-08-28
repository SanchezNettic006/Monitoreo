import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GrupoService, ProyectoResponse } from '../../services/grupo.service';
import { AuthService } from '../../services/auth.service';

const DEPARTAMENTOS = [
  { id: 1, nombre: 'Taller' },
  { id: 2, nombre: 'PLEX' },
  { id: 3, nombre: 'Administración' },
  { id: 4, nombre: 'Troncal' },
  { id: 5, nombre: 'Ventas' },
  { id: 6, nombre: 'SAC' },
];

@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './proyectos.component.html',
  styleUrl: './proyectos.component.scss',
})
export class ProyectosComponent implements OnInit {
  proyectos: ProyectoResponse[] = [];
  cargando = false;
  departamentos = DEPARTAMENTOS;
  departamentoSeleccionado: number | null = null;
  filtroNombre = '';
  mostrarFinalizados = false;

  constructor(
    private grupoService: GrupoService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  get esAdmin(): boolean {
    return this.authService.esAdmin();
  }

  ngOnInit(): void {
    this.cargarProyectos();
  }

  cargarProyectos(): void {
    this.cargando = true;
    this.grupoService.obtenerProyectosDirectos(this.esAdmin ? this.departamentoSeleccionado || undefined : undefined).subscribe({
      next: (response) => {
        this.proyectos = response.data;
        this.cargando = false;
      },
      error: () => {
        this.proyectos = [];
        this.cargando = false;
      },
    });
  }

  get proyectosFiltrados(): ProyectoResponse[] {
    const filtro = this.filtroNombre.trim().toLowerCase();
    return this.proyectos.filter((p) => {
      if (!this.mostrarFinalizados && !p.activo) return false;
      if (filtro && !p.nombreProyecto.toLowerCase().includes(filtro)) return false;
      return true;
    });
  }

  diasDesde(fecha: string): string {
    const inicio = new Date(`${fecha}T00:00:00`);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const dias = Math.round((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    if (dias <= 0) return 'Iniciado hoy';
    if (dias === 1) return 'Iniciado ayer';
    return `Iniciado hace ${dias} días`;
  }

  abrirNuevoProyecto(): void {
    const ref = this.dialog.open(NuevoProyectoDialogComponent, {
      width: '420px',
      data: { esAdmin: this.esAdmin, departamentos: this.departamentos },
    });

    ref.afterClosed().subscribe((resultado) => {
      if (!resultado) return;
      this.grupoService.crearProyectoDirecto(resultado.nombreProyecto, resultado.descripcion, resultado.departamentoId).subscribe({
        next: () => {
          this.snackBar.open('✅ Proyecto creado exitosamente', 'Cerrar', { duration: 3000 });
          this.cargarProyectos();
        },
        error: (error) => {
          this.snackBar.open(error.error?.mensaje || 'Error al crear proyecto', 'Cerrar', { duration: 3000 });
        },
      });
    });
  }

  finalizarProyecto(proyecto: ProyectoResponse): void {
    if (!confirm(`¿Marcar "${proyecto.nombreProyecto}" como finalizado?`)) return;

    this.grupoService.finalizarProyectoDirecto(proyecto.id).subscribe({
      next: () => {
        this.snackBar.open('✅ Proyecto finalizado exitosamente', 'Cerrar', { duration: 3000 });
        this.cargarProyectos();
      },
      error: (error) => {
        this.snackBar.open(error.error?.mensaje || 'Error al finalizar proyecto', 'Cerrar', { duration: 3000 });
      },
    });
  }
}

/** Dialog: crear proyecto nuevo, directo en un departamento */
@Component({
  selector: 'app-nuevo-proyecto-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Nuevo Proyecto</h2>
    <mat-dialog-content>
      <mat-form-field appearance="fill" class="full-width" *ngIf="data.esAdmin">
        <mat-label>Departamento</mat-label>
        <mat-select [(ngModel)]="departamentoId">
          <mat-option *ngFor="let d of data.departamentos" [value]="d.id">{{ d.nombre }}</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="fill" class="full-width">
        <mat-label>Nombre del proyecto</mat-label>
        <input matInput [(ngModel)]="nombreProyecto" placeholder="Ej: Instalación red Sucursal Norte" />
      </mat-form-field>

      <mat-form-field appearance="fill" class="full-width">
        <mat-label>Descripción (opcional)</mat-label>
        <textarea matInput rows="3" [(ngModel)]="descripcion"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancelar</button>
      <button mat-raised-button color="primary" [disabled]="!nombreProyecto.trim() || (data.esAdmin && !departamentoId)" (click)="confirmar()">
        Crear
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; margin-bottom: 8px; }`],
})
export class NuevoProyectoDialogComponent {
  nombreProyecto = '';
  descripcion = '';
  departamentoId: number | null = null;

  constructor(
    public dialogRef: MatDialogRef<NuevoProyectoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { esAdmin: boolean; departamentos: { id: number; nombre: string }[] },
  ) {}

  confirmar(): void {
    this.dialogRef.close({
      nombreProyecto: this.nombreProyecto.trim(),
      descripcion: this.descripcion.trim() || undefined,
      departamentoId: this.departamentoId,
    });
  }
}
