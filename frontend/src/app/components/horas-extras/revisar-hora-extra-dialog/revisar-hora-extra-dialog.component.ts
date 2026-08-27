import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HoraExtraResponse } from '../../../services/hora-extra.service';

@Component({
  selector: 'app-revisar-hora-extra-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './revisar-hora-extra-dialog.component.html',
  styleUrl: './revisar-hora-extra-dialog.component.scss',
})
export class RevisarHoraExtraDialogComponent {
  formulario: FormGroup;
  duracionReportada: number;

  constructor(
    public dialogRef: MatDialogRef<RevisarHoraExtraDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { horaExtra: HoraExtraResponse },
    private fb: FormBuilder,
  ) {
    // Redondear a 2 decimales para que coincida exactamente con horasAprobadasDecimal
    // (que también se redondea) al aprobar el total reportado — evita que un desfase
    // de coma flotante (ej. 5min = 0.08333...) marque el total como "recorte"
    this.duracionReportada = Math.round((data.horaExtra.duracion || 0) * 100) / 100;
    const { horas, minutos } = this.aHorasYMinutos(this.duracionReportada);

    this.formulario = this.fb.group({
      horas: [horas, [Validators.required, Validators.min(0)]],
      minutos: [minutos, [Validators.required, Validators.min(0), Validators.max(59)]],
      motivo: [data.horaExtra.motivo_ajuste || ''],
    });

    this.formulario.valueChanges.subscribe(() => this.actualizarValidacionMotivo());
    this.actualizarValidacionMotivo();
  }

  /** Convierte horas decimales a un par {horas, minutos} legible */
  private aHorasYMinutos(decimal: number): { horas: number; minutos: number } {
    const horas = Math.floor(decimal);
    const minutos = Math.round((decimal - horas) * 60);
    return minutos === 60 ? { horas: horas + 1, minutos: 0 } : { horas, minutos };
  }

  /** Horas aprobadas actuales, en decimal (para validar/enviar al backend) */
  get horasAprobadasDecimal(): number {
    const horas = Number(this.formulario.get('horas')?.value) || 0;
    const minutos = Number(this.formulario.get('minutos')?.value) || 0;
    return Math.round((horas + minutos / 60) * 100) / 100;
  }

  /** Texto legible ('1h 30m' / '45m') de una duración en horas decimales */
  formatearDuracion(decimal: number): string {
    const { horas, minutos } = this.aHorasYMinutos(decimal);
    if (horas === 0) return `${minutos}m`;
    if (minutos === 0) return `${horas}h`;
    return `${horas}h ${minutos}m`;
  }

  get excedeReportado(): boolean {
    return this.horasAprobadasDecimal > this.duracionReportada + 0.001;
  }

  get esRechazoTotal(): boolean {
    return this.horasAprobadasDecimal === 0;
  }

  get esRecorte(): boolean {
    const horas = this.horasAprobadasDecimal;
    return horas > 0 && horas < this.duracionReportada - 0.001;
  }

  /** El motivo es obligatorio si se aprueban menos horas de las reportadas */
  private actualizarValidacionMotivo(): void {
    const motivoControl = this.formulario.get('motivo');
    if (this.esRecorte || this.esRechazoTotal) {
      motivoControl?.setValidators([Validators.required]);
    } else {
      motivoControl?.clearValidators();
    }
    motivoControl?.updateValueAndValidity({ emitEvent: false });
  }

  /** "Aprobar todo" aprueba y cierra el diálogo de inmediato, sin requerir un segundo clic */
  aprobarCompleto(): void {
    const { horas, minutos } = this.aHorasYMinutos(this.duracionReportada);
    this.formulario.patchValue({ horas, minutos });
    this.dialogRef.close({
      horasAprobadas: this.duracionReportada,
      motivo: this.formulario.value.motivo?.trim() || undefined,
    });
  }

  rechazarTotal(): void {
    this.formulario.patchValue({ horas: 0, minutos: 0 });
  }

  onConfirm(): void {
    if (this.formulario.invalid || this.excedeReportado) return;

    if (this.esRecorte) {
      const confirmado = confirm(
        `Vas a aprobar ${this.formatearDuracion(this.horasAprobadasDecimal)} de ${this.formatearDuracion(this.duracionReportada)} reportados. ¿Es correcto o querías aprobar el total?`,
      );
      if (!confirmado) return;
    }

    this.dialogRef.close({
      horasAprobadas: this.horasAprobadasDecimal,
      motivo: this.formulario.value.motivo?.trim() || undefined,
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
