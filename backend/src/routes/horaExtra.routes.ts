import { Router, Request, Response, NextFunction } from 'express';
import { HoraExtraController } from '@controllers/horaExtra.controller';
import {
  authMiddleware,
  adminMiddleware,
  liderOAdminMiddleware,
  cargarDepartamentoLider,
} from '@middleware/auth.middleware';
import { uploadFoto } from '@utils/upload';

const router = Router();
const controller = new HoraExtraController();

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

/**
 * POST /asistencia/hora-extra/iniciar
 * Iniciar una hora extra (con foto)
 */
router.post('/iniciar', uploadFoto.single('foto'), (req: Request, res: Response, next: NextFunction) =>
  controller.iniciar(req, res, next)
);

/**
 * POST /asistencia/hora-extra/finalizar
 * Finalizar una hora extra (con foto)
 */
router.post('/finalizar', uploadFoto.single('foto'), (req: Request, res: Response, next: NextFunction) =>
  controller.finalizar(req, res, next)
);

/**
 * GET /asistencia/hora-extra/activas/:recordAsistenciaId
 * Obtener horas extras activas de un registro
 */
router.get('/activas/:recordAsistenciaId', (req: Request, res: Response, next: NextFunction) =>
  controller.obtenerActivas(req, res, next)
);

/**
 * GET /asistencia/hora-extra/mi-activa
 * Obtener la hora extra activa del usuario autenticado
 */
router.get('/mi-activa', (req: Request, res: Response, next: NextFunction) =>
  controller.obtenerMiActiva(req, res, next)
);

/**
 * GET /asistencia/hora-extra/mis-horas-extra
 * Obtener las horas extras del usuario logueado
 */
router.get('/mis-horas-extra', (req: Request, res: Response, next: NextFunction) =>
  controller.obtenerMisHorasExtras(req, res, next)
);

/**
 * GET /asistencia/hora-extra/todas
 * Obtener todas las horas extras (admin: todas; líder: solo su departamento)
 */
router.get(
  '/todas',
  liderOAdminMiddleware,
  cargarDepartamentoLider,
  (req: Request, res: Response, next: NextFunction) => controller.obtenerTodas(req, res, next),
);

/**
 * PATCH /asistencia/hora-extra/:id/revisar
 * Aprobar (total/parcial) o rechazar las horas de un ticket finalizado (admin)
 */
router.patch('/:id/revisar', adminMiddleware, (req: Request, res: Response, next: NextFunction) =>
  controller.revisar(req, res, next),
);

/**
 * GET /asistencia/hora-extra/historial/:recordAsistenciaId
 * Obtener historial de horas extras de un registro
 */
router.get('/historial/:recordAsistenciaId', (req: Request, res: Response, next: NextFunction) =>
  controller.obtenerHistorial(req, res, next)
);

export default router;
