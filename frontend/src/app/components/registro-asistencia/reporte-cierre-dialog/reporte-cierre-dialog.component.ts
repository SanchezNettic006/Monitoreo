import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AsistenciaService } from '../../../services/asistencia.service';

const FOTOS_MINIMAS = 3;

@Component({
  selector: 'app-reporte-cierre-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  templateUrl: './reporte-cierre-dialog.component.html',
  styleUrl: './reporte-cierre-dialog.component.scss',
})
export class ReporteCierreDialogComponent implements OnInit {
  descripcion = '';
  fotos: File[] = [];
  previews: string[] = [];
  enviando = false;
  fotosMinimas = FOTOS_MINIMAS;
  proyectos: string[] = [];
  proyectoSeleccionado = '';
  cargandoProyectos = true;

  constructor(
    public dialogRef: MatDialogRef<ReporteCierreDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { recordId: number },
    private asistenciaService: AsistenciaService,
    private snackBar: MatSnackBar,
  ) {
    dialogRef.disableClose = true;
  }

  ngOnInit(): void {
    this.asistenciaService.obtenerMisProyectos().subscribe({
      next: (respuesta) => {
        this.proyectos = respuesta.data || [];
        this.cargandoProyectos = false;
      },
      error: () => {
        this.cargandoProyectos = false;
      },
    });
  }

  get puedeEnviar(): boolean {
    return (
      this.descripcion.trim().length > 0 &&
      this.fotos.length >= FOTOS_MINIMAS &&
      (this.proyectos.length === 0 || !!this.proyectoSeleccionado) &&
      !this.enviando
    );
  }

  capturarFoto(): void {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play();
          setTimeout(() => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx?.drawImage(video, 0, 0);

            canvas.toBlob((blob) => {
              if (blob) {
                const fotoFile = new File([blob], `reporte_cierre_${Date.now()}.jpg`, { type: 'image/jpeg' });
                this.fotos.push(fotoFile);

                const reader = new FileReader();
                reader.onload = (e: any) => this.previews.push(e.target.result);
                reader.readAsDataURL(blob);

                this.snackBar.open('✅ Foto capturada', 'Cerrar', { duration: 1500 });
              }
              stream.getTracks().forEach((track) => track.stop());
            });
          }, 1000);
        };
      })
      .catch((error) => {
        this.snackBar.open(`Error de cámara: ${error.message}`, 'Cerrar', { duration: 3000 });
      });
  }

  seleccionarFotos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivos = Array.from(input.files || []);

    for (const archivo of archivos) {
      this.fotos.push(archivo);
      const reader = new FileReader();
      reader.onload = (e: any) => this.previews.push(e.target.result);
      reader.readAsDataURL(archivo);
    }

    input.value = '';
  }

  quitarFoto(index: number): void {
    this.fotos.splice(index, 1);
    this.previews.splice(index, 1);
  }

  enviar(): void {
    if (!this.puedeEnviar) return;

    this.enviando = true;
    this.asistenciaService
      .enviarReporteCierre(this.data.recordId, this.descripcion.trim(), this.fotos, this.proyectoSeleccionado)
      .subscribe({
      next: () => {
        this.snackBar.open('✅ Reporte de cierre enviado', 'Cerrar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (error) => {
        const mensaje = error.error?.mensaje || 'Error al enviar el reporte de cierre';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 3000 });
        this.enviando = false;
      },
    });
  }
}
