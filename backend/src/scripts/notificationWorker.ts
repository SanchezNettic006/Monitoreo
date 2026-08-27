import { notificacionService } from '../services/notificacion.service';
import { config } from '../config/env';

/**
 * Tareas programadas (CRON) para enviar notificaciones
 */

export function inicializarTareasNotificaciones() {
  // Validar que Gmail esté configurado
  if (!config.gmail.user || !config.gmail.password) {
    console.warn(
      '⚠️ Gmail no está configurado. Las notificaciones por email no se enviarán.'
    );
    console.warn(
      'Configura GMAIL_USER y GMAIL_PASSWORD en el archivo .env para habilitar notificaciones.'
    );
    return;
  }

  console.log('✅ Tareas de notificación inicializadas');

  // Enviar notificaciones pendientes cada 30 segundos
  setInterval(async () => {
    try {
      await notificacionService.enviarNotificacionesPendientes();
    } catch (error) {
      console.error('Error en tarea de notificaciones:', error);
    }
  }, 30 * 1000); // 30 segundos

  // Reintentar notificaciones fallidas cada 5 minutos
  setInterval(async () => {
    try {
      await notificacionService.reintentatNotificacionesFallidas();
    } catch (error) {
      console.error('Error en tarea de reintento:', error);
    }
  }, 5 * 60 * 1000); // 5 minutos
}
