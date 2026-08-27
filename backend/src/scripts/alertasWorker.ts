import { telegramService } from '@services/telegram.service';
import { alertasService } from '@services/alertas.service';
import { config } from '@config/env';

/**
 * Tareas programadas (CRON) para las alertas por Telegram:
 * jornada sin cerrar y recordatorio de check-in.
 */
export function inicializarAlertasTelegram() {
  if (!config.telegram.botToken) {
    console.warn(
      '⚠️ Telegram no está configurado (TELEGRAM_BOT_TOKEN). Las alertas por Telegram no se enviarán.',
    );
    return;
  }

  console.log('✅ Tareas de alertas por Telegram inicializadas');

  // Revisar mensajes nuevos del bot (vinculación de cuentas) cada 5 segundos
  setInterval(() => {
    telegramService.procesarActualizaciones().catch((error) => {
      console.error('Error al procesar actualizaciones de Telegram:', error);
    });
  }, 5 * 1000);

  // Revisar jornadas sin cerrar y recordatorio de no-inicio cada 15 minutos
  setInterval(() => {
    alertasService.revisarJornadasLargas().catch((error) => {
      console.error('Error al revisar jornadas largas:', error);
    });
    alertasService.revisarRecordatorioNoInicio().catch((error) => {
      console.error('Error al revisar recordatorio de no-inicio:', error);
    });
  }, 15 * 60 * 1000);
}
