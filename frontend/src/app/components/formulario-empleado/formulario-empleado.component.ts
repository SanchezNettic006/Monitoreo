import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { EmpleadoService, Empleado } from '../../services/empleado.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-formulario-empleado',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  templateUrl: './formulario-empleado.component.html',
  styleUrl: './formulario-empleado.component.scss'
})
export class FormularioEmpleadoComponent {
  form: FormGroup;
  cargando = false;
  editando = false;
  departamentos = [
    { id: 1, nombre: 'Taller' },
    { id: 2, nombre: 'PLEX' },
    { id: 3, nombre: 'Administración' },
    { id: 4, nombre: 'Troncal' },
    { id: 5, nombre: 'Ventas' },
    { id: 6, nombre: 'SAC' },
    { id: 7, nombre: 'Vehículos' },
  ];
  
  // Foto
  fotoSeleccionada: File | null = null;
  previewFoto: string | null = null;
  mostrarPassword = false;

  // Departamentos adicionales que supervisa este líder (además del suyo propio),
  // ej. el líder de Troncal que también supervisa Vehículos. Solo aplica editando
  // un empleado que ya es líder (necesita un id para guardar la relación).
  departamentosExtraSeleccionados: number[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private empleadoService: EmpleadoService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<FormularioEmpleadoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Empleado | null
  ) {
    this.editando = !!data;
    this.form = this.crearFormulario();
    
    // Si estamos editando, cargar preview de foto
    if (this.data?.foto_perfil) {
      // Construir URL completa si es una ruta relativa
      if (this.data.foto_perfil.startsWith('/')) {
        this.previewFoto = `${environment.apiUrl.replace('/api', '')}${this.data.foto_perfil}`;
      } else {
        this.previewFoto = this.data.foto_perfil;
      }
    }

    // Si es un líder, traer sus departamentos adicionales actuales (la fila de
    // la lista no los trae, hay que pedirlos aparte)
    if (this.editando && this.data?.usuario?.rol === 'lider') {
      this.empleadoService.obtenerPorId(this.data.id).subscribe({
        next: (response) => {
          const empleado = response.data as Empleado;
          this.departamentosExtraSeleccionados = (empleado.departamentosExtra || []).map((d) => d.id);
        },
        error: () => {},
      });
    }
  }

  crearFormulario(): FormGroup {
    return this.formBuilder.group({
      nombre: [this.data?.nombre || '', [Validators.required, Validators.minLength(3)]],
      apellido: [this.data?.apellido || '', [Validators.required, Validators.minLength(3)]],
      cargo: [this.data?.cargo || '', [Validators.minLength(2)]],
      telefono: [this.data?.telefono || '', [Validators.pattern(/^\d{7,15}$/)]],
      departamento_id: [this.data?.departamento_id || 1, [Validators.required]],
      rol: [this.data?.usuario?.rol === 'lider' ? 'lider' : 'empleado', [Validators.required]],
      fecha_ingreso: [this.data?.fecha_ingreso ? this.data.fecha_ingreso.slice(0, 10) : ''],
      dias_vacaciones_anuales: [this.data?.dias_vacaciones_anuales ?? 15, [Validators.required, Validators.min(0)]],
      email: ['', this.editando ? [] : [Validators.required, Validators.email]],
      password: ['', this.editando ? [] : [Validators.required, Validators.minLength(6)]],
      // Solo aplica al editar, y solo el admin la ve (ver plantilla); vacío = no cambiar
      nuevaPassword: ['', this.editando ? [Validators.minLength(6)] : []],
    });
  }

  get esAdmin(): boolean {
    return this.authService.esAdmin();
  }

  get nombre() {
    return this.form.get('nombre');
  }

  get apellido() {
    return this.form.get('apellido');
  }

  get cargo() {
    return this.form.get('cargo');
  }

  get telefono() {
    return this.form.get('telefono');
  }

  get email() {
    return this.form.get('email');
  }

  get password() {
    return this.form.get('password');
  }

  get nuevaPassword() {
    return this.form.get('nuevaPassword');
  }

  get esLiderEnEdicion(): boolean {
    return this.editando && this.form.get('rol')?.value === 'lider';
  }

  /** Departamentos disponibles para marcar como "adicionales" (todos menos el propio) */
  get departamentosParaExtra() {
    const propio = this.form.get('departamento_id')?.value;
    return this.departamentos.filter((d) => d.id !== propio);
  }

  // Manejar selección de archivo
  onFotoSelected(event: any): void {
    const archivo = event.target.files[0];
    if (archivo) {
      // Validar tipo
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(archivo.type)) {
        this.snackBar.open('Solo se permiten imágenes (JPEG, PNG, GIF)', 'Cerrar', { duration: 3000 });
        return;
      }
      
      // Validar tamaño (5MB)
      if (archivo.size > 5 * 1024 * 1024) {
        this.snackBar.open('La imagen no puede pesar más de 5MB', 'Cerrar', { duration: 3000 });
        return;
      }
      
      this.fotoSeleccionada = archivo;
      
      // Mostrar preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewFoto = e.target.result;
      };
      reader.readAsDataURL(archivo);
    }
  }

  guardar(): void {
    if (this.form.invalid) {
      this.snackBar.open('Por favor, completa el formulario correctamente', 'Cerrar', { duration: 3000 });
      return;
    }

    this.cargando = true;
    const datos = this.form.value;

    // En edición no se envían credenciales de creación; la contraseña nueva
    // solo se manda si el admin efectivamente escribió una (si no, no se toca)
    if (this.editando) {
      delete datos.email;
      delete datos.password;
      if (!datos.nuevaPassword?.trim()) {
        delete datos.nuevaPassword;
      }
    } else {
      delete datos.nuevaPassword;
    }

    const operacion = this.editando
      ? this.empleadoService.actualizar(this.data!.id, datos)
      : this.empleadoService.crear(datos);

    operacion.subscribe({
      next: (response: any) => {
        const empleadoId = (response.data as Empleado).id;
        const credenciales = response.credenciales; // Solo existe si es creación

        // Departamentos adicionales que supervisa (solo aplica editando un líder)
        if (this.editando && datos.rol === 'lider') {
          this.empleadoService.actualizarDepartamentosExtra(empleadoId, this.departamentosExtraSeleccionados).subscribe({
            error: (error) => console.error('Error al actualizar departamentos adicionales:', error),
          });
        }

        // Si hay foto, subirla
        if (this.fotoSeleccionada) {
          this.empleadoService.subirFoto(empleadoId, this.fotoSeleccionada).subscribe({
            next: (fotoResponse: any) => {
              const empleadoActualizado = fotoResponse.data as Empleado;
              // Si el empleado editado es el usuario logueado, refrescar su avatar en el header
              const usuarioLogueado = this.authService.getCurrentUser();
              if (usuarioLogueado && empleadoActualizado?.usuario_id === usuarioLogueado.id && empleadoActualizado.foto_perfil) {
                this.authService.actualizarFotoPerfil(empleadoActualizado.foto_perfil);
              }
              this.finalizarGuardado(credenciales);
            },
            error: (error) => {
              console.error('Error al subir foto:', error);
              this.finalizarGuardado(credenciales, 'pero hubo error al subir la foto');
            }
          });
        } else {
          this.finalizarGuardado(credenciales);
        }
      },
      error: (error) => {
        console.error('Error:', error);
        this.snackBar.open(
          error.error?.mensaje || 'Error al guardar empleado',
          'Cerrar',
          { duration: 3000 }
        );
        this.cargando = false;
      }
    });
  }

  private finalizarGuardado(credenciales?: any, advertencia: string = ''): void {
    this.cargando = false;

    // Si es creación y hay credenciales, mostrar modal
    if (!this.editando && credenciales) {
      this.mostrarCredenciales(credenciales, advertencia);
    } else {
      const mensaje = this.editando ? 'Empleado actualizado' : 'Empleado creado';
      this.snackBar.open(
        mensaje + (advertencia ? ' ' + advertencia : ''),
        'Cerrar',
        { duration: 3000 }
      );
      this.dialogRef.close(true);
    }
  }

  private mostrarCredenciales(credenciales: any, advertencia: string = ''): void {
    // Mostrar credenciales en modal
    const mensaje = `
    ✅ Empleado creado exitosamente
    ${advertencia ? '⚠️ ' + advertencia : ''}

    📧 EMAIL: ${credenciales.email}
    🔐 PASSWORD: ${credenciales.password}

    Copiar las credenciales y compartirlas con el empleado.
    El empleado puede cambiar la contraseña después del primer login.
    `;

    this.snackBar.open(mensaje, 'Copiar', { duration: 0 }).onAction().subscribe(() => {
      const texto = `Email: ${credenciales.email}\nPassword: ${credenciales.password}`;
      navigator.clipboard.writeText(texto).then(() => {
        this.snackBar.open('✅ Credenciales copiadas', 'Cerrar', { duration: 3000 });
      });
    });

    setTimeout(() => {
      this.dialogRef.close(true);
    }, 5000); // Cerrar después de 5 segundos
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
