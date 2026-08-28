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

// Reporte de cierre (descripción + fotos) exigido a departamentos con requiere_reporte_cierre
router.post('/reporte-cierre', uploadFoto.array('fotos', 10), (req, res, next) =>
  controller.guardarReporteCierre(req, res, next),
);

// Proyectos del departamento del propio empleado, para elegir en cuál trabajó al cerrar jornada
router.get('/mis-proyectos', (req, res, next) =>
  controller.obtenerMisProyectos(req, res, next),
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

// ============ RUTAS DE PAUSAS ============

// Iniciar pausa
router.post('/pausa/iniciar', (req, res, next) =>
  controller.iniciarPausa(req, res, next),
);

// Finalizar pausa
router.post('/pausa/finalizar', (req, res, next) =>
  controller.finalizarPausa(req, res, next),
);

// Obtener pausas de un registro
router.get('/:recordId/pausas', (req, res, next) =>
  controller.obtenerPausas(req, res, next),
);

export default router;
