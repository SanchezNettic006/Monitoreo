import { Router, Response, NextFunction } from 'express';
import { ReportesController } from '@controllers/reportes.controller';
import {
  authMiddleware,
  adminMiddleware,
  liderOAdminMiddleware,
  cargarDepartamentoLider,
  AuthRequest,
} from '@middleware/auth.middleware';

const router = Router();
const controller = new ReportesController();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

/**
 * GET /reportes/mis-asistencias
 * Historial de asistencias del usuario logueado (cualquier rol)
 */
router.get('/mis-asistencias', (req: AuthRequest, res: Response, next: NextFunction) =>
  controller.obtenerMisAsistencias(req, res, next)
);

/**
 * GET /reportes/asistencias
 * Obtener asistencias con filtros (admin: todas; líder: solo su departamento)
 */
router.get(
  '/asistencias',
  liderOAdminMiddleware,
  cargarDepartamentoLider,
  (req: AuthRequest, res: Response, next: NextFunction) => controller.obtenerAsistencias(req, res, next),
);

/**
 * GET /reportes/horas-aprobadas?mes=YYYY-MM&departamentoId=
 * Total de horas extra aprobadas del mes por departamento y técnico (admin: todos; líder: su equipo)
 */
router.get(
  '/horas-aprobadas',
  liderOAdminMiddleware,
  cargarDepartamentoLider,
  (req: AuthRequest, res: Response, next: NextFunction) => controller.obtenerHorasAprobadas(req, res, next),
);

// A partir de aquí, solo administradores (reportes generales de todos los empleados)
router.use(adminMiddleware);

/**
 * GET /reportes/resumen
 * Obtener estadísticas generales
 */
router.get('/resumen', (req: AuthRequest, res: Response, next: NextFunction) =>
  controller.obtenerResumen(req, res, next)
);

/**
 * GET /reportes/empleado/:id
 * Obtener historial de un empleado
 */
router.get('/empleado/:id', (req: AuthRequest, res: Response, next: NextFunction) =>
  controller.obtenerHistorialEmpleado(req, res, next)
);

/**
 * GET /reportes/departamentos
 * Obtener resumen por departamento
 */
router.get('/departamentos', (req: AuthRequest, res: Response, next: NextFunction) =>
  controller.obtenerPorDepartamento(req, res, next)
);

/**
 * GET /reportes/cumplimiento?mes=YYYY-MM&departamentoId=
 * % de días laborables del mes con reporte (check-out) enviado, por departamento y empleado
 */
router.get('/cumplimiento', (req: AuthRequest, res: Response, next: NextFunction) =>
  controller.obtenerCumplimiento(req, res, next)
);

/**
 * GET /reportes/cumplimiento/:empleadoId?mes=YYYY-MM
 * Detalle día por día del cumplimiento de un empleado en un mes
 */
router.get('/cumplimiento/:empleadoId', (req: AuthRequest, res: Response, next: NextFunction) =>
  controller.obtenerDetalleCumplimientoEmpleado(req, res, next)
);

/**
 * POST /reportes/recalcular-horas
 * Recalcular horas trabajadas (ADMIN ONLY)
 */
router.post('/recalcular-horas', (req: AuthRequest, res: Response, next: NextFunction) =>
  controller.recalcularHoras(req, res, next)
);

export default router;
