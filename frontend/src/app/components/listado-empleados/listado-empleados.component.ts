import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SolicitudService, SaldoVacacionesEmpleado } from '../../services/solicitud.service';
import { EmpleadoService, Empleado } from '../../services/empleado.service';
import { FormularioEmpleadoComponent } from '../formulario-empleado/formulario-empleado.component';
import { AuthService } from '../../services/auth.service';
import { ExportarExcelService } from '../../services/exportar-excel.service';

@Component({
  selector: 'app-listado-empleados',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatToolbarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './listado-empleados.component.html',
  styleUrl: './listado-empleados.component.scss'
})
export class ListadoEmpleadosComponent implements OnInit, AfterViewInit {
  empleados: Empleado[] = [];
  dataSource = new MatTableDataSource<Empleado>([]);
  cargando = false;
  filtroNombre = '';
  /** Los empleados dados de baja se quedan en la lista (para reactivarlos o exportarlos)
   * pero ocultos por defecto, para no mezclarlos con el personal activo */
  mostrarInactivos = false;

  saldosVacacionesPorEmpleado: Record<number, SaldoVacacionesEmpleado> = {};
  anioVacaciones = new Date().getFullYear();
  opcionesAnioVacaciones = this.generarOpcionesAnio();

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private empleadoService: EmpleadoService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private authService: AuthService,
    private exportarExcelService: ExportarExcelService,
    private solicitudService: SolicitudService,
  ) {}

  get esAdmin(): boolean {
    return this.authService.esAdmin();
  }

  get esLider(): boolean {
    return this.authService.esLider();
  }

  get displayedColumns(): string[] {
    const columnas = ['id', 'nombre', 'apellido', 'cargo', 'telefono', 'departamento', 'estado', 'vacaciones'];
    return this.esAdmin || this.esLider ? [...columnas, 'acciones'] : columnas;
  }

  private generarOpcionesAnio(): number[] {
    const actual = new Date().getFullYear();
    return [actual, actual - 1, actual - 2];
  }

  ngOnInit(): void {
    this.cargarEmpleados();
    this.cargarSaldosVacaciones();
  }

  cargarSaldosVacaciones(): void {
    this.solicitudService.obtenerSaldosVacacionesMasivo(this.anioVacaciones).subscribe({
      next: (saldos) => {
        this.saldosVacacionesPorEmpleado = {};
        for (const s of saldos) {
          this.saldosVacacionesPorEmpleado[s.empleadoId] = s;
        }
      },
      error: () => {
        this.saldosVacacionesPorEmpleado = {};
      },
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    // El filtro combina nombre + estado en un solo string (mat-table solo permite
    // un filtro de texto), separados por '|' para no depender de coincidencias parciales raras
    this.dataSource.filterPredicate = (empleado, filtro) => {
      const [nombreFiltro, soloActivos] = filtro.split('|');
      if (soloActivos === '1' && empleado.estado === 'inactivo') return false;
      return `${empleado.nombre} ${empleado.apellido}`.toLowerCase().includes(nombreFiltro);
    };
    this.aplicarFiltroNombre();
  }

  aplicarFiltroNombre(): void {
    this.dataSource.filter = `${this.filtroNombre.trim().toLowerCase()}|${this.mostrarInactivos ? '0' : '1'}`;
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  limpiarFiltroNombre(): void {
    this.filtroNombre = '';
    this.aplicarFiltroNombre();
  }

  cargarEmpleados(): void {
    this.cargando = true;
    this.empleadoService.obtenerTodos().subscribe({
      next: (response) => {
        this.empleados = Array.isArray(response.data) ? response.data : [response.data];
        this.dataSource.data = this.empleados;
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

  /**
   * Da de baja o reactiva un empleado. A diferencia de "Eliminar", esto NO borra
   * su historial (asistencias, horas extra, trámites) — solo lo marca inactivo,
   * lo cual ya lo excluye de cumplimiento de reportes, alertas y saldos de
   * vacaciones. Es la forma correcta de manejar a alguien que ya no trabaja aquí.
   */
  toggleEstado(empleado: Empleado): void {
    const darDeBaja = empleado.estado !== 'inactivo';
    const accion = darDeBaja ? 'dar de baja' : 'reactivar';
    if (!confirm(`¿Seguro que quieres ${accion} a ${empleado.nombre} ${empleado.apellido}?`)) return;

    this.empleadoService.actualizarEstado(empleado.id, darDeBaja ? 'inactivo' : 'activo').subscribe({
      next: () => {
        this.snackBar.open(`✅ Empleado ${darDeBaja ? 'dado de baja' : 'reactivado'}`, 'Cerrar', { duration: 3000 });
        this.cargarEmpleados();
      },
      error: () => {
        this.snackBar.open(`Error al ${accion} al empleado`, 'Cerrar', { duration: 3000 });
      },
    });
  }

  /** Borrado permanente: elimina también su historial. Usar solo para corregir un registro creado por error. */
  eliminarEmpleado(empleado: Empleado): void {
    if (confirm(`Esto borra PERMANENTEMENTE a ${empleado.nombre} ${empleado.apellido} y todo su historial (asistencias, horas extra, trámites). Si ya no trabaja aquí pero necesitas conservar su historial, usa "Dar de baja" en vez de esto.\n\n¿Seguro que quieres eliminarlo por completo?`)) {
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

  exportarExcel(): void {
    if (this.dataSource.filteredData.length === 0) {
      this.snackBar.open('No hay empleados para exportar', 'Cerrar', { duration: 3000 });
      return;
    }
    const filas = this.dataSource.filteredData.map((e) => {
      const saldo = this.saldosVacacionesPorEmpleado[e.id];
      return {
        ID: e.id,
        Nombre: e.nombre,
        Apellido: e.apellido,
        Cargo: e.cargo || '-',
        Teléfono: e.telefono || '-',
        Departamento: e.departamento?.nombre || '-',
        'Vacaciones Disponibles': saldo ? saldo.diasDisponibles : '-',
        'Vacaciones Cupo Anual': saldo ? saldo.cupoAnual : '-',
      };
    });
    this.exportarExcelService.exportar(filas, 'listado_empleados');
  }
}
