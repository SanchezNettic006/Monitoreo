import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MisSolicitudesComponent } from './mis-solicitudes/mis-solicitudes.component';
import { CrearSolicitudComponent } from './crear-solicitud/crear-solicitud.component';
import { GestionarSolicitudesComponent } from './gestionar-solicitudes/gestionar-solicitudes.component';
import { SolicitudService, SaldoVacaciones } from '../../services/solicitud.service';
import { AuthService } from '../../services/auth.service';

interface Resumen {
  pendientes: number;
  aprobadas: number;
  rechazadas: number;
  vacaciones: number;
  ausencias: number;
}

@Component({
  selector: 'app-tramites-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressBarModule,
    MatBadgeModule,
    MisSolicitudesComponent,
    CrearSolicitudComponent,
    GestionarSolicitudesComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="tramites-container">
      <!-- Header -->
      <div class="header-section">
        <div>
          <h1>Gestión de Trámites</h1>
          <p>Vacaciones, ausencias y cambios de jornada</p>
        </div>
      </div>

      <!-- Mi saldo de vacaciones (visible para cualquier usuario) -->
      <div class="mi-saldo-card" *ngIf="miSaldoVacaciones">
        <div class="mi-saldo-icon">
          <mat-icon>beach_access</mat-icon>
        </div>
        <div class="mi-saldo-texto">
          <span class="mi-saldo-label">Mis vacaciones disponibles ({{ miSaldoVacaciones.anio }})</span>
          <span class="mi-saldo-valor">{{ miSaldoVacaciones.diasDisponibles }} de {{ miSaldoVacaciones.cupoAnual }} días</span>
        </div>
      </div>

      <!-- Estadísticas (solo admin) -->
      <div class="stats-grid" *ngIf="esAdmin">
        <mat-card class="stat-card">
          <div class="stat-content">
            <mat-icon class="stat-icon pending">schedule</mat-icon>
            <div class="stat-text">
              <p class="stat-label">Pendientes</p>
              <p class="stat-value">{{ resumen.pendientes || 0 }}</p>
            </div>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-content">
            <mat-icon class="stat-icon approved">check_circle</mat-icon>
            <div class="stat-text">
              <p class="stat-label">Aprobadas</p>
              <p class="stat-value">{{ resumen.aprobadas || 0 }}</p>
            </div>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-content">
            <mat-icon class="stat-icon rejected">cancel</mat-icon>
            <div class="stat-text">
              <p class="stat-label">Rechazadas</p>
              <p class="stat-value">{{ resumen.rechazadas || 0 }}</p>
            </div>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-content">
            <mat-icon class="stat-icon vacations">beach_access</mat-icon>
            <div class="stat-text">
              <p class="stat-label">Vacaciones</p>
              <p class="stat-value">{{ resumen.vacaciones || 0 }}</p>
            </div>
          </div>
        </mat-card>
      </div>

      <!-- Tabs -->
      <mat-tab-group class="tabs-section">
        <mat-tab label="Mis Solicitudes">
          <app-mis-solicitudes></app-mis-solicitudes>
        </mat-tab>

        <mat-tab label="Crear Solicitud">
          <app-crear-solicitud></app-crear-solicitud>
        </mat-tab>

        <mat-tab *ngIf="esAdmin">
          <ng-template mat-tab-label>
            <span class="tab-label-with-badge">
              Gestionar Solicitudes
              <span *ngIf="resumen.pendientes > 0" class="tab-badge">
                {{ resumen.pendientes }}
              </span>
            </span>
          </ng-template>
          <app-gestionar-solicitudes></app-gestionar-solicitudes>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [
    `
      .tramites-container {
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .header-section {
        margin-bottom: 32px;
        display: flex;
        justify-content: space-between;
        align-items: center;

        h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
          color: #2b8a3e;
        }

        p {
          margin: 4px 0 0 0;
          color: #666;
          font-size: 14px;
        }
      }

      .mi-saldo-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
        border-radius: 8px;
        background: linear-gradient(135deg, #2b8a3e 0%, #1a5a2a 100%);
        color: white;
        box-shadow: 0 2px 8px rgba(43, 138, 62, 0.25);
        margin-bottom: 24px;
      }

      .mi-saldo-icon {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
        }
      }

      .mi-saldo-texto {
        display: flex;
        flex-direction: column;

        .mi-saldo-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.85;
        }

        .mi-saldo-valor {
          font-size: 22px;
          font-weight: 700;
          margin-top: 2px;
        }
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
        margin-bottom: 32px;
      }

      .stat-card {
        padding: 20px;
        border-radius: 8px;
        background: white;
        border-left: 4px solid #94c120;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;

        &:hover {
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }
      }

      .stat-content {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .stat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;

        &.pending {
          background: linear-gradient(135deg, #f0a400 0%, #e08900 100%);
        }

        &.approved {
          background: linear-gradient(135deg, #2b8a3e 0%, #1a5a2a 100%);
        }

        &.rejected {
          background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%);
        }

        &.vacations {
          background: linear-gradient(135deg, #94c120 0%, #7aa01a 100%);
        }
      }

      .stat-text {
        p {
          margin: 0;
          line-height: 1.4;
        }

        .stat-label {
          font-size: 12px;
          color: #999;
          text-transform: uppercase;
          font-weight: 600;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #2b8a3e;
        }
      }

      .tabs-section {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      ::ng-deep .mat-mdc-tab-labels {
        border-bottom: 1px solid #e0e0e0;
      }

      ::ng-deep .mat-mdc-tab-label-content {
        padding: 0 16px;
      }

      ::ng-deep .mat-mdc-tab-body-wrapper {
        padding: 24px;
      }

      ::ng-deep .mdc-tab__indicator {
        background-color: #2b8a3e !important;
      }

      ::ng-deep .mdc-tab--active .mdc-tab__text-label {
        color: #2b8a3e;
        font-weight: 600;
      }

      .tab-label-with-badge {
        display: flex;
        align-items: center;
        gap: 8px;

        .tab-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
          padding: 0 6px;
          background-color: #f0a400;
          color: white;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          animation: pulse 2s infinite;
        }
      }

      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.1);
        }
      }

      @media (max-width: 600px) {
        .tramites-container {
          padding: 12px;
        }

        .header-section {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;

          h1 {
            font-size: 22px;
          }
        }

        .mi-saldo-card {
          padding: 14px;
        }

        ::ng-deep .mat-mdc-tab-body-wrapper {
          padding: 12px;
        }

        ::ng-deep .mat-mdc-tab-label-content {
          padding: 0 8px;
          font-size: 13px;
        }
      }
    `,
  ],
})
export class TramitesDashboardComponent implements OnInit, OnDestroy {
  resumen: Resumen = {
    pendientes: 0,
    aprobadas: 0,
    rechazadas: 0,
    vacaciones: 0,
    ausencias: 0,
  };
  miSaldoVacaciones: SaldoVacaciones | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private solicitudService: SolicitudService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  get esAdmin(): boolean {
    return this.authService.esAdmin();
  }

  ngOnInit() {
    console.log('🔄 [TramitesDashboard] ngOnInit iniciado');
    if (this.esAdmin) {
      this.cargarResumen();
    }
    this.cargarMiSaldoVacaciones();

    // Suscribirse a cambios en solicitudes (solo admin necesita refrescar el resumen global)
    this.solicitudService.getSolicitudCreadaNotification()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.esAdmin) {
          console.log('📡 Solicitud creada - Recargando resumen');
          this.cargarResumen();
        }
      });

    this.solicitudService.getSolicitudActualizadaNotification()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.esAdmin) {
          console.log('📡 Solicitud actualizada - Recargando resumen');
          this.cargarResumen();
        }
        // Un cambio de estado (ej. aprobación) puede afectar el saldo propio
        this.cargarMiSaldoVacaciones();
      });
  }

  cargarMiSaldoVacaciones() {
    this.solicitudService.obtenerMiSaldoVacaciones().subscribe({
      next: (saldo) => {
        this.miSaldoVacaciones = saldo;
        this.cdr.markForCheck();
      },
      error: () => {
        this.miSaldoVacaciones = null;
      },
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarResumen() {
    console.log('🚀 [TramitesDashboard] Llamando a obtenerResumen()...');
    this.solicitudService.obtenerResumen().subscribe({
      next: (data) => {
        console.log('✅ Resumen cargado:', data);
        this.resumen = data;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('❌ Error al cargar resumen:', error);
        console.error('Error details:', error.status, error.statusText, error.message);
      },
    });
  }
}
