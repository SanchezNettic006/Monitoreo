import { Router } from 'express';
import { GrupoController } from '@controllers/grupo.controller';
import { authMiddleware, liderOAdminMiddleware, cargarDepartamentoLider } from '@middleware/auth.middleware';

const router = Router();
const controller = new GrupoController();

router.use(authMiddleware, liderOAdminMiddleware, cargarDepartamentoLider);

router.get('/', (req, res, next) => controller.obtenerTodos(req, res, next));
router.post('/', (req, res, next) => controller.crear(req, res, next));
router.patch('/empleados/:empleadoId', (req, res, next) => controller.asignarEmpleado(req, res, next));
router.post('/:grupoId/proyecto', (req, res, next) => controller.asignarProyecto(req, res, next));
router.get('/:grupoId/historial', (req, res, next) => controller.obtenerHistorial(req, res, next));

export default router;
