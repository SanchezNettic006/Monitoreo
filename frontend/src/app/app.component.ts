import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { EstadoConexionBannerComponent } from './components/shared/estado-conexion-banner/estado-conexion-banner.component';
import { SidebarComponent } from './components/shared/sidebar/sidebar.component';

// El menú lateral vive en toda la app salvo en el login (ahí no hay nada que navegar todavía)
const RUTAS_SIN_SIDEBAR = ['/login', '/'];

//decorador @Component que define el componente principal de la aplicación
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, EstadoConexionBannerComponent, SidebarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'NETTIC';
  mostrarSidebar = false;

  constructor(private router: Router) {
    this.router.events.pipe(filter((evento) => evento instanceof NavigationEnd)).subscribe((evento) => {
      const url = (evento as NavigationEnd).urlAfterRedirects.split('?')[0];
      this.mostrarSidebar = !RUTAS_SIN_SIDEBAR.includes(url);
    });
  }
}
