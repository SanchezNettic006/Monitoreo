import { Router } from 'express';
import { NotificacionController } from '../controllers/notificacion.controller';

const router = Router();

/**
 * Rutas para notificaciones de email
 */

// Obtener historial de notificaciones de una solicitud
router.get('/solicitud/:solicitud_id', NotificacionController.obtenerHistorial);

// Obtener notificaciones pendientes (admin)
router.get('/pendientes', NotificacionController.obtenerPendientes);

// Obtener estadísticas
router.get('/estadisticas', NotificacionController.obtenerEstadisticas);

// Forzar envío inmediato (admin)
router.post('/enviar-ahora', NotificacionController.enviarAhora);

// Forzar reintento (admin)
router.post('/reintentar-fallidas', NotificacionController.reintentatFallidas);

export default router;
