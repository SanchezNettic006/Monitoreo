import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GrupoService, GrupoResponse, AsignacionProyectoResponse } from '../../services/grupo.service';
import { EmpleadoService, Empleado } from '../../services/empleado.service';
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
  grupos: GrupoResponse[] = [];
  cargando = false;
  departamentos = DEPARTAMENTOS;
  departamentoSeleccionado: number | null = null;
  filtroTecnico = '';

  constructor(
    private grupoService: GrupoService,
    private empleadoService: EmpleadoService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  get esAdmin(): boolean {
    return this.authService.esAdmin();
  }

  ngOnInit(): void {
    this.cargarGrupos();
  }

  cargarGrupos(): void {
    this.cargando = true;
    this.grupoService.obtenerGrupos(this.esAdmin ? this.departamentoSeleccionado || undefined : undefined).subscribe({
      next: (response) => {
        this.grupos = response.data;
        this.cargando = false;
      },
      error: () => {
        this.grupos = [];
        this.cargando = false;
      },
    });
  }

  get gruposFiltrados(): GrupoResponse[] {
    const filtro = this.filtroTecnico.trim().toLowerCase();
    if (!filtro) return this.grupos;
    return this.grupos.filter((g) =>
      g.empleados.some((e) => `${e.nombre} ${e.apellido}`.toLowerCase().includes(filtro)),
    );
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

  abrirNuevoGrupo(): void {
    const ref = this.dialog.open(NuevoGrupoDialogComponent, {
      width: '400px',
      data: { esAdmin: this.esAdmin, departamentos: this.departamentos },
    });

    ref.afterClosed().subscribe((resultado) => {
      if (!resultado) return;
      this.grupoService.crearGrupo(resultado.nombre, resultado.departamentoId).subscribe({
        next: () => {
          this.snackBar.open('✅ Grupo creado exitosamente', 'Cerrar', { duration: 3000 });
          this.cargarGrupos();
        },
        error: (error) => {
          this.snackBar.open(error.error?.mensaje || 'Error al crear grupo', 'Cerrar', { duration: 3000 });
        },
      });
    });
  }

  abrirAsignarProyecto(grupo: GrupoResponse): void {
    const ref = this.dialog.open(AsignarProyectoDialogComponent, {
      width: '420px',
      data: { grupo },
    });

    ref.afterClosed().subscribe((resultado) => {
      if (!resultado) return;
      this.grupoService.asignarProyecto(grupo.id, resultado.nombreProyecto, resultado.descripcion).subscribe({
        next: () => {
          this.snackBar.open('✅ Proyecto asignado exitosamente', 'Cerrar', { duration: 3000 });
          this.cargarGrupos();
        },
        error: (error) => {
          this.snackBar.open(error.error?.mensaje || 'Error al asignar proyecto', 'Cerrar', { duration: 3000 });
        },
      });
    });
  }

  abrirHistorial(grupo: GrupoResponse): void {
    this.dialog.open(HistorialDialogComponent, {
      width: '480px',
      data: { grupo, grupoService: this.grupoService },
    });
  }

  abrirGestionarMiembros(grupo: GrupoResponse): void {
    this.empleadoService.obtenerTodos().subscribe({
      next: (response) => {
        const todos = Array.isArray(response.data) ? response.data : [response.data];
        const delDepartamento = todos.filter((e) => e.departamento_id === grupo.departamento?.id);

        const ref = this.dialog.open(GestionarMiembrosDialogComponent, {
          width: '420px',
          data: { grupo, empleadosDelDepartamento: delDepartamento },
        });

        ref.afterClosed().subscribe((cambios: { empleadoId: number; enGrupo: boolean }[] | undefined) => {
          if (!cambios || cambios.length === 0) return;

          const peticiones = cambios.map((c) =>
            firstValueFrom(this.grupoService.asignarEmpleado(c.empleadoId, c.enGrupo ? grupo.id : null)),
          );

          Promise.all(peticiones).then(
            () => {
              this.snackBar.open('✅ Miembros actualizados exitosamente', 'Cerrar', { duration: 3000 });
              this.cargarGrupos();
            },
            (error) => {
              this.snackBar.open(error.error?.mensaje || 'Error al actualizar miembros', 'Cerrar', { duration: 3000 });
              this.cargarGrupos();
            },
          );
        });
      },
      error: () => {
        this.snackBar.open('Error al cargar empleados', 'Cerrar', { duration: 3000 });
      },
    });
  }
}

/** Dialog: crear grupo nuevo */
@Component({
  selector: 'app-nuevo-grupo-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Nuevo Grupo</h2>
    <mat-dialog-content>
      <mat-form-field appearance="fill" class="full-width">
        <mat-label>Nombre del grupo</mat-label>
        <input matInput [(ngModel)]="nombre" placeholder="Ej: Grupo A" />
      </mat-form-field>

      <mat-form-field appearance="fill" class="full-width" *ngIf="data.esAdmin">
        <mat-label>Departamento</mat-label>
        <mat-select [(ngModel)]="departamentoId">
          <mat-option *ngFor="let d of data.departamentos" [value]="d.id">{{ d.nombre }}</mat-option>
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancelar</button>
      <button mat-raised-button color="primary" [disabled]="!nombre.trim() || (data.esAdmin && !departamentoId)" (click)="confirmar()">
        Crear
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; margin-bottom: 8px; }`],
})
export class NuevoGrupoDialogComponent {
  nombre = '';
  departamentoId: number | null = null;

  constructor(
    public dialogRef: MatDialogRef<NuevoGrupoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { esAdmin: boolean; departamentos: { id: number; nombre: string }[] },
  ) {}

  confirmar(): void {
    this.dialogRef.close({ nombre: this.nombre.trim(), departamentoId: this.departamentoId });
  }
}

/** Dialog: asignar/cambiar proyecto de un grupo */
@Component({
  selector: 'app-asignar-proyecto-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Cambiar proyecto — {{ data.grupo.nombre }}</h2>
    <mat-dialog-content>
      <div class="proyecto-actual" *ngIf="data.grupo.proyectoActivo">
        <mat-icon>info</mat-icon>
        <span>Proyecto actual: <strong>{{ data.grupo.proyectoActivo.nombreProyecto }}</strong> (quedará en el historial)</span>
      </div>

      <mat-form-field appearance="fill" class="full-width">
        <mat-label>Nombre del nuevo proyecto</mat-label>
        <input matInput [(ngModel)]="nombreProyecto" placeholder="Ej: Instalación red Sucursal Norte" />
      </mat-form-field>

      <mat-form-field appearance="fill" class="full-width">
        <mat-label>Descripción (opcional)</mat-label>
        <textarea matInput rows="3" [(ngModel)]="descripcion"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancelar</button>
      <button mat-raised-button color="primary" [disabled]="!nombreProyecto.trim()" (click)="confirmar()">
        Asignar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; margin-bottom: 8px; }
    .proyecto-actual {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: rgba(240, 164, 0, 0.08);
      border-left: 3px solid #F0A400;
      border-radius: 4px;
      font-size: 13px;
      margin-bottom: 16px;
      color: #333;

      mat-icon { color: #b97e00; font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    }
  `],
})
export class AsignarProyectoDialogComponent {
  nombreProyecto = '';
  descripcion = '';

  constructor(
    public dialogRef: MatDialogRef<AsignarProyectoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { grupo: GrupoResponse },
  ) {}

  confirmar(): void {
    this.dialogRef.close({ nombreProyecto: this.nombreProyecto.trim(), descripcion: this.descripcion.trim() || undefined });
  }
}

/** Dialog: historial de proyectos de un grupo */
@Component({
  selector: 'app-historial-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Historial — {{ data.grupo.nombre }}</h2>
    <mat-dialog-content>
      <div class="loading" *ngIf="cargando">Cargando...</div>
      <div class="historial-item" *ngFor="let item of historial">
        <div class="historial-header">
          <span class="nombre">{{ item.nombre_proyecto }}</span>
          <span class="badge" [class.activo]="!item.fecha_fin">{{ item.fecha_fin ? 'Finalizado' : 'Activo' }}</span>
        </div>
        <p class="descripcion" *ngIf="item.descripcion">{{ item.descripcion }}</p>
        <p class="fechas">{{ formatearFecha(item.fecha_inicio) }} — {{ item.fecha_fin ? formatearFecha(item.fecha_fin) : 'presente' }}</p>
      </div>
      <div class="sin-datos" *ngIf="!cargando && historial.length === 0">Sin proyectos registrados</div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .historial-item {
      padding: 12px 0;
      border-bottom: 1px solid #eee;

      &:last-child { border-bottom: none; }
    }
    .historial-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .nombre { font-weight: 600; font-size: 14px; color: #333; }
    .badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 10px;
      background: #eee;
      color: #888;

      &.activo { background: rgba(43, 138, 62, 0.15); color: #2b8a3e; }
    }
    .descripcion { margin: 4px 0; font-size: 13px; color: #666; }
    .fechas { margin: 0; font-size: 12px; color: #999; }
    .sin-datos { text-align: center; padding: 20px; color: #999; }
    .loading { text-align: center; padding: 20px; color: #999; }
  `],
})
export class HistorialDialogComponent implements OnInit {
  historial: AsignacionProyectoResponse[] = [];
  cargando = true;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { grupo: GrupoResponse; grupoService: GrupoService }) {}

  ngOnInit(): void {
    this.data.grupoService.obtenerHistorial(this.data.grupo.id).subscribe({
      next: (response) => {
        this.historial = response.data;
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      },
    });
  }

  formatearFecha(fecha: string): string {
    return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}

/** Dialog: gestionar qué empleados pertenecen a un grupo */
@Component({
  selector: 'app-gestionar-miembros-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatCheckboxModule],
  template: `
    <h2 mat-dialog-title>Miembros — {{ data.grupo.nombre }}</h2>
    <mat-dialog-content>
      <p class="hint">Selecciona los empleados que pertenecen a este grupo. Si estaban en otro grupo, se moverán aquí.</p>
      <div class="empleado-item" *ngFor="let e of data.empleadosDelDepartamento">
        <mat-checkbox [(ngModel)]="seleccion[e.id]">{{ e.nombre }} {{ e.apellido }}</mat-checkbox>
      </div>
      <div class="sin-datos" *ngIf="data.empleadosDelDepartamento.length === 0">
        No hay empleados en este departamento
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancelar</button>
      <button mat-raised-button color="primary" (click)="confirmar()">Guardar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .hint { font-size: 13px; color: #666; margin-bottom: 12px; }
    .empleado-item { padding: 6px 0; }
    .sin-datos { text-align: center; padding: 20px; color: #999; }
  `],
})
export class GestionarMiembrosDialogComponent {
  seleccion: Record<number, boolean> = {};
  private seleccionOriginal: Record<number, boolean> = {};

  constructor(
    public dialogRef: MatDialogRef<GestionarMiembrosDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { grupo: GrupoResponse; empleadosDelDepartamento: Empleado[] },
  ) {
    const idsEnGrupo = new Set(data.grupo.empleados.map((e) => e.id));
    for (const empleado of data.empleadosDelDepartamento) {
      this.seleccion[empleado.id] = idsEnGrupo.has(empleado.id);
      this.seleccionOriginal[empleado.id] = idsEnGrupo.has(empleado.id);
    }
  }

  confirmar(): void {
    const cambios = Object.keys(this.seleccion)
      .map((id) => parseInt(id, 10))
      .filter((id) => this.seleccion[id] !== this.seleccionOriginal[id])
      .map((id) => ({ empleadoId: id, enGrupo: this.seleccion[id] }));

    this.dialogRef.close(cambios);
  }
}
