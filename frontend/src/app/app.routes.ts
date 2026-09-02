import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ListadoEmpleadosComponent } from './components/listado-empleados/listado-empleados.component';
import { RegistroAsistenciaComponent } from './components/registro-asistencia/registro-asistencia.component';
import { ReportesComponent } from './components/reportes/reportes.component';
import { TramitesDashboardComponent } from './components/tramites/tramites-dashboard.component';
import { CalendarioLaboralComponent } from './components/calendario-laboral/calendario-laboral.component';
import { MisHorasComponent } from './components/mis-horas/mis-horas.component';
import { MiEquipoComponent } from './components/mi-equipo/mi-equipo.component';
import { HorasExtrasComponent } from './components/horas-extras/horas-extras.component';
import { ProyectosComponent } from './components/proyectos/proyectos.component';
import { PanelGeneralComponent } from './components/panel-general/panel-general.component';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { adminOLiderGuard } from './guards/admin-o-lider.guard';
import { liderGuard } from './guards/lider.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'empleados', component: ListadoEmpleadosComponent, canActivate: [authGuard, adminOLiderGuard] },
  { path: 'asistencia', component: RegistroAsistenciaComponent, canActivate: [authGuard] },
  { path: 'mis-horas', component: MisHorasComponent, canActivate: [authGuard] },
  { path: 'mi-equipo', component: MiEquipoComponent, canActivate: [authGuard, liderGuard] },
  { path: 'proyectos', component: ProyectosComponent, canActivate: [authGuard, adminOLiderGuard] },
  { path: 'horas-extras', component: HorasExtrasComponent, canActivate: [authGuard, adminOLiderGuard] },
  { path: 'reportes', component: ReportesComponent, canActivate: [authGuard, adminGuard] },
  { path: 'panel', component: PanelGeneralComponent, canActivate: [authGuard, adminGuard] },
  { path: 'tramites', component: TramitesDashboardComponent, canActivate: [authGuard] },
  { path: 'calendario', component: CalendarioLaboralComponent, canActivate: [authGuard, adminGuard] },
  { path: '**', redirectTo: '/login' }
];
