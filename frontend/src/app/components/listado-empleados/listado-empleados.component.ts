import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { EmpleadoService, Empleado } from '../../services/empleado.service';
import { FormularioEmpleadoComponent } from '../formulario-empleado/formulario-empleado.component';

@Component({
  selector: 'app-listado-empleados',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatToolbarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './listado-empleados.component.html',
  styleUrl: './listado-empleados.component.scss'
})
export class ListadoEmpleadosComponent implements OnInit {
  empleados: Empleado[] = [];
  cargando = false;
  displayedColumns: string[] = ['id', 'nombre', 'apellido', 'cargo', 'telefono', 'departamento', 'acciones'];

  constructor(
    private empleadoService: EmpleadoService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.cargarEmpleados();
  }

  cargarEmpleados(): void {
    this.cargando = true;
    this.empleadoService.obtenerTodos().subscribe({
      next: (response) => {
        this.empleados = Array.isArray(response.data) ? response.data : [response.data];
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar empleados:', error);
        this.snackBar.open('Error al cargar empleados', 'Cerrar', { duration: 3000 });
        this.cargando = false;
      }
    });
  }

  abrirFormulario(empleado?: Empleado): void {
    const dialogRef = this.dialog.open(FormularioEmpleadoComponent, {
      width: '500px',
      data: empleado || null
    });

    dialogRef.afterClosed().subscribe(resultado => {
      if (resultado) {
        this.cargarEmpleados();
      }
    });
  }

  editarEmpleado(empleado: Empleado): void {
    this.abrirFormulario(empleado);
  }

  eliminarEmpleado(empleado: Empleado): void {
    if (confirm(`¿Estás seguro de eliminar a ${empleado.nombre} ${empleado.apellido}?`)) {
      this.empleadoService.eliminar(empleado.id).subscribe({
        next: () => {
          this.snackBar.open('Empleado eliminado exitosamente', 'Cerrar', { duration: 3000 });
          this.cargarEmpleados();
        },
        error: (error) => {
          console.error('Error al eliminar:', error);
          this.snackBar.open('Error al eliminar empleado', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  volver(): void {
    this.router.navigate(['/dashboard']);
  }
}
