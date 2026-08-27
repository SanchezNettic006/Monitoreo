import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SolicitudService, SaldoVacaciones } from '../../../services/solicitud.service';

@Component({
  selector: 'app-crear-solicitud',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="crear-solicitud-container">
      <div class="form-wrapper">
        <div class="form-header">
          <mat-icon class="header-icon">post_add</mat-icon>
          <div class="header-text">
            <h2>Crear Nueva Solicitud</h2>
            <p>Solicita vacaciones, ausencia o cambio de jornada</p>
          </div>
        </div>

        <form [formGroup]="formulario" (ngSubmit)="onSubmit()" class="solicitud-form">
          <div class="form-section">
            <h3 class="section-title">Informacion de la Solicitud</h3>
            
            <div class="form-grid-2">
              <mat-form-field appearance="fill" class="full-width">
                <mat-label>Tipo de Solicitud *</mat-label>
                <mat-select formControlName="tipo" required (selectionChange)="onTipoChange($event.value)">
                  <mat-option value="vacaciones">Vacaciones</mat-option>
                  <mat-option value="ausencia">Ausencia</mat-option>
                  <mat-option value="cambio_jornada">Cambio de Jornada</mat-option>
                </mat-select>
                <mat-error>Selecciona un tipo de solicitud</mat-error>
                <mat-hint *ngIf="formulario.get('tipo')?.value === 'vacaciones' && saldoVacaciones">
                  Te quedan {{ saldoVacaciones.diasDisponibles }} de {{ saldoVacaciones.cupoAnual }} días este {{ saldoVacaciones.anio }}
                </mat-hint>
              </mat-form-field>

              <mat-form-field appearance="fill" class="full-width">
                <mat-label>Dias Solicitados *</mat-label>
                <input matInput type="number" step="0.5" min="0.5" formControlName="dias_solicitados" placeholder="0.0" />
                <mat-hint align="end">Incluye medios dias (0.5)</mat-hint>
              </mat-form-field>
            </div>

            <div class="form-grid-2">
              <mat-form-field appearance="fill" class="full-width">
                <mat-label>Fecha de Inicio *</mat-label>
                <input matInput [matDatepicker]="picker1" formControlName="fecha_inicio" required />
                <mat-datepicker-toggle matSuffix [for]="picker1"></mat-datepicker-toggle>
                <mat-datepicker #picker1></mat-datepicker>
                <mat-error>Selecciona una fecha de inicio</mat-error>
              </mat-form-field>

              <mat-form-field appearance="fill" class="full-width">
                <mat-label>Fecha de Fin (opcional)</mat-label>
                <input matInput [matDatepicker]="picker2" formControlName="fecha_fin" placeholder="Hasta..." />
                <mat-datepicker-toggle matSuffix [for]="picker2"></mat-datepicker-toggle>
                <mat-datepicker #picker2></mat-datepicker>
              </mat-form-field>
            </div>
          </div>

          <div class="form-section">
            <h3 class="section-title">Detalles</h3>
            
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Motivo *</mat-label>
              <input matInput formControlName="motivo" placeholder="Ej: Descanso, viaje, asuntos personales" />
              <mat-hint align="end">{{ formulario.get('motivo')?.value?.length || 0 }}/100</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Descripcion Adicional</mat-label>
              <textarea matInput rows="4" formControlName="descripcion" placeholder="Proporciona mas detalles si es necesario..."></textarea>
              <mat-hint align="end">{{ formulario.get('descripcion')?.value?.length || 0 }}/500</mat-hint>
            </mat-form-field>
          </div>

          <div class="info-box">
            <mat-icon>info</mat-icon>
            <div>
              <strong>Informacion importante:</strong>
              <ul>
                <li>Las solicitudes deben ser aprobadas por el administrador</li>
                <li>Recibiras una notificacion cuando sea procesada</li>
                <li>Completa todos los campos requeridos (*)</li>
              </ul>
            </div>
          </div>

          <div class="button-group">
            <button mat-raised-button color="accent" type="submit" [disabled]="!formulario.valid || loading" class="btn-submit">
              <mat-icon *ngIf="!loading">send</mat-icon>
              <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
              {{ loading ? 'Enviando...' : 'Crear Solicitud' }}
            </button>
            <button mat-stroked-button type="button" (click)="onCancel()" class="btn-cancel">
              <mat-icon>close</mat-icon> Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .crear-solicitud-container {
      padding: 20px;
      background: #f5f9f7;
      min-height: 100vh;
    }
    .form-wrapper {
      max-width: 700px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }
    .form-header {
      background: linear-gradient(135deg, #2b8a3e 0%, #1a5a2a 100%);
      color: white;
      padding: 32px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .header-icon {
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    .header-text h2 {
      margin: 0;
      font-size: 22px;
      font-weight: 600;
    }
    .header-text p {
      margin: 4px 0 0;
      font-size: 13px;
      opacity: 0.9;
    }
    .solicitud-form {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .form-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .section-title {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      color: #2b8a3e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .full-width {
      width: 100%;
    }
    .info-box {
      background: #f0fbe8;
      border-radius: 6px;
      padding: 12px 16px;
      display: flex;
      gap: 12px;
    }
    .info-box mat-icon {
      color: #2b8a3e;
      flex-shrink: 0;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .info-box strong {
      display: block;
      color: #2b8a3e;
      margin-bottom: 6px;
      font-size: 13px;
    }
    .info-box ul {
      margin: 0;
      padding-left: 18px;
      font-size: 12px;
      color: #555;
      line-height: 1.5;
    }
    .info-box li {
      margin-bottom: 3px;
    }
    .button-group {
      display: flex;
      gap: 12px;
      margin-top: 16px;
      justify-content: flex-end;
    }
    .btn-submit {
      background: linear-gradient(135deg, #2b8a3e 0%, #1a5a2a 100%);
      color: white;
      min-width: 140px;
      font-weight: 600;
      font-size: 14px;
    }
    .btn-cancel {
      border-color: #ddd;
      color: #666;
      min-width: 100px;
      font-size: 14px;
    }
    mat-spinner {
      display: inline-block;
    }
    ::ng-deep {
      .mat-mdc-form-field-fill .mat-mdc-text-field-wrapper {
        background-color: #f9f9f9;
      }
      .mat-mdc-form-field-fill.mat-focused .mat-mdc-text-field-wrapper {
        background-color: white;
      }
    }
    @media (max-width: 600px) {
      .form-grid-2 {
        grid-template-columns: 1fr;
      }
      .button-group {
        flex-direction: column;
      }
      .button-group button {
        width: 100%;
      }
    }
  `],
})
export class CrearSolicitudComponent {
  formulario: FormGroup;
  loading = false;
  saldoVacaciones: SaldoVacaciones | null = null;

  constructor(
    private fb: FormBuilder,
    private solicitudService: SolicitudService,
    private snackBar: MatSnackBar,
  ) {
    this.formulario = this.fb.group({
      tipo: ['', Validators.required],
      fecha_inicio: ['', Validators.required],
      fecha_fin: [''],
      dias_solicitados: [0],
      motivo: [''],
      descripcion: [''],
    });
  }

  onTipoChange(tipo: string): void {
    if (tipo === 'vacaciones' && !this.saldoVacaciones) {
      this.solicitudService.obtenerMiSaldoVacaciones().subscribe({
        next: (saldo) => (this.saldoVacaciones = saldo),
        error: () => {},
      });
    }
  }

  onSubmit() {
    if (!this.formulario.valid) {
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
      });
      return;
    }

    this.loading = true;
    console.log('📝 [CrearSolicitud] Enviando solicitud...', this.formulario.value);

    this.solicitudService.crearSolicitud(this.formulario.value).subscribe({
      next: (data) => {
        console.log('✅ [CrearSolicitud] Solicitud creada. Datos devueltos:', data);
        
        this.snackBar.open('Solicitud creada exitosamente', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom',
          panelClass: ['success-snackbar'],
        });

        this.formulario.reset();
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ [CrearSolicitud] Error:', error);
        this.snackBar.open(
          error.error?.mensaje || 'Error al crear la solicitud',
          'Cerrar',
          {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'bottom',
          },
        );
        this.loading = false;
      },
    });
  }

  onCancel() {
    if (this.formulario.dirty) {
      if (confirm('Estás seguro? Se perderán los cambios')) {
        this.formulario.reset();
      }
    } else {
      this.formulario.reset();
    }
  }
}
