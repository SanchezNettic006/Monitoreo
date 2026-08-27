import { Router } from 'express';
import { CalendarioController } from '@controllers/calendario.controller';
import { authMiddleware, adminMiddleware } from '@middleware/auth.middleware';

const router = Router();
const controller = new CalendarioController();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Lectura: disponible para cualquier usuario autenticado (empleados también ven festivos)
router.get('/proximos-eventos', (req, res, next) => controller.obtenerProximosEventos(req, res, next));
router.get('/', (req, res, next) => controller.listarPorAnio(req, res, next));

// Escritura: solo administradores gestionan el calendario
router.post('/', adminMiddleware, (req, res, next) => controller.crear(req, res, next));
router.delete('/:id', adminMiddleware, (req, res, next) => controller.eliminar(req, res, next));

export default router;
