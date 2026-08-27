import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HoraExtraService } from '../../services/hora-extra.service';
import { AsistenciaService } from '../../services/asistencia.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-crear-hora-extra-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  templateUrl: './crear-hora-extra-modal.component.html',
  styleUrls: ['./crear-hora-extra-modal.component.scss']
})
export class CrearHoraExtraModalComponent implements OnInit {
  form!: FormGroup;
  cargando = false;
  capturandoGPS = false;
  fotoCapturada: string | null = null;
  videoStream: MediaStream | null = null;
  videoinput: any = null;
  recordAsistenciaId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private horaExtraService: HoraExtraService,
    private asistenciaService: AsistenciaService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<CrearHoraExtraModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    // Obtener GPS y abrir cámara automáticamente
    // No dependemos de recordAsistenciaId - el backend lo creará si es necesario
    this.obtenerGPS();
    setTimeout(() => {
      this.capturarFoto();
    }, 500);
  }

  /**
   * Inicializar formulario
   */
  private initForm(): void {
    this.form = this.fb.group({
      numero_ticket: ['', [Validators.required, Validators.minLength(3)]],
      latitud: ['', Validators.required],
      longitud: ['', Validators.required]
    });
  }

  /**
   * Obtener coordenadas GPS
   */
  private obtenerGPS(): void {
    this.capturandoGPS = true;

    if (!navigator.geolocation) {
      this.snackBar.open('GPS no disponible en este dispositivo', 'Error', { duration: 5000 });
      this.capturandoGPS = false;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.form.patchValue({
          latitud: latitude.toFixed(7),
          longitud: longitude.toFixed(7)
        });
        this.capturandoGPS = false;
        this.snackBar.open('GPS capturado correctamente', 'OK', { duration: 3000 });
      },
      (error) => {
        this.capturandoGPS = false;
        this.snackBar.open('Error al obtener GPS. Intenta de nuevo', 'OK', { duration: 5000 });
        console.error('Error GPS:', error);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  /**
   * Abrir cámara para capturar foto
   */
  async capturarFoto(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      this.videoStream = stream;
      this.videoinput = document.getElementById('video-input') as HTMLVideoElement;

      if (this.videoinput) {
        this.videoinput.srcObject = stream;
        this.videoinput.style.display = 'block';
        this.videoinput.play().catch((e: Error) => console.error('Error playing video:', e));
      }
    } catch (error) {
      this.snackBar.open('No se pudo acceder a la cámara', 'Error', { duration: 5000 });
      console.error('Error al acceder a cámara:', error);
    }
  }

  /**
   * Tomar captura de la cámara
   */
  tomarCaptura(): void {
    const canvas = document.createElement('canvas');
    const video = document.getElementById('video-input') as HTMLVideoElement;

    if (video && video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0);
        this.fotoCapturada = canvas.toDataURL('image/jpeg', 0.8);

        // Cerrar cámara
        if (this.videoStream) {
          this.videoStream.getTracks().forEach(track => track.stop());
          this.videoStream = null;
        }

        if (this.videoinput) {
          this.videoinput.style.display = 'none';
        }

        this.snackBar.open('Foto capturada', 'OK', { duration: 3000 });
      }
    }
  }

  /**
   * Cancelar captura de cámara
   */
  cancelarCaptura(): void {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }

    if (this.videoinput) {
      this.videoinput.style.display = 'none';
    }
  }

  /**
   * Cerrar modal
   */
  cancelar(): void {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
    }
    this.dialogRef.close();
  }
  guardar(): void {
    if (!this.form.valid) {
      this.snackBar.open('Por favor completa todos los campos', 'Error', { duration: 5000 });
      return;
    }

    if (!this.fotoCapturada) {
      this.snackBar.open('Debes capturar una foto inicial', 'Error', { duration: 5000 });
      return;
    }

    this.cargando = true;

    const usuario = this.authService.getCurrentUser();
    if (!usuario) {
      this.snackBar.open('No se pudo identificar al usuario', 'Error', { duration: 5000 });
      this.cargando = false;
      return;
    }

    // Convertir data URL a blob
    const arr = this.fotoCapturada.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const str = atob(arr[1]);
    const n = str.length;
    const u8arr = new Uint8Array(n);

    for (let i = 0; i < n; i++) {
      u8arr[i] = str.charCodeAt(i);
    }

    const blob = new Blob([u8arr], { type: mime });
    const fotoFile = new File([blob], 'hora-extra-inicio.jpg', { type: 'image/jpeg' });

    // Enviar ticket, GPS y foto - el backend obtiene usuarioId del token JWT
    this.horaExtraService.iniciarHoraExtraDirecta(
      this.form.value.numero_ticket,
      parseFloat(this.form.value.latitud),
      parseFloat(this.form.value.longitud),
      fotoFile
    ).subscribe({
      next: (response) => {
        this.cargando = false;
        this.snackBar.open('Hora extra creada correctamente', 'OK', { duration: 3000 });
        this.dialogRef.close(response.data);
      },
      error: (error) => {
        this.cargando = false;
        const message = error.error?.message || 'Error al crear hora extra';
        this.snackBar.open(message, 'Error', { duration: 5000 });
        console.error('Error:', error);
      }
    });
  }
}
