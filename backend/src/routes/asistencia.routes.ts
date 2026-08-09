import { Router } from 'express';
import { AsistenciaController } from '@controllers/asistencia.controller';
import { authMiddleware } from '@middleware/auth.middleware';
import { uploadFoto } from '@utils/upload';

const router = Router();
const controller = new AsistenciaController();

// Todas las rutas de asistencia requieren autenticación
router.use(authMiddleware);

// Registrar entrada (con foto opcional)
router.post('/entrada', uploadFoto.single('foto'), (req, res, next) =>
  controller.registrarEntrada(req, res, next),
);

// Registrar salida (con foto opcional)
router.post('/salida', uploadFoto.single('foto'), (req, res, next) =>
  controller.registrarSalida(req, res, next),
);

// Obtener registro de hoy
router.get('/hoy', (req, res, next) =>
  controller.obtenerRegistroHoy(req, res, next),
);

// Obtener resumen empleado
router.get('/resumen', (req, res, next) =>
  controller.obtenerResumen(req, res, next),
);

// Obtener registros de empleado (con filtros de fecha)
router.get('/registros', (req, res, next) =>
  controller.obtenerRegistrosEmpleado(req, res, next),
);

router.get('/registros/:empleadoId', (req, res, next) =>
  controller.obtenerRegistrosEmpleado(req, res, next),
);

export default router;
