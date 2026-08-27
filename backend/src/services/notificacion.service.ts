import { AppDataSource } from '../config/database';
import { NotificacionEmail } from '../entities/NotificacionEmail';
import { config } from '../config/env';
import nodemailer from 'nodemailer';

// Crear transportador de Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.gmail.user,
    pass: config.gmail.password,
  },
});

export class NotificacionService {
  private readonly notificacionRepo = AppDataSource.getRepository(
    NotificacionEmail
  );

  /**
   * Crear y guardar una notificación de email en la BD
   */
  async crearNotificacion(data: {
    solicitud_id?: number;
    tipo: 'solicitud_creada' | 'aprobada' | 'rechazada';
    destinatario: string;
    asunto: string;
    cuerpo: string;
  }) {
    try {
      const notificacion = this.notificacionRepo.create({
        solicitud_id: data.solicitud_id,
        tipo: data.tipo,
        destinatario: data.destinatario,
        asunto: data.asunto,
        cuerpo: data.cuerpo,
        estado: 'pendiente',
      });

      const resultado = await this.notificacionRepo.save(notificacion);
      console.log(`📧 Notificación creada: ID ${resultado.id}`);
      return resultado;
    } catch (error) {
      console.error('❌ Error creando notificación:', error);
      throw error;
    }
  }

  /**
   * Enviar todas las notificaciones pendientes
   */
  async enviarNotificacionesPendientes() {
    try {
      console.log('📨 Iniciando envío de notificaciones pendientes...');

      const notificacionesPendientes = await this.notificacionRepo.find({
        where: { estado: 'pendiente' },
        order: { created_at: 'ASC' },
        take: 10, // Procesar máximo 10 por vez
      });

      if (notificacionesPendientes.length === 0) {
        console.log('✅ No hay notificaciones pendientes');
        return;
      }

      console.log(`📧 Procesando ${notificacionesPendientes.length} notificaciones...`);

      for (const notificacion of notificacionesPendientes) {
        await this.enviarEmail(notificacion);
      }

      console.log('✅ Lote de notificaciones procesado');
    } catch (error) {
      console.error('❌ Error en envío de notificaciones:', error);
    }
  }

  /**
   * Enviar un email individual
   */
  private async enviarEmail(notificacion: NotificacionEmail) {
    try {
      // Validar que Gmail esté configurado
      if (!config.gmail.user || !config.gmail.password) {
        throw new Error('Gmail no está configurado en variables de entorno');
      }

      const mailOptions = {
        from: `${config.gmail.fromName} <${config.gmail.user}>`,
        to: notificacion.destinatario,
        subject: notificacion.asunto,
        html: notificacion.cuerpo, // Permitir HTML
      };

      // Enviar email
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email enviado a ${notificacion.destinatario} (ID: ${info.messageId})`);

      // Actualizar estado
      notificacion.estado = 'enviado';
      notificacion.enviado_at = new Date();
      await this.notificacionRepo.save(notificacion);

      return info;
    } catch (error: any) {
      console.error(
        `❌ Error enviando email a ${notificacion.destinatario}:`,
        error.message
      );

      // Guardar error
      notificacion.estado = 'fallido';
      notificacion.error_mensaje = error.message;
      await this.notificacionRepo.save(notificacion);

      throw error;
    }
  }

  /**
   * Reintentar enviar notificaciones que fallaron
   */
  async reintentatNotificacionesFallidas() {
    try {
      console.log('🔄 Reintentando notificaciones fallidas...');

      const notificacionesFallidas = await this.notificacionRepo.find({
        where: { estado: 'fallido' },
        order: { created_at: 'ASC' },
        take: 5, // Reintentar máximo 5
      });

      if (notificacionesFallidas.length === 0) {
        console.log('✅ No hay notificaciones fallidas');
        return;
      }

      for (const notificacion of notificacionesFallidas) {
        notificacion.estado = 'pendiente'; // Volver a pendiente
        await this.notificacionRepo.save(notificacion);
        await this.enviarEmail(notificacion);
      }

      console.log('✅ Reintento de notificaciones completado');
    } catch (error) {
      console.error('❌ Error en reintento de notificaciones:', error);
    }
  }

  /**
   * Obtener historial de notificaciones
   */
  async obtenerHistorial(solicitud_id?: number) {
    try {
      let query = this.notificacionRepo.createQueryBuilder('n');

      if (solicitud_id) {
        query = query.where('n.solicitud_id = :solicitud_id', { solicitud_id });
      }

      return await query.orderBy('n.created_at', 'DESC').getMany();
    } catch (error) {
      console.error('❌ Error obteniendo historial:', error);
      throw error;
    }
  }
}

export const notificacionService = new NotificacionService();
