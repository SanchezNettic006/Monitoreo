import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { NotificacionEmail } from '../entities/NotificacionEmail';
import { notificacionService } from '../services/notificacion.service';

const notificacionRepo = AppDataSource.getRepository(NotificacionEmail);

export class NotificacionController {
  /**
   * Obtener historial de notificaciones de una solicitud
   * GET /api/notificaciones/solicitud/:solicitud_id
   */
  static async obtenerHistorial(req: Request, res: Response) {
    try {
      const { solicitud_id } = req.params;
      const solicitudIdNum = typeof solicitud_id === 'string' ? parseInt(solicitud_id) : parseInt(solicitud_id[0]);

      const notificaciones = await notificacionRepo.find({
        where: { solicitud_id: solicitudIdNum },
        order: { created_at: 'DESC' },
      });

      res.json({
        success: true,
        data: notificaciones,
        total: notificaciones.length,
      });
    } catch (error: any) {
      console.error('❌ Error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Obtener todas las notificaciones pendientes (admin)
   * GET /api/notificaciones/pendientes
   */
  static async obtenerPendientes(req: Request, res: Response) {
    try {
      const notificaciones = await notificacionRepo.find({
        where: { estado: 'pendiente' },
        order: { created_at: 'ASC' },
        take: 50,
      });

      res.json({
        success: true,
        data: notificaciones,
        total: notificaciones.length,
      });
    } catch (error: any) {
      console.error('❌ Error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Obtener estadísticas de notificaciones
   * GET /api/notificaciones/estadisticas
   */
  static async obtenerEstadisticas(req: Request, res: Response) {
    try {
      const total = await notificacionRepo.count();
      const pendientes = await notificacionRepo.count({
        where: { estado: 'pendiente' },
      });
      const enviadas = await notificacionRepo.count({
        where: { estado: 'enviado' },
      });
      const fallidas = await notificacionRepo.count({
        where: { estado: 'fallido' },
      });

      res.json({
        success: true,
        data: {
          total,
          pendientes,
          enviadas,
          fallidas,
        },
      });
    } catch (error: any) {
      console.error('❌ Error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Forzar envío inmediato de notificaciones pendientes (admin)
   * POST /api/notificaciones/enviar-ahora
   */
  static async enviarAhora(req: Request, res: Response) {
    try {
      console.log('📨 Forzando envío inmediato de notificaciones...');
      await notificacionService.enviarNotificacionesPendientes();

      res.json({
        success: true,
        message: 'Notificaciones procesadas',
      });
    } catch (error: any) {
      console.error('❌ Error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Forzar reintento de notificaciones fallidas (admin)
   * POST /api/notificaciones/reintentar-fallidas
   */
  static async reintentatFallidas(req: Request, res: Response) {
    try {
      console.log('🔄 Reintentando notificaciones fallidas...');
      await notificacionService.reintentatNotificacionesFallidas();

      res.json({
        success: true,
        message: 'Reintento iniciado',
      });
    } catch (error: any) {
      console.error('❌ Error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}
