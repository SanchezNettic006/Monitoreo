import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs/operators';
import { EstadoConexionBannerComponent } from './components/shared/estado-conexion-banner/estado-conexion-banner.component';

const RUTAS_SIN_BOTON_DASHBOARD = ['/login', '/dashboard', '/'];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MatButtonModule, MatIconModule, EstadoConexionBannerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'NETTIC';
  mostrarBotonDashboard = false;

  constructor(private router: Router) {
    this.router.events.pipe(filter((evento) => evento instanceof NavigationEnd)).subscribe((evento) => {
      const url = (evento as NavigationEnd).urlAfterRedirects.split('?')[0];
      this.mostrarBotonDashboard = !RUTAS_SIN_BOTON_DASHBOARD.includes(url);
    });
  }

  irADashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
