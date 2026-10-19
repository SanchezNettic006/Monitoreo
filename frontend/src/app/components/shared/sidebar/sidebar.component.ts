import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService, Usuario } from '../../../services/auth.service';
import { HoraExtraService } from '../../../services/hora-extra.service';
import { SolicitudService } from '../../../services/solicitud.service';
import { MiPerfilComponent } from '../../mi-perfil/mi-perfil.component';
import { environment } from '../../../../environments/environment';

interface ItemNav {
  label: string;
  icono: string;
  ruta: string;
  /** undefined = visible para cualquier rol logueado */
  roles?: ('admin' | 'lider')[];
  badge?: 'horasExtra' | 'tramites';
}

interface GrupoNav {
  titulo: string;
  items: ItemNav[];
}

/**
 * Menú lateral fijo de toda la app (salvo /login). Reemplaza la rejilla de
 * "Módulos Disponibles" que antes vivía solo en el Home: ahora la navegación
 * es la misma sin importar en qué pantalla esté el usuario.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule, MatDialogModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent implements OnInit {
  currentUser: Usuario | null = null;
  horasExtraPendientes = 0;
  tramitesPendientes = 0;

  grupos: GrupoNav[] = [
    {
      titulo: 'General',
      items: [
        { label: 'Inicio', icono: 'grid_view', ruta: '/dashboard' },
        { label: 'Panel general', icono: 'insights', ruta: '/panel', roles: ['admin'] },
        { label: 'Reportes', icono: 'description', ruta: '/reportes', roles: ['admin'] },
      ],
    },
    {
      titulo: 'Asistencia',
      items: [
        { label: 'Registro', icono: 'place', ruta: '/asistencia' },
        { label: 'Mis horas', icono: 'schedule', ruta: '/mis-horas' },
        { label: 'Mi equipo', icono: 'groups', ruta: '/mi-equipo', roles: ['lider'] },
        { label: 'Calendario laboral', icono: 'calendar_month', ruta: '/calendario', roles: ['admin'] },
      ],
    },
    {
      titulo: 'Aprobaciones',
      items: [
        { label: 'Horas extra', icono: 'check_box', ruta: '/horas-extras', roles: ['admin'], badge: 'horasExtra' },
        { label: 'Trámites', icono: 'assignment', ruta: '/tramites', badge: 'tramites' },
      ],
    },
    {
      titulo: 'Administración',
      items: [
        { label: 'Empleados', icono: 'person', ruta: '/empleados', roles: ['admin', 'lider'] },
        { label: 'Proyectos', icono: 'folder', ruta: '/proyectos', roles: ['admin', 'lider'] },
      ],
    },
  ];

  constructor(
    private authService: AuthService,
    private horaExtraService: HoraExtraService,
    private solicitudService: SolicitudService,
    private router: Router,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((usuario) => {
      this.currentUser = usuario;
    });

    if (this.esAdmin) {
      this.horaExtraService.obtenerTodasHorasExtras().subscribe({
        next: (response: any) => {
          const tickets = response.data || [];
          this.horasExtraPendientes = tickets.filter(
            (h: any) => h.estado === 'finalizada' && h.estado_aprobacion === 'pendiente',
          ).length;
        },
        error: () => (this.horasExtraPendientes = 0),
      });
    }

    if (this.esAdmin || this.esLider) {
      this.solicitudService.obtenerSolicitudesPendientes().subscribe({
        next: (solicitudes) => (this.tramitesPendientes = solicitudes.length),
        error: () => (this.tramitesPendientes = 0),
      });
    }
  }

  get esAdmin(): boolean {
    return this.authService.esAdmin();
  }

  get esLider(): boolean {
    return this.authService.esLider();
  }

  /** Un ítem es visible si no exige rol, o si el usuario tiene alguno de los permitidos */
  visible(item: ItemNav): boolean {
    if (!item.roles) return true;
    if (item.roles.includes('admin') && this.esAdmin) return true;
    if (item.roles.includes('lider') && this.esLider) return true;
    return false;
  }

  badgeDe(item: ItemNav): number {
    if (item.badge === 'horasExtra') return this.horasExtraPendientes;
    if (item.badge === 'tramites') return this.tramitesPendientes;
    return 0;
  }

  grupoTieneItemsVisibles(grupo: GrupoNav): boolean {
    return grupo.items.some((item) => this.visible(item));
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  abrirMiPerfil(): void {
    this.dialog.open(MiPerfilComponent, { width: '420px' });
  }

  getAvatarUrl(fotoUrl?: string): string {
    if (!fotoUrl) return '';
    if (fotoUrl.startsWith('/')) {
      return `${environment.apiUrl.replace('/api', '')}${fotoUrl}`;
    }
    return fotoUrl;
  }
}
