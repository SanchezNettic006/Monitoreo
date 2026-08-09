import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { EmpleadoService, Empleado } from '../../services/empleado.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-formulario-empleado',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
    { id: 2, nombre: 'Campo' },
    { id: 3, nombre: 'Administración' }
  ];
  
  // Foto
  fotoSeleccionada: File | null = null;
  previewFoto: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private empleadoService: EmpleadoService,
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
  }

  crearFormulario(): FormGroup {
    return this.formBuilder.group({
      nombre: [this.data?.nombre || '', [Validators.required, Validators.minLength(3)]],
      apellido: [this.data?.apellido || '', [Validators.required, Validators.minLength(3)]],
      cargo: [this.data?.cargo || '', [Validators.minLength(2)]],
      telefono: [this.data?.telefono || '', [Validators.pattern(/^\d{7,15}$/)]],
      departamento_id: [this.data?.departamento_id || 1, [Validators.required]]
    });
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

    const operacion = this.editando
      ? this.empleadoService.actualizar(this.data!.id, datos)
      : this.empleadoService.crear(datos);

    operacion.subscribe({
      next: (response: any) => {
        const empleadoId = (response.data as Empleado).id;
        const credenciales = response.credenciales; // Solo existe si es creación
        
        // Si hay foto, subirla
        if (this.fotoSeleccionada) {
          this.empleadoService.subirFoto(empleadoId, this.fotoSeleccionada).subscribe({
            next: () => {
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
