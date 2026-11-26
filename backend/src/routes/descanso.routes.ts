import { Router } from 'express';
import { descansoController } from '@controllers/descanso.controller';
import { authMiddleware, liderOAdminMiddleware, cargarDepartamentoLider } from '@middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Empleados con descanso marcado hoy (cualquier usuario autenticado: lo usan los resúmenes de asistencia del día)
router.get('/hoy', (req, res, next) => descansoController.hoy(req, res, next));

// Resto: solo líder (de su propio equipo) o admin
router.use(liderOAdminMiddleware, cargarDepartamentoLider);

router.get('/empleados', (req, res, next) => descansoController.listarEmpleados(req, res, next));
router.get('/', (req, res, next) => descansoController.listar(req, res, next));
router.post('/', (req, res, next) => descansoController.crear(req, res, next));
router.delete('/:id', (req, res, next) => descansoController.eliminar(req, res, next));

export default router;
