import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ListadoEmpleadosComponent } from './components/listado-empleados/listado-empleados.component';
import { RegistroAsistenciaComponent } from './components/registro-asistencia/registro-asistencia.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'empleados', component: ListadoEmpleadosComponent, canActivate: [authGuard] },
  { path: 'asistencia', component: RegistroAsistenciaComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '/login' }
];
