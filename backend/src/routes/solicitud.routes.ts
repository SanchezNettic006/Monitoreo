import { Router } from 'express';
import { SolicitudController } from '@controllers/solicitud.controller';
import {
  authMiddleware,
  adminMiddleware,
  liderOAdminMiddleware,
  cargarDepartamentoLider,
} from '@middleware/auth.middleware';

const router = Router();
const controller = new SolicitudController();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Crear solicitud
router.post('/crear', (req, res, next) => controller.crear(req, res, next));

// Obtener mis solicitudes
router.get('/mis-solicitudes', (req, res, next) =>
  controller.misSolicitudes(req, res, next),
);

// Obtener solicitudes pendientes (admin: todas; líder: solo su departamento)
router.get('/pendientes', liderOAdminMiddleware, cargarDepartamentoLider, (req, res, next) =>
  controller.obtenerPendientes(req, res, next),
);

// Solicitudes aprobadas, filtrables por mes (?mes=YYYY-MM) (admin: todas; líder: solo su departamento)
router.get('/aprobadas', liderOAdminMiddleware, cargarDepartamentoLider, (req, res, next) =>
  controller.obtenerAprobadas(req, res, next),
);

// Resumen de solicitudes (admin)
router.get('/resumen', adminMiddleware, (req, res, next) => controller.resumen(req, res, next));

// Mi saldo de vacaciones (cualquier usuario autenticado, ve el suyo)
router.get('/mi-saldo-vacaciones', (req, res, next) => controller.obtenerMiSaldoVacaciones(req, res, next));

// Saldo de vacaciones de todos los empleados de un vistazo (admin: todos; líder: solo su departamento)
router.get('/saldos-vacaciones', liderOAdminMiddleware, cargarDepartamentoLider, (req, res, next) =>
  controller.obtenerSaldosVacacionesMasivo(req, res, next),
);

// Saldo de vacaciones de un empleado (admin: cualquiera; líder: solo de su departamento) - debe ir después de /saldos-vacaciones
router.get('/saldo-vacaciones/:empleadoId', liderOAdminMiddleware, cargarDepartamentoLider, (req, res, next) =>
  controller.obtenerSaldoVacaciones(req, res, next),
);

// Cambiar estado de solicitud (admin: cualquiera; líder: solo su departamento) - debe ir al final porque usa :id
router.patch('/:id/estado', liderOAdminMiddleware, cargarDepartamentoLider, (req, res, next) =>
  controller.cambiarEstado(req, res, next),
);

export default router;
