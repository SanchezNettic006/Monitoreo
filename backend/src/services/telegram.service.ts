import { AppDataSource } from '@config/database';
import { Usuario } from '@entities/Usuario';
import { config } from '@config/env';
import crypto from 'crypto';

/**
 * Integración con Telegram para alertas activas (jornada sin cerrar, recordatorio
 * de check-in). Usa long polling (getUpdates) en vez de webhook: no requiere que
 * el backend tenga una URL pública/HTTPS, así que funciona igual en desarrollo
 * local que ya desplegado. Nunca se pide ni se guarda el número de teléfono del
 * usuario: Telegram solo entrega un `chat_id` cuando la persona le escribe al bot.
 */
class TelegramService {
  private usuarioRepository = AppDataSource.getRepository(Usuario);
  private ultimoUpdateId = 0;

  private get apiBase(): string {
    return `https://api.telegram.org/bot${config.telegram.botToken}`;
  }

  get habilitado(): boolean {
    return !!config.telegram.botToken;
  }

  /** Genera el link de vinculación (t.me/<bot>?start=<codigo>) para un usuario. */
  async generarVinculo(usuarioId: number): Promise<string> {
    const codigo = crypto.randomBytes(6).toString('hex');
    await this.usuarioRepository.update({ id: usuarioId }, { telegram_link_code: codigo });
    return `https://t.me/${config.telegram.botUsername}?start=${codigo}`;
  }

  async obtenerEstado(usuarioId: number): Promise<{ vinculado: boolean }> {
    const usuario = await this.usuarioRepository.findOne({ where: { id: usuarioId } });
    return { vinculado: !!usuario?.telegram_chat_id };
  }

  async desvincular(usuarioId: number): Promise<void> {
    await this.usuarioRepository.update({ id: usuarioId }, { telegram_chat_id: undefined, telegram_link_code: undefined });
  }

  /** Envía un mensaje de texto a un chat_id ya vinculado. */
  async enviarMensaje(chatId: string, texto: string): Promise<void> {
    if (!this.habilitado) return;
    try {
      const respuesta = await fetch(`${this.apiBase}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: texto }),
      });
      if (!respuesta.ok) {
        console.error('Error al enviar mensaje de Telegram:', await respuesta.text());
      }
    } catch (error) {
      console.error('Error de red al enviar mensaje de Telegram:', error);
    }
  }

  /**
   * Revisa mensajes nuevos recibidos por el bot (long polling) y vincula la
   * cuenta cuyo código coincida con el "/start <codigo>" que mande el usuario.
   */
  async procesarActualizaciones(): Promise<void> {
    if (!this.habilitado) return;

    const respuesta = await fetch(
      `${this.apiBase}/getUpdates?offset=${this.ultimoUpdateId + 1}&timeout=0`,
    );
    if (!respuesta.ok) {
      console.error('Error al consultar actualizaciones de Telegram:', await respuesta.text());
      return;
    }

    const data: any = await respuesta.json();
    const actualizaciones: any[] = data.result || [];

    for (const actualizacion of actualizaciones) {
      this.ultimoUpdateId = Math.max(this.ultimoUpdateId, actualizacion.update_id);

      const mensaje = actualizacion.message;
      const texto: string | undefined = mensaje?.text;
      const chatId: string | undefined = mensaje?.chat?.id?.toString();

      if (!texto || !chatId) continue;

      const match = texto.match(/^\/start\s+(\S+)/);
      if (!match) continue;

      const codigo = match[1];
      const usuario = await this.usuarioRepository.findOne({ where: { telegram_link_code: codigo } });

      if (usuario) {
        await this.usuarioRepository.update(
          { id: usuario.id },
          { telegram_chat_id: chatId, telegram_link_code: undefined },
        );
        await this.enviarMensaje(
          chatId,
          '✅ Tu cuenta de NETTIC quedó vinculada. Aquí recibirás tus alertas (jornada sin cerrar, recordatorios de check-in, etc).',
        );
      } else {
        await this.enviarMensaje(chatId, '❌ Código inválido o vencido. Genera un nuevo link desde tu perfil en NETTIC.');
      }
    }
  }
}

export const telegramService = new TelegramService();
